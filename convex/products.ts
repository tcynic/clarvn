import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin } from "./lib/auth";

// Internal mutation: write a scored product to the DB.
export const writeProduct = internalMutation({
  args: {
    name: v.string(),
    brand: v.string(),
    upc: v.optional(v.array(v.string())),
    emoji: v.optional(v.string()),
    baseScore: v.optional(v.number()),
    tier: v.optional(
      v.union(
        v.literal("Clean"),
        v.literal("Watch"),
        v.literal("Caution"),
        v.literal("Avoid")
      )
    ),
    scoreVersion: v.number(),
    scoredAt: v.number(),
    // v3 assembly fields
    assemblyStatus: v.optional(
      v.union(
        v.literal("complete"),
        v.literal("partial"),
        v.literal("pending_ingredients")
      )
    ),
    pendingIngredientCount: v.optional(v.number()),
    worstIngredientId: v.optional(v.id("ingredients")),
    ingredientSource: v.optional(
      v.union(
        v.literal("open_food_facts"),
        v.literal("ai_extraction"),
        v.literal("manual")
      )
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", {
      ...args,
      status: "scored",
    });
  },
});

// Internal query: look up a product by name (for use by actions).
export const getProductByName = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
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

// Internal query: list all products by assembly status (for stuck-product repair).
export const listByAssemblyStatus = internalQuery({
  args: {
    assemblyStatus: v.union(
      v.literal("complete"),
      v.literal("partial"),
      v.literal("pending_ingredients")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_assemblyStatus", (q) =>
        q.eq("assemblyStatus", args.assemblyStatus)
      )
      .collect();
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
    baseScore: v.optional(v.number()),
    tier: v.optional(
      v.union(
        v.literal("Clean"),
        v.literal("Watch"),
        v.literal("Caution"),
        v.literal("Avoid")
      )
    ),
    scoreVersion: v.number(),
    scoredAt: v.number(),
    // v3 assembly fields
    assemblyStatus: v.optional(
      v.union(
        v.literal("complete"),
        v.literal("partial"),
        v.literal("pending_ingredients")
      )
    ),
    pendingIngredientCount: v.optional(v.number()),
    worstIngredientId: v.optional(v.id("ingredients")),
    ingredientSource: v.optional(
      v.union(
        v.literal("open_food_facts"),
        v.literal("ai_extraction"),
        v.literal("manual")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("products", { ...args, status: "scored" });
  },
});

// Public query: count products by status.
export const countProducts = query({
  args: {
    status: v.optional(
      v.union(v.literal("scored"), v.literal("archived"))
    ),
  },
  handler: async (ctx, args) => {
    const status = args.status ?? "scored";
    const all = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect();
    return all.length;
  },
});

// Public (admin-only) mutation: assign one or more brands to an unknown-brand product.
// If one brand: patches the existing record in place.
// If multiple brands: clones the product for each brand, then deletes the original.
export const setBrand = mutation({
  args: {
    productId: v.id("products"),
    brands: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.brands.length === 0) throw new Error("At least one brand is required");
    if (args.brands.length > 5) throw new Error("At most 5 brands allowed");

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    if (args.brands.length === 1) {
      await ctx.db.patch(args.productId, { brand: args.brands[0] });
    } else {
      const { _id, _creationTime, ...rest } = product;
      for (const brand of args.brands) {
        await ctx.db.insert("products", { ...rest, brand });
      }
      await ctx.db.delete(args.productId);
    }
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
      .collect();
  },
});

/**
 * Paginated product browse with optional category and/or tier filtering.
 * Uses compound index by_category_and_tier when both are provided,
 * single-field indexes otherwise.
 */
export const browseProducts = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(v.string()),
    tier: v.optional(
      v.union(
        v.literal("Clean"),
        v.literal("Watch"),
        v.literal("Caution"),
        v.literal("Avoid")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.category && args.tier) {
      return await ctx.db
        .query("products")
        .withIndex("by_category_and_tier", (q) =>
          q.eq("category", args.category!).eq("tier", args.tier!)
        )
        .paginate(args.paginationOpts);
    }
    if (args.category) {
      return await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .paginate(args.paginationOpts);
    }
    if (args.tier) {
      return await ctx.db
        .query("products")
        .withIndex("by_tier", (q) => q.eq("tier", args.tier!))
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "scored"))
      .paginate(args.paginationOpts);
  },
});

/**
 * Get all claims for a product.
 */
export const getProductClaims = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("product_claims")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(50);
  },
});

/**
 * Epic 7.2 — Match details for a single product.
 * Returns which of the authenticated user's profile flags are met by this
 * product's ingredients, along with a match percentage.
 */
export const getMatchDetailsForProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const parts = identity.tokenIdentifier.split("|");
    const userId = parts.length >= 2 ? parts[1] : identity.tokenIdentifier;

    const profile = await ctx.db
      .query("user_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;

    const userConditions = new Set([
      ...profile.conditions.map((c: string) => c.toLowerCase()),
      ...profile.sensitivities.map((s: string) => s.toLowerCase()),
    ]);
    if (userConditions.size === 0) {
      return { matchPercentage: 0, matchedFlags: [] as string[], totalFlags: 0 };
    }

    const links = await ctx.db
      .query("product_ingredients")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(100);

    const matchedConditions = new Set<string>();
    for (const link of links) {
      const mods = await ctx.db
        .query("condition_modifiers")
        .withIndex("by_ingredientId", (q) => q.eq("ingredientId", link.ingredientId))
        .take(50);
      for (const mod of mods) {
        if (mod.status === "active" && userConditions.has(mod.condition.toLowerCase())) {
          matchedConditions.add(mod.condition.toLowerCase());
        }
      }
    }

    const matchPercentage = Math.round(
      (matchedConditions.size / userConditions.size) * 100
    );
    return {
      matchPercentage,
      matchedFlags: Array.from(matchedConditions),
      totalFlags: userConditions.size,
    };
  },
});
