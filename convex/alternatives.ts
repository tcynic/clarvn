"use node";

import { v } from "convex/values";
import { action, internalAction, ActionCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "./lib/auth";

const MODEL = "claude-sonnet-4-6";

const ALTERNATIVES_SYSTEM_PROMPT =
  "You are clarvn's alternatives engine. Given a food or consumer product and its concern tier, suggest 4 real, widely available alternatives with cleaner ingredient profiles. Return ONLY a JSON array — no markdown fences, no explanation.";

function buildAlternativesUserMessage(
  name: string,
  brand: string,
  tier: string
): string {
  return `Product: "${name}" by ${brand} (tier: ${tier})
Suggest 4 cleaner alternatives. Each must be a real, widely available product. Return: [{"name":"...","brand":"...","reason":"..."}]`;
}

// --- Core: generate alternatives for one product via LLM ---
async function generateAlternativesCore(
  ctx: ActionCtx,
  productId: Id<"products">
): Promise<void> {
  const product = await ctx.runQuery(api.products.getProductById, {
    id: productId,
  });

  if (!product || !product.tier || product.tier === "Clean") return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const anthropic = new Anthropic({ apiKey });

  let alternatives: Array<{ name: string; brand: string; reason?: string }> =
    [];

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0,
      system: ALTERNATIVES_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildAlternativesUserMessage(
            product.name,
            product.brand,
            product.tier
          ),
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    // Strip markdown fences if present
    let raw = content.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Response is not an array");

    alternatives = parsed
      .filter(
        (a): a is { name: string; brand: string; reason?: string } =>
          typeof a === "object" &&
          typeof a.name === "string" &&
          typeof a.brand === "string"
      )
      .slice(0, 4);
  } catch (_err) {
    await ctx.runMutation(internal.alternativesMutations.markAlternativesFailed, {
      productId,
    });
    return;
  }

  if (alternatives.length === 0) {
    await ctx.runMutation(internal.alternativesMutations.markAlternativesFailed, {
      productId,
    });
    return;
  }

  // Store alternatives
  await ctx.runMutation(internal.alternativesMutations.upsertAlternatives, {
    productId,
    alternatives,
  });

  // Queue each alternative for scoring if not already in products DB
  for (const alt of alternatives) {
    const existing = await ctx.runQuery(api.products.getProduct, {
      name: alt.name,
    });
    if (!existing) {
      await ctx.runMutation(api.scoringQueue.addToQueue, {
        productName: alt.name,
        source: "alternative",
        priority: 2,
        sourceProductId: productId,
      });
    }
  }
}

// --- Internal action: generate alternatives for one product ---
export const generateAlternativesForProduct = internalAction({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await generateAlternativesCore(ctx, args.productId);
  },
});

// --- Public action: generate alternatives for a single product (admin-only) ---
export const generateForProduct = action({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await generateAlternativesCore(ctx, args.productId);
  },
});

// --- Internal action: one page of the backfill ---
export const backfillBatch = internalAction({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const page = await ctx.runQuery(internal.products.listScoredPage, {
      cursor: args.cursor,
    });

    for (const productId of page.productIds) {
      const product = await ctx.runQuery(api.products.getProductById, {
        id: productId,
      });
      if (!product || !product.tier || product.tier === "Clean") continue;

      const entry = await ctx.runQuery(
        internal.alternativesMutations.getAlternativesEntry,
        { productId }
      );
      if (entry?.status === "done") continue;

      await ctx.runAction(internal.alternatives.generateAlternativesForProduct, {
        productId,
      });

      // Small pause to stay under API rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (page.nextCursor) {
      await ctx.scheduler.runAfter(
        1000,
        internal.alternatives.backfillBatch,
        { cursor: page.nextCursor }
      );
    }
  },
});

// --- Public action: backfill alternatives for all above-clean products (admin-only) ---
export const backfillAlternatives = action({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await ctx.scheduler.runAfter(0, internal.alternatives.backfillBatch, {
      cursor: null,
    });
    return { started: true };
  },
});
