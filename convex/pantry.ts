import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * Add a product to the current user's pantry.
 * Idempotent — calling twice for the same product is a no-op.
 */
export const addToPantry = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = identity.tokenIdentifier;

    // Deduplicate
    const existing = await ctx.db
      .query("pantry_items")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("pantry_items", {
      userId,
      productId: args.productId,
      addedAt: Date.now(),
    });
  },
});

/**
 * Remove a product from the current user's pantry.
 * No-op if the product was not in the pantry.
 */
export const removeFromPantry = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = identity.tokenIdentifier;

    const item = await ctx.db
      .query("pantry_items")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .first();
    if (item) {
      await ctx.db.delete(item._id);
    }
  },
});

/**
 * Check if a specific product is in the current user's pantry.
 * Returns false for unauthenticated users.
 */
export const isInPantry = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const userId = identity.tokenIdentifier;

    const item = await ctx.db
      .query("pantry_items")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", args.productId)
      )
      .first();
    return item !== null;
  },
});

/**
 * Get all products in the current user's pantry, with product details.
 * Returns empty array for unauthenticated users.
 */
export const getMyPantry = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.tokenIdentifier;

    const items = await ctx.db
      .query("pantry_items")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(200);

    const results = await Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return { pantryItem: item, product };
      })
    );

    // Filter out any items whose product was deleted
    return results.filter((r) => r.product !== null);
  },
});

/**
 * Get pantry statistics for the current user.
 * Returns null for unauthenticated users.
 */
export const getPantryStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.tokenIdentifier;

    const items = await ctx.db
      .query("pantry_items")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(200);

    if (items.length === 0) {
      return {
        totalItems: 0,
        tierBreakdown: { Clean: 0, Watch: 0, Caution: 0, Avoid: 0 },
        averageScore: null,
      };
    }

    const products = await Promise.all(
      items.map((item) => ctx.db.get(item.productId))
    );

    const scoredProducts = products.filter(
      (p) => p !== null && p.baseScore !== undefined
    ) as NonNullable<Awaited<ReturnType<typeof ctx.db.get<"products">>>>[];

    const tierBreakdown = { Clean: 0, Watch: 0, Caution: 0, Avoid: 0 };
    let scoreSum = 0;
    for (const product of scoredProducts) {
      if (product.tier) {
        tierBreakdown[product.tier] = (tierBreakdown[product.tier] ?? 0) + 1;
      }
      if (product.baseScore !== undefined) {
        scoreSum += product.baseScore;
      }
    }

    const averageScore =
      scoredProducts.length > 0 ? scoreSum / scoredProducts.length : null;

    return {
      totalItems: items.length,
      tierBreakdown,
      averageScore,
    };
  },
});
