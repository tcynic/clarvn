import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

// --- Internal mutation: upsert alternatives for a product ---
export const upsertAlternatives = internalMutation({
  args: {
    productId: v.id("products"),
    alternatives: v.array(
      v.object({
        name: v.string(),
        brand: v.string(),
        reason: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("alternatives_queue")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "done",
        alternatives: args.alternatives,
      });
    } else {
      await ctx.db.insert("alternatives_queue", {
        productId: args.productId,
        status: "done",
        alternatives: args.alternatives,
      });
    }
  },
});

// --- Internal mutation: mark alternatives entry as failed ---
export const markAlternativesFailed = internalMutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("alternatives_queue")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { status: "failed" });
    } else {
      await ctx.db.insert("alternatives_queue", {
        productId: args.productId,
        status: "failed",
      });
    }
  },
});

// --- Internal query: check if a product already has an alternatives entry ---
export const getAlternativesEntry = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("alternatives_queue")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .first();
  },
});

// --- Public query: get alternatives for a product ---
export const getAlternativesForProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("alternatives_queue")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .first();

    if (!entry || entry.status !== "done") return null;
    return entry.alternatives ?? null;
  },
});
