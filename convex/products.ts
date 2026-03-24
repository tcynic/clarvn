import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

// Internal mutation: write a scored product to the DB.
export const writeProduct = internalMutation({
  args: {
    name: v.string(),
    brand: v.string(),
    upc: v.optional(v.array(v.string())),
    emoji: v.optional(v.string()),
    baseScore: v.number(),
    tier: v.union(
      v.literal("Clean"),
      v.literal("Watch"),
      v.literal("Caution"),
      v.literal("Avoid")
    ),
    scoreVersion: v.number(),
    scoredAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", {
      ...args,
      status: "scored",
    });
  },
});

// Public query: look up a product by name (case-sensitive).
export const getProduct = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// Public query: look up a product by its Convex ID.
export const getProductById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Internal mutation: update refreshConfirmedAt timestamp after a no-change diff check.
export const updateRefreshConfirmed = internalMutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, { refreshConfirmedAt: Date.now() });
  },
});

// Internal mutation: apply a refresh diff result (score/tier changed).
export const applyRefresh = internalMutation({
  args: {
    productId: v.id("products"),
    baseScore: v.optional(v.number()),
    tier: v.optional(
      v.union(
        v.literal("Clean"),
        v.literal("Watch"),
        v.literal("Caution"),
        v.literal("Avoid")
      )
    ),
    changeReason: v.string(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    const patch: Record<string, unknown> = {
      refreshConfirmedAt: Date.now(),
      scoreVersion: product.scoreVersion + 1,
      scoredAt: Date.now(),
    };
    if (args.baseScore !== undefined) patch.baseScore = args.baseScore;
    if (args.tier !== undefined) patch.tier = args.tier;
    await ctx.db.patch(args.productId, patch);
  },
});

// Internal query: paginate over scored products for refresh check batching.
export const listScoredPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "scored"))
      .paginate({ numItems: 20, cursor: args.cursor });
    return {
      productIds: result.page.map((p) => p._id),
      nextCursor: result.isDone ? null : result.continueCursor,
    };
  },
});

// Public (admin-only) mutation: write a scored product
export const writeProductPublic = mutation({
  args: {
    name: v.string(),
    brand: v.string(),
    upc: v.optional(v.array(v.string())),
    emoji: v.optional(v.string()),
    baseScore: v.number(),
    tier: v.union(
      v.literal("Clean"),
      v.literal("Watch"),
      v.literal("Caution"),
      v.literal("Avoid")
    ),
    scoreVersion: v.number(),
    scoredAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("products", { ...args, status: "scored" });
  },
});

// Public query: list scored products by status, paginated.
export const listProducts = query({
  args: {
    status: v.optional(
      v.union(v.literal("scored"), v.literal("archived"))
    ),
  },
  handler: async (ctx, args) => {
    const status = args.status ?? "scored";
    return await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", status))
      .take(100);
  },
});
