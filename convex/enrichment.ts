"use node";
/**
 * Epic 2 — Product Enrichment Actions
 *
 * enrichProductFromOFF: Fetches category, image, and certification claims
 *   from Open Food Facts and writes them to the products and product_claims tables.
 *
 * extractClaims: AI fallback that infers product claims via Claude for products
 *   with 0 claims after OFF enrichment. Claims stored as verified=false.
 *
 * backfillIngredientFunction: Classifies an ingredient's function and writes
 *   a 2-sentence explanation. Used by the backfill CLI script.
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { mapOFFCategory, mapOFFLabels } from "./lib/offMappings";
import {
  INGREDIENT_FUNCTION_SYSTEM_PROMPT,
  buildIngredientFunctionMessage,
} from "./lib/ingredientFunctionPrompt";

// ---------------------------------------------------------------------------
// Open Food Facts helpers
// ---------------------------------------------------------------------------

type OFFEnrichmentResult = {
  categories_tags: string[];
  labels_tags: string[];
  image_url?: string;
};

/**
 * Fetch enrichment metadata from Open Food Facts for a product.
 * Returns null if no match is found.
 */
async function fetchProductDetailsFromOFF(
  productName: string,
  brand: string
): Promise<OFFEnrichmentResult | null> {
  const query = encodeURIComponent(`${productName} ${brand}`.trim());
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,brands,categories_tags,labels_tags,image_url`;

  const resp = await fetch(url, {
    headers: { "User-Agent": "ClarvnBot/1.0 (contact@clarvn.com)" },
  });

  if (!resp.ok) return null;

  const data = await resp.json();
  const products = data?.products;
  if (!Array.isArray(products) || products.length === 0) return null;

  // Find the best match — prefer one with at least categories or labels
  const match =
    products.find(
      (p: any) =>
        (Array.isArray(p.categories_tags) && p.categories_tags.length > 0) ||
        (Array.isArray(p.labels_tags) && p.labels_tags.length > 0)
    ) ?? products[0];

  if (!match) return null;

  return {
    categories_tags: Array.isArray(match.categories_tags)
      ? (match.categories_tags as string[])
      : [],
    labels_tags: Array.isArray(match.labels_tags)
      ? (match.labels_tags as string[])
      : [],
    image_url:
      typeof match.image_url === "string" && match.image_url.trim().length > 0
        ? match.image_url.trim()
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// enrichProductFromOFF
// ---------------------------------------------------------------------------

/**
 * Enrich a product with category, image, and certification claims from OFF.
 * Safe to run multiple times (idempotent via mutations).
 */
export const enrichProductFromOFF = action({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.runQuery(api.products.getProductById, {
      id: args.productId,
    });
    if (!product) throw new Error(`Product not found: ${args.productId}`);

    const offData = await fetchProductDetailsFromOFF(product.name, product.brand);

    if (!offData) {
      return { enriched: false };
    }

    const categoryMapping = mapOFFCategory(offData.categories_tags);
    const claims = mapOFFLabels(offData.labels_tags);

    // Patch product fields
    await ctx.runMutation(internal.enrichmentMutations.patchProductEnrichment, {
      productId: args.productId,
      category: categoryMapping?.category,
      subcategory: categoryMapping?.subcategory,
      imageUrl: offData.image_url,
    });

    // Insert each claim
    for (const claim of claims) {
      await ctx.runMutation(internal.enrichmentMutations.upsertProductClaim, {
        productId: args.productId,
        claim,
        verified: true,
        source: "open_food_facts",
      });
    }

    return {
      enriched: true,
      category: categoryMapping?.category,
      claims,
      imageUrl: offData.image_url,
    };
  },
});

// ---------------------------------------------------------------------------
// extractClaims
// ---------------------------------------------------------------------------

const VALID_CLAIM_KEYS = [
  "usda_organic",
  "eu_organic",
  "non_gmo",
  "gluten_free",
  "vegan",
  "vegetarian",
  "kosher",
  "halal",
  "fair_trade",
  "rainforest_alliance",
  "no_artificial_flavors",
  "no_preservatives",
  "no_artificial_colors",
  "no_added_sugar",
  "sugar_free",
  "lactose_free",
  "dairy_free",
  "soy_free",
  "nut_free",
  "peanut_free",
  "whole_grain",
  "no_palm_oil",
] as const;

/**
 * AI fallback: infer product certifications/claims via Claude.
 * Should only be called for products with 0 claims after OFF enrichment.
 * Stores results with verified=false, source="ai_extraction".
 */
export const extractClaims = action({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const product = await ctx.runQuery(api.products.getProductById, {
      id: args.productId,
    });
    if (!product) throw new Error(`Product not found: ${args.productId}`);

    // Fetch the product's ingredient names for context
    const rawIngredients = await ctx.runQuery(
      api.ingredients.getIngredientsByProduct,
      { productId: args.productId }
    );
    const ingredientList = rawIngredients
      .filter((i): i is NonNullable<typeof i> => i !== null)
      .map((i) => i.canonicalName)
      .join(", ");

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      temperature: 0,
      system: `You are a food product certification expert. Given a product's name, brand, and ingredient list, identify which certifications and health claims the product LIKELY has based on its ingredients. Be conservative — only include claims that the ingredient list strongly supports.

Return ONLY valid JSON: { "claims": ["claim_key", ...] }

Valid claim keys: ${VALID_CLAIM_KEYS.join(", ")}`,
      messages: [
        {
          role: "user",
          content: `Product: "${product.name}" by "${product.brand}"
Ingredients: ${ingredientList || "unknown"}

Which claims does this product likely have?`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    let text = content.text.trim();
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let claims: string[] = [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.claims)) {
        const validSet = new Set<string>(VALID_CLAIM_KEYS);
        claims = (parsed.claims as unknown[]).filter(
          (c): c is string => typeof c === "string" && validSet.has(c)
        );
      }
    } catch {
      return { claims: [] };
    }

    for (const claim of claims) {
      await ctx.runMutation(internal.enrichmentMutations.upsertProductClaim, {
        productId: args.productId,
        claim,
        verified: false,
        source: "ai_extraction",
      });
    }

    return { claims };
  },
});

// ---------------------------------------------------------------------------
// backfillIngredientFunction
// ---------------------------------------------------------------------------

/**
 * Classify a single ingredient's function and write a 2-sentence explanation.
 * Called by the backfill CLI script — skips if already populated.
 */
export const backfillIngredientFunction = action({
  args: { ingredientId: v.id("ingredients") },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const ingredient = await ctx.runQuery(
      api.ingredients.getIngredientById,
      { ingredientId: args.ingredientId }
    );
    if (!ingredient) throw new Error(`Ingredient not found: ${args.ingredientId}`);

    // Skip if already populated
    if (ingredient.ingredientFunction) {
      return { skipped: true };
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      temperature: 0,
      system: INGREDIENT_FUNCTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildIngredientFunctionMessage(ingredient.canonicalName),
        },
      ],
    });

    if (response.stop_reason === "max_tokens") {
      throw new Error("Response truncated");
    }

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    let text = content.text.trim();
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(text);

    if (
      typeof parsed.ingredientFunction !== "string" ||
      typeof parsed.detailExplanation !== "string"
    ) {
      throw new Error("Missing required fields in response");
    }

    await ctx.runMutation(internal.enrichmentMutations.patchIngredientEnrichment, {
      ingredientId: args.ingredientId,
      ingredientFunction: parsed.ingredientFunction.trim(),
      detailExplanation: parsed.detailExplanation.trim(),
    });

    return {
      skipped: false,
      ingredientFunction: parsed.ingredientFunction.trim(),
    };
  },
});
