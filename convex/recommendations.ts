import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getTierFromScore } from "./assembly";

/**
 * Epic 4.2 — Personalized product recommendations.
 *
 * Algorithm:
 * 1. Resolve profile from auth or profileOverride (guest path).
 * 2. Fetch up to 30 scored products as candidates.
 * 3. For each candidate, compute match% against user's conditions/sensitivities
 *    using condition_modifiers (same pattern as assembly.ts:getPersonalizedProduct).
 * 4. Return top `limit` products sorted by matchPercentage desc.
 *
 * Returns [] if no profile or no conditions/sensitivities to match against.
 */
export const getRecommendedProducts = query({
  args: {
    limit: v.optional(v.number()),
    profileOverride: v.optional(
      v.object({
        conditions: v.array(v.string()),
        sensitivities: v.array(v.string()),
        dietaryRestrictions: v.optional(v.array(v.string())),
        ingredientsToAvoid: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3;

    // 1. Resolve profile
    let conditions: string[] = [];
    let sensitivities: string[] = [];

    if (args.profileOverride) {
      conditions = args.profileOverride.conditions;
      sensitivities = args.profileOverride.sensitivities;
    } else {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return [];

      const parts = identity.tokenIdentifier.split("|");
      const userId = parts.length >= 2 ? parts[1] : identity.tokenIdentifier;

      const profile = await ctx.db
        .query("user_profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

      if (!profile) return [];
      conditions = profile.conditions;
      sensitivities = profile.sensitivities;
    }

    const userConditions = new Set([
      ...conditions.map((c) => c.toLowerCase()),
      ...sensitivities.map((s) => s.toLowerCase()),
    ]);

    if (userConditions.size === 0) return [];

    // 2. Fetch candidate products (scored, non-archived)
    const candidates = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "scored"))
      .take(30);

    if (candidates.length === 0) return [];

    // 3. Score each candidate by match %
    const scored: Array<{
      product: Doc<"products">;
      matchPercentage: number;
      personalScore: number;
      tier: string;
    }> = [];

    for (const product of candidates) {
      if (product.baseScore === undefined) continue;

      // Fetch ingredient links
      const links = await ctx.db
        .query("product_ingredients")
        .withIndex("by_productId", (q) => q.eq("productId", product._id))
        .take(100);

      // Fetch all condition_modifiers for this product's ingredients
      let personalScore = product.baseScore;
      const matchedConditions = new Set<string>();

      for (const link of links) {
        const mods = await ctx.db
          .query("condition_modifiers")
          .withIndex("by_ingredientId", (q) => q.eq("ingredientId", link.ingredientId))
          .take(50);

        for (const mod of mods) {
          if (mod.status !== "active") continue;
          if (userConditions.has(mod.condition.toLowerCase())) {
            personalScore += mod.modifierAmount;
            matchedConditions.add(mod.condition.toLowerCase());
          }
        }
      }

      personalScore = Math.min(10.0, personalScore);
      const matchPercentage = Math.round(
        (matchedConditions.size / userConditions.size) * 100
      );

      scored.push({
        product,
        matchPercentage,
        personalScore,
        tier: getTierFromScore(personalScore),
      });
    }

    // 4. Sort by matchPercentage desc, then personalScore desc as tiebreaker
    scored.sort((a, b) =>
      b.matchPercentage !== a.matchPercentage
        ? b.matchPercentage - a.matchPercentage
        : b.personalScore - a.personalScore
    );

    return scored.slice(0, limit);
  },
});
