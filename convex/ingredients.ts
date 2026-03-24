import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ingredients")
      .withIndex("by_canonicalName", (q) =>
        q.eq("canonicalName", args.canonicalName)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("ingredients", args);
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
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("ingredients", args);
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
