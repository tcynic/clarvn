"use node";
/**
 * Epic 2 — Ingredient Extraction Pipeline
 *
 * extractIngredients: Convex action that fetches ingredient lists.
 *   Step 1: Try Open Food Facts API (free, no key).
 *   Step 2: If OFF misses, fall back to AI extraction via Claude.
 *
 * processExtraction: Convex action that orchestrates extraction + result processing.
 */

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Normalize an ingredient name: lowercase, trim, strip parentheticals.
 */
function normalizeIngredientName(raw: string): string {
  return raw
    .replace(/\s*\(.*?\)\s*/g, " ") // strip parentheticals
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Search Open Food Facts by product name/brand and extract ingredient names.
 */
async function fetchFromOpenFoodFacts(
  productName: string,
  brand: string
): Promise<string[] | null> {
  const query = encodeURIComponent(`${productName} ${brand}`.trim());
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,brands,ingredients_text`;

  const resp = await fetch(url, {
    headers: { "User-Agent": "ClarvnBot/1.0 (contact@clarvn.com)" },
  });

  if (!resp.ok) return null;

  const data = await resp.json();
  const products = data?.products;
  if (!Array.isArray(products) || products.length === 0) return null;

  // Find the best match — prefer one with ingredients_text
  const match = products.find(
    (p: any) => p.ingredients_text && p.ingredients_text.trim().length > 0
  );
  if (!match?.ingredients_text) return null;

  // Parse the comma-separated ingredient list
  const rawList: string[] = match.ingredients_text
    .split(/[,;]/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  return rawList.map(normalizeIngredientName).filter((s) => s.length > 0);
}

/**
 * AI fallback: ask Claude to list ingredients for a product.
 */
async function fetchFromAI(
  productName: string,
  brand: string
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    temperature: 0,
    system:
      "You are a food product ingredient database. Return ONLY a JSON array of ingredient names. No explanation, no markdown fences.",
    messages: [
      {
        role: "user",
        content: `List all ingredients in "${productName}" by "${brand}". Return a JSON array of ingredient names as strings.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  // Parse the JSON array
  let text = content.text.trim();
  // Strip markdown fences if present
  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("AI did not return an array");

  return parsed
    .map((s: unknown) => (typeof s === "string" ? normalizeIngredientName(s) : ""))
    .filter((s) => s.length > 0);
}

type ExtractionResult = {
  ingredientNames: string[];
  source: "open_food_facts" | "ai_extraction";
};

/**
 * Core extraction logic — shared by the public action and internal action.
 */
async function extractIngredientsCore(
  productName: string,
  brand: string
): Promise<ExtractionResult> {
  // Try Open Food Facts first
  const offResult = await fetchFromOpenFoodFacts(productName, brand);
  if (offResult && offResult.length > 0) {
    return { ingredientNames: offResult, source: "open_food_facts" };
  }

  // Fallback to AI extraction
  const aiResult = await fetchFromAI(productName, brand);
  return { ingredientNames: aiResult, source: "ai_extraction" };
}

/**
 * Public action: extract ingredients for a product.
 * Returns { ingredientNames, source }.
 */
export const extractIngredients = action({
  args: {
    productName: v.string(),
    brand: v.string(),
  },
  handler: async (_ctx, args): Promise<ExtractionResult> => {
    return extractIngredientsCore(args.productName, args.brand);
  },
});

/**
 * Internal action: run extraction + result processing for a product.
 * Orchestrates: extraction → processExtractionResult mutation.
 */
export const processExtraction = internalAction({
  args: {
    productId: v.id("products"),
    productName: v.string(),
    brand: v.string(),
  },
  handler: async (ctx, args): Promise<ExtractionResult> => {
    // Step 1: Extract ingredients
    const result = await extractIngredientsCore(
      args.productName,
      args.brand
    );

    // Step 2: Process the result via mutation
    const extractionResult: { pendingCount: number; totalIngredients: number } =
      await ctx.runMutation(internal.extractionMutations.processExtractionResult, {
        productId: args.productId,
        ingredientNames: result.ingredientNames,
        source: result.source,
      });

    // Step 3: If new ingredients were queued, auto-trigger scoring
    if (extractionResult.pendingCount > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.ingredientScoring.processIngredientQueueBatch,
        {}
      );
    }

    return result;
  },
});

/**
 * Public action: consumer requests a new product.
 * Creates a pending product record and triggers the v3 extraction pipeline.
 * If the product already exists, returns the existing product ID.
 */
export const requestProduct = action({
  args: {
    productName: v.string(),
    brand: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ productId: string; alreadyExists: boolean }> => {
    const brand = args.brand || "Unknown";

    // Check if product already exists
    const existing = await ctx.runQuery(internal.products.getProductByName, {
      name: args.productName,
    });
    if (existing) {
      return { productId: existing._id, alreadyExists: true };
    }

    // Create a pending product record
    const productId = await ctx.runMutation(internal.products.writeProduct, {
      name: args.productName,
      brand,
      scoreVersion: 0,
      scoredAt: Date.now(),
      assemblyStatus: "pending_ingredients",
      pendingIngredientCount: 0,
    });

    // Run extraction pipeline (Open Food Facts → AI fallback → process result)
    await ctx.scheduler.runAfter(0, internal.extraction.processExtraction, {
      productId,
      productName: args.productName,
      brand,
    });

    return { productId, alreadyExists: false };
  },
});
