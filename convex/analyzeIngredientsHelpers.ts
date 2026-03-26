/**
 * analyzeIngredientsHelpers.ts
 *
 * Internal queries and mutations for paste-ingredients analysis.
 * These CANNOT be in the "use node" action file; they live here.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation, query, mutation } from "./_generated/server";
import { getAuthUserId, isPremiumUser } from "./lib/premium";

const FREE_DAILY_LIMIT = 3;

/**
 * Look up ingredients by canonical name or alias (case-insensitive).
 * Returns matches with recognition status.
 */
export const lookupIngredients = internalQuery({
  args: { names: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.names.map(async (name) => {
        const normalized = name.trim().toLowerCase();
        if (!normalized) return null;

        // Try canonical name first
        const byCanonical = await ctx.db
          .query("ingredients")
          .withIndex("by_canonicalName", (q) => q.eq("canonicalName", normalized))
          .first();
        if (byCanonical) {
          return { name, ingredient: byCanonical, recognized: true as const };
        }

        // Try aliases
        const all = await ctx.db
          .query("ingredients")
          .collect();
        const byAlias = all.find((i) =>
          i.aliases.some((a) => a.toLowerCase() === normalized)
        );
        if (byAlias) {
          return { name, ingredient: byAlias, recognized: true as const };
        }

        return { name, ingredient: null, recognized: false as const };
      })
    );
    return results.filter(Boolean) as Array<{
      name: string;
      ingredient: NonNullable<(typeof results)[number]>["ingredient"];
      recognized: boolean;
    }>;
  },
});

/**
 * Check how many analyses the user has run today (for free tier cap).
 */
export const checkDailyAnalysisCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { count: 0, limit: FREE_DAILY_LIMIT, atLimit: false };

    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const record = await ctx.db
      .query("analysis_usage")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", userId as string).eq("date", today)
      )
      .first();

    const count = record?.count ?? 0;
    return { count, limit: FREE_DAILY_LIMIT, atLimit: count >= FREE_DAILY_LIMIT };
  },
});

/**
 * Increment (or create) the user's daily analysis usage counter.
 */
export const recordAnalysis = internalMutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const today = new Date().toISOString().slice(0, 10);
    const record = await ctx.db
      .query("analysis_usage")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", userId as string).eq("date", today)
      )
      .first();

    if (record) {
      await ctx.db.patch(record._id, { count: record.count + 1 });
    } else {
      await ctx.db.insert("analysis_usage", {
        userId: userId as string,
        date: today,
        count: 1,
      });
    }
  },
});

/**
 * Internal query: check whether the calling user is premium.
 * Used by the analyzeIngredients action (which can't call ctx.db directly).
 */
export const checkIsPremium = internalQuery({
  args: {},
  handler: async (ctx) => {
    return isPremiumUser(ctx);
  },
});

/**
 * Public query: returns today's analysis usage for the current user.
 * Used by the /analyze page to show the usage counter.
 */
export const getMyDailyAnalysisUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { count: 0, limit: FREE_DAILY_LIMIT, atLimit: false };

    const today = new Date().toISOString().slice(0, 10);
    const record = await ctx.db
      .query("analysis_usage")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", userId as string).eq("date", today)
      )
      .first();

    const count = record?.count ?? 0;
    return { count, limit: FREE_DAILY_LIMIT, atLimit: count >= FREE_DAILY_LIMIT };
  },
});

/**
 * Save an analyzed ingredient list as a new product.
 * Returns the new product's ID so the client can redirect to /product/[id].
 */
export const saveAnalyzedProduct = internalMutation({
  args: {
    name: v.string(),
    brand: v.string(),
    baseScore: v.number(),
    tier: v.union(
      v.literal("Clean"),
      v.literal("Watch"),
      v.literal("Caution"),
      v.literal("Avoid")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", {
      name: args.name.trim(),
      brand: args.brand.trim(),
      status: "scored",
      scoreVersion: 1,
      scoredAt: Date.now(),
      assemblyStatus: "complete",
      baseScore: args.baseScore,
      tier: args.tier,
      ingredientSource: "ai_extraction",
    });
  },
});

/**
 * Public mutation: save analysis results as a new product.
 * Client calls this directly after a successful analysis.
 */
export const saveProductFromAnalysis = mutation({
  args: {
    name: v.string(),
    brand: v.string(),
    baseScore: v.number(),
    tier: v.union(
      v.literal("Clean"),
      v.literal("Watch"),
      v.literal("Caution"),
      v.literal("Avoid")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", {
      name: args.name.trim(),
      brand: args.brand.trim(),
      status: "scored",
      scoreVersion: 1,
      scoredAt: Date.now(),
      assemblyStatus: "complete",
      baseScore: args.baseScore,
      tier: args.tier,
      ingredientSource: "ai_extraction",
    });
  },
});
