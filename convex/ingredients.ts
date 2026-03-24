import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

// Internal mutation: insert or update an ingredient by canonicalName.
export const upsertIngredient = internalMutation({
  args: {
    canonicalName: v.string(),
    aliases: v.array(v.string()),
    harmEvidenceScore: v.number(),
    regulatoryScore: v.number(),
    avoidanceScore: v.number(),
    baseScore: v.number(),
    tier: v.union(
      v.literal("Clean"),
      v.literal("Watch"),
      v.literal("Caution"),
      v.literal("Avoid")
    ),
    flagLabel: v.optional(v.string()),
    evidenceSources: v.optional(v.any()),
    scoreVersion: v.optional(v.number()),
    scoredAt: v.optional(v.number()),
    // Optional: the raw name used when the placeholder was created (from the
    // ingredient queue). If Claude normalises the canonical name, this lets us
    // find and update the placeholder in-place rather than creating a new record,
    // keeping product_ingredients links intact.
    placeholderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If the scored canonical name differs from the placeholder name, try to
    // find and upgrade the placeholder in-place so existing product_ingredients
    // links remain valid.
    if (args.placeholderName && args.placeholderName !== args.canonicalName) {
      const placeholder = await ctx.db
        .query("ingredients")
        .withIndex("by_canonicalName", (q) =>
          q.eq("canonicalName", args.placeholderName!)
        )
        .first();
      if (placeholder && (placeholder.scoreVersion ?? 0) === 0) {
        const { placeholderName: _drop, ...rest } = args;
        await ctx.db.patch(placeholder._id, {
          ...rest,
          scoreVersion: 1,
          scoredAt: args.scoredAt ?? Date.now(),
        });
        return placeholder._id;
      }
    }

    const existing = await ctx.db
      .query("ingredients")
      .withIndex("by_canonicalName", (q) =>
        q.eq("canonicalName", args.canonicalName)
      )
      .first();

    if (existing) {
      const { placeholderName: _drop, ...rest } = args;
      await ctx.db.patch(existing._id, {
        ...rest,
        scoreVersion: (existing.scoreVersion ?? 0) + 1,
        scoredAt: args.scoredAt ?? Date.now(),
      });
      return existing._id;
    }

    const { placeholderName: _drop, ...rest } = args;
    return await ctx.db.insert("ingredients", {
      ...rest,
      scoreVersion: args.scoreVersion ?? 1,
      scoredAt: args.scoredAt ?? Date.now(),
    });
  },
});

// Internal mutation: link a product to an ingredient (many-to-many).
export const linkProductIngredient = internalMutation({
  args: {
    productId: v.id("products"),
    ingredientId: v.id("ingredients"),
  },
  handler: async (ctx, args) => {
    // Avoid duplicate links
    const existing = await ctx.db
      .query("product_ingredients")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("ingredientId"), args.ingredientId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("product_ingredients", args);
  },
});

// Internal mutation: upsert a condition modifier by ingredientId + condition.
export const upsertConditionModifier = internalMutation({
  args: {
    ingredientId: v.id("ingredients"),
    condition: v.string(),
    modifierAmount: v.number(),
    evidenceCitation: v.string(),
    evidenceQuality: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("condition_modifiers")
      .withIndex("by_ingredientId", (q) =>
        q.eq("ingredientId", args.ingredientId)
      )
      .filter((q) => q.eq(q.field("condition"), args.condition))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        modifierAmount: args.modifierAmount,
        evidenceCitation: args.evidenceCitation,
        evidenceQuality: args.evidenceQuality,
      });
      return existing._id;
    }

    return await ctx.db.insert("condition_modifiers", {
      ...args,
      status: "active",
    });
  },
});

// Public admin mutations for seed script access via ConvexHttpClient
export const upsertIngredientPublic = mutation({
  args: {
    canonicalName: v.string(),
    aliases: v.array(v.string()),
    harmEvidenceScore: v.number(),
    regulatoryScore: v.number(),
    avoidanceScore: v.number(),
    baseScore: v.number(),
    tier: v.union(
      v.literal("Clean"),
      v.literal("Watch"),
      v.literal("Caution"),
      v.literal("Avoid")
    ),
    flagLabel: v.optional(v.string()),
    evidenceSources: v.optional(v.any()),
    scoreVersion: v.optional(v.number()),
    scoredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("ingredients")
      .withIndex("by_canonicalName", (q) =>
        q.eq("canonicalName", args.canonicalName)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        scoreVersion: (existing.scoreVersion ?? 0) + 1,
        scoredAt: args.scoredAt ?? Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("ingredients", {
      ...args,
      scoreVersion: args.scoreVersion ?? 1,
      scoredAt: args.scoredAt ?? Date.now(),
    });
  },
});

export const linkProductIngredientPublic = mutation({
  args: { productId: v.id("products"), ingredientId: v.id("ingredients") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("product_ingredients")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("ingredientId"), args.ingredientId))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("product_ingredients", args);
  },
});

export const upsertConditionModifierPublic = mutation({
  args: {
    ingredientId: v.id("ingredients"),
    condition: v.string(),
    modifierAmount: v.number(),
    evidenceCitation: v.string(),
    evidenceQuality: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("condition_modifiers")
      .withIndex("by_ingredientId", (q) =>
        q.eq("ingredientId", args.ingredientId)
      )
      .filter((q) => q.eq(q.field("condition"), args.condition))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        modifierAmount: args.modifierAmount,
        evidenceCitation: args.evidenceCitation,
        evidenceQuality: args.evidenceQuality,
      });
      return existing._id;
    }
    return await ctx.db.insert("condition_modifiers", { ...args, status: "active" });
  },
});

// Internal query: return scoreVersion=0 placeholder ingredients linked to a product.
// Used by requeueUnscoredIngredients to find what needs re-scoring.
export const getPlaceholderIngredientsByProduct = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("product_ingredients")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(200);
    const placeholders = [];
    for (const link of links) {
      const ing = await ctx.db.get(link.ingredientId);
      if (ing && (ing.scoreVersion ?? 0) === 0) placeholders.push(ing);
    }
    return placeholders;
  },
});

// Public query: get all ingredients for a product via the junction table.
export const getIngredientsByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("product_ingredients")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(100);

    const ingredients = await Promise.all(
      links.map((link) => ctx.db.get(link.ingredientId))
    );

    return ingredients.filter(Boolean);
  },
});

// Public query: get active condition modifiers for a list of ingredient IDs.
export const getModifiersByIngredients = query({
  args: { ingredientIds: v.array(v.id("ingredients")) },
  handler: async (ctx, args) => {
    const allModifiers = await Promise.all(
      args.ingredientIds.map((id) =>
        ctx.db
          .query("condition_modifiers")
          .withIndex("by_ingredientId", (q) => q.eq("ingredientId", id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .take(50)
      )
    );
    return allModifiers.flat();
  },
});

// Admin query: list all scored ingredients.
export const listIngredients = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("ingredients")
      .order("asc")
      .take(500);
  },
});

// Admin query: get ingredient detail with condition modifiers and linked products.
export const getIngredientDetail = query({
  args: { ingredientId: v.id("ingredients") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient) return null;

    // Get condition modifiers
    const modifiers = await ctx.db
      .query("condition_modifiers")
      .withIndex("by_ingredientId", (q) => q.eq("ingredientId", args.ingredientId))
      .take(50);

    // Get linked products via product_ingredients
    // (no index on ingredientId, so we scan — acceptable for admin detail view)
    const links = await ctx.db
      .query("product_ingredients")
      .take(2000);
    const relevantLinks = links.filter((l) => l.ingredientId === args.ingredientId);

    const products = await Promise.all(
      relevantLinks.map((link) => ctx.db.get(link.productId))
    );

    return {
      ...ingredient,
      modifiers: modifiers.filter((m) => m.status === "active"),
      linkedProducts: products.filter(Boolean).map((p) => ({
        _id: p!._id,
        name: p!.name,
        brand: p!.brand,
        tier: p!.tier,
        baseScore: p!.baseScore,
      })),
    };
  },
});
