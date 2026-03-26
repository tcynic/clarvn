/**
 * Epic 2 — Enrichment Mutations
 *
 * Mutations for writing product enrichment data:
 *   - upsertProductClaim: insert/upgrade claim for a product
 *   - patchProductEnrichment: set category, subcategory, imageUrl
 *   - patchIngredientEnrichment: set ingredientFunction, detailExplanation
 *
 * Each has an internal variant (called from actions) and a public admin-guarded
 * variant (called from CLI scripts via ConvexHttpClient).
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

// ---------------------------------------------------------------------------
// upsertProductClaim
// ---------------------------------------------------------------------------

/**
 * Insert a claim for a product, or upgrade verified=false → true if a more
 * authoritative source (OFF) confirms the same claim.
 */
export const upsertProductClaim = internalMutation({
  args: {
    productId: v.id("products"),
    claim: v.string(),
    verified: v.boolean(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("product_claims")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("claim"), args.claim))
      .first();

    if (existing) {
      // Upgrade verified=false → true if new source is more authoritative
      if (args.verified && !existing.verified) {
        await ctx.db.patch(existing._id, {
          verified: true,
          source: args.source,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("product_claims", {
      productId: args.productId,
      claim: args.claim,
      verified: args.verified,
      source: args.source,
    });
  },
});

/** Public admin-guarded version for CLI script access. */
export const upsertProductClaimPublic = mutation({
  args: {
    productId: v.id("products"),
    claim: v.string(),
    verified: v.boolean(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("product_claims")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("claim"), args.claim))
      .first();

    if (existing) {
      if (args.verified && !existing.verified) {
        await ctx.db.patch(existing._id, {
          verified: true,
          source: args.source,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("product_claims", {
      productId: args.productId,
      claim: args.claim,
      verified: args.verified,
      source: args.source,
    });
  },
});

// ---------------------------------------------------------------------------
// patchProductEnrichment
// ---------------------------------------------------------------------------

/**
 * Patch category, subcategory, and imageUrl onto a product.
 * Only sets fields that are currently undefined — will not overwrite manual edits.
 */
export const patchProductEnrichment = internalMutation({
  args: {
    productId: v.id("products"),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error(`Product not found: ${args.productId}`);

    const patch: Record<string, string> = {};
    if (args.category && !product.category) patch.category = args.category;
    if (args.subcategory && !product.subcategory) patch.subcategory = args.subcategory;
    if (args.imageUrl && !product.imageUrl) patch.imageUrl = args.imageUrl;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.productId, patch);
    }
  },
});

/** Public admin-guarded version for CLI script access. */
export const patchProductEnrichmentPublic = mutation({
  args: {
    productId: v.id("products"),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error(`Product not found: ${args.productId}`);

    const patch: Record<string, string> = {};
    if (args.category && !product.category) patch.category = args.category;
    if (args.subcategory && !product.subcategory) patch.subcategory = args.subcategory;
    if (args.imageUrl && !product.imageUrl) patch.imageUrl = args.imageUrl;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.productId, patch);
    }
  },
});

// ---------------------------------------------------------------------------
// patchIngredientEnrichment
// ---------------------------------------------------------------------------

/** Patch ingredientFunction and/or detailExplanation onto an ingredient. */
export const patchIngredientEnrichment = internalMutation({
  args: {
    ingredientId: v.id("ingredients"),
    ingredientFunction: v.optional(v.string()),
    detailExplanation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, string> = {};
    if (args.ingredientFunction) patch.ingredientFunction = args.ingredientFunction;
    if (args.detailExplanation) patch.detailExplanation = args.detailExplanation;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.ingredientId, patch);
    }
  },
});

/** Public admin-guarded version for CLI script access. */
export const patchIngredientEnrichmentPublic = mutation({
  args: {
    ingredientId: v.id("ingredients"),
    ingredientFunction: v.optional(v.string()),
    detailExplanation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const patch: Record<string, string> = {};
    if (args.ingredientFunction) patch.ingredientFunction = args.ingredientFunction;
    if (args.detailExplanation) patch.detailExplanation = args.detailExplanation;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.ingredientId, patch);
    }
  },
});
