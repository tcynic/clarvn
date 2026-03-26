import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// ============================================================
// Pure Functions (unit-testable, no Convex context)
// ============================================================

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

/**
 * Derive tier from a numeric score.
 * Transitional bands (3.1–3.9, 5.1–5.9, 7.1–7.9) use the lower tier label.
 */
export function getTierFromScore(score: number): Tier {
  if (score < 4.0) return "Clean";
  if (score < 6.0) return "Watch";
  if (score < 8.0) return "Caution";
  return "Avoid";
}

/**
 * Calculate the product base score from an array of ingredient scores
 * using the weighted-worst formula.
 *
 * Product Base Score = max(all ingredient scores)
 *   + Σ( 0.1 + (score - 4.0) × 0.1 ) for each ADDITIONAL ingredient where score ≥ 4.0
 * Capped at 10.0
 *
 * Returns { baseScore, worstIndex } where worstIndex is the index into the
 * input array of the highest-scoring ingredient.
 */
export function calculateProductScore(ingredientScores: number[]): {
  baseScore: number;
  worstIndex: number;
} {
  if (ingredientScores.length === 0) {
    return { baseScore: 1.0, worstIndex: -1 };
  }

  // Find the worst (highest) score
  let worstScore = -Infinity;
  let worstIndex = 0;
  for (let i = 0; i < ingredientScores.length; i++) {
    if (ingredientScores[i] > worstScore) {
      worstScore = ingredientScores[i];
      worstIndex = i;
    }
  }

  // Sum penalties for each ADDITIONAL ingredient with score ≥ 4.0
  let penalty = 0;
  for (let i = 0; i < ingredientScores.length; i++) {
    if (i === worstIndex) continue; // skip the worst (it's the floor)
    const score = ingredientScores[i];
    if (score >= 4.0) {
      penalty += 0.1 + (score - 4.0) * 0.1;
    }
  }

  const baseScore = Math.min(10.0, worstScore + penalty);
  // Round to 2 decimal places to avoid floating point noise
  return {
    baseScore: Math.round(baseScore * 100) / 100,
    worstIndex,
  };
}

// ============================================================
// Mutations
// ============================================================

/**
 * Epic 4.1 — Assemble a product score from its ingredient scores.
 *
 * Fetches all linked ingredients, applies the weighted-worst formula,
 * and updates the product record.
 *
 * Handles partial assembly: if some ingredients have scoreVersion === 0
 * (unscored placeholders), only uses scored ingredients and sets
 * assemblyStatus = "partial".
 */
export const assembleProductScore = internalMutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    // Fetch all product_ingredients links
    const links = await ctx.db
      .query("product_ingredients")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(200);

    if (links.length === 0) {
      // No ingredients linked — mark as pending
      await ctx.db.patch(args.productId, {
        assemblyStatus: "pending_ingredients",
        pendingIngredientCount: 0,
        baseScore: undefined,
        tier: undefined,
      });
      return;
    }

    // Fetch all ingredient records
    const ingredients: Doc<"ingredients">[] = [];
    for (const link of links) {
      const ing = await ctx.db.get(link.ingredientId);
      if (ing) ingredients.push(ing);
    }

    // Split into scored vs unscored (placeholder has scoreVersion === 0)
    const scored = ingredients.filter((i) => (i.scoreVersion ?? 0) > 0);
    const unscoredCount = ingredients.length - scored.length;

    if (scored.length === 0) {
      // All ingredients are unscored placeholders
      await ctx.db.patch(args.productId, {
        assemblyStatus: "pending_ingredients",
        pendingIngredientCount: unscoredCount,
        baseScore: undefined,
        tier: undefined,
        worstIngredientId: undefined,
      });
      return;
    }

    // Calculate product score from scored ingredients
    const scores = scored.map((i) => i.baseScore);
    const { baseScore, worstIndex } = calculateProductScore(scores);
    const tier = getTierFromScore(baseScore);
    const worstIngredientId =
      worstIndex >= 0 ? scored[worstIndex]._id : undefined;

    if (unscoredCount === 0) {
      // All scored — complete assembly
      await ctx.db.patch(args.productId, {
        baseScore,
        tier,
        assemblyStatus: "complete",
        pendingIngredientCount: 0,
        worstIngredientId,
      });
    } else {
      // Partial assembly — some ingredients still pending
      await ctx.db.patch(args.productId, {
        baseScore,
        tier,
        assemblyStatus: "partial",
        pendingIngredientCount: unscoredCount,
        worstIngredientId,
      });
    }
  },
});

/**
 * Epic 3 / 4 bridge — Decrement pendingIngredientCount for a product.
 * Called by scoreIngredient after an ingredient is scored.
 * If count reaches 0, triggers full assembly.
 */
export const decrementPendingAndAssemble = internalMutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return;

    const currentPending = product.pendingIngredientCount ?? 0;
    const newPending = Math.max(0, currentPending - 1);

    await ctx.db.patch(args.productId, {
      pendingIngredientCount: newPending,
    });

    // Always re-assemble to update partial/complete score
    // (this is a mutation calling another handler's logic inline
    //  to avoid extra scheduling overhead)
    const links = await ctx.db
      .query("product_ingredients")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(200);

    const ingredients: Doc<"ingredients">[] = [];
    for (const link of links) {
      const ing = await ctx.db.get(link.ingredientId);
      if (ing) ingredients.push(ing);
    }

    const scored = ingredients.filter((i) => (i.scoreVersion ?? 0) > 0);
    const unscoredCount = ingredients.length - scored.length;

    if (scored.length === 0) return;

    const scores = scored.map((i) => i.baseScore);
    const { baseScore, worstIndex } = calculateProductScore(scores);
    const tier = getTierFromScore(baseScore);
    const worstIngredientId =
      worstIndex >= 0 ? scored[worstIndex]._id : undefined;

    if (unscoredCount === 0) {
      await ctx.db.patch(args.productId, {
        baseScore,
        tier,
        assemblyStatus: "complete",
        pendingIngredientCount: 0,
        worstIngredientId,
      });
    } else {
      await ctx.db.patch(args.productId, {
        baseScore,
        tier,
        assemblyStatus: "partial",
        pendingIngredientCount: unscoredCount,
        worstIngredientId,
      });
    }
  },
});

// ============================================================
// Queries
// ============================================================

/**
 * Epic 4.3 — Server-side personalization query.
 *
 * Returns both base score and personal score for a product,
 * adjusted by the current user's health profile.
 *
 * Personal Score = baseScore + Σ(matched condition modifiers), capped at 10.0
 *
 * This is reactive — updates automatically when scores or profile change.
 */
export const getPersonalizedProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    // Fetch ingredients
    const links = await ctx.db
      .query("product_ingredients")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .take(200);

    const ingredients: Doc<"ingredients">[] = [];
    for (const link of links) {
      const ing = await ctx.db.get(link.ingredientId);
      if (ing) ingredients.push(ing);
    }

    // Fetch user profile (if authenticated)
    let userProfile: Doc<"user_profiles"> | null = null;
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      userProfile = await ctx.db
        .query("user_profiles")
        .withIndex("by_userId", (q) =>
          q.eq("userId", identity.tokenIdentifier)
        )
        .first();
    }

    // Fetch all condition modifiers for the product's ingredients
    const ingredientIds = ingredients.map((i) => i._id);
    const allModifiers: Doc<"condition_modifiers">[] = [];
    for (const id of ingredientIds) {
      const mods = await ctx.db
        .query("condition_modifiers")
        .withIndex("by_ingredientId", (q) => q.eq("ingredientId", id))
        .take(50);
      for (const m of mods) {
        if (m.status === "active") allModifiers.push(m);
      }
    }

    // Calculate personal score
    const baseScore = product.baseScore ?? 0;
    const baseTier = product.tier ?? getTierFromScore(baseScore);

    let personalScore = baseScore;
    let matchPercentage = 0;
    const matchedModifiers: Array<{
      condition: string;
      ingredientId: Id<"ingredients">;
      modifierAmount: number;
      evidenceCitation: string;
    }> = [];

    if (userProfile) {
      const userConditions = new Set([
        ...userProfile.conditions.map((c) => c.toLowerCase()),
        ...userProfile.sensitivities.map((s) => s.toLowerCase()),
      ]);

      for (const mod of allModifiers) {
        if (userConditions.has(mod.condition.toLowerCase())) {
          personalScore += mod.modifierAmount;
          matchedModifiers.push({
            condition: mod.condition,
            ingredientId: mod.ingredientId,
            modifierAmount: mod.modifierAmount,
            evidenceCitation: mod.evidenceCitation,
          });
        }
      }

      // matchPercentage: proportion of user's conditions that have at least
      // one active modifier for this product's ingredients.
      if (userConditions.size > 0) {
        const matchedConditionSet = new Set(
          matchedModifiers.map((m) => m.condition.toLowerCase())
        );
        matchPercentage = Math.round(
          (matchedConditionSet.size / userConditions.size) * 100
        );
      }
    }

    personalScore = Math.min(10.0, personalScore);
    const personalTier = getTierFromScore(personalScore);

    // Separate scored vs pending ingredients for the response
    const scoredIngredients = ingredients
      .filter((i) => (i.scoreVersion ?? 0) > 0)
      .sort((a, b) => b.baseScore - a.baseScore);
    const pendingIngredients = ingredients.filter(
      (i) => (i.scoreVersion ?? 0) === 0
    );

    return {
      baseScore,
      personalScore,
      tier: baseTier,
      personalTier,
      matchPercentage,
      modifiers: matchedModifiers,
      ingredients: scoredIngredients,
      pendingIngredients: pendingIngredients.map((i) => ({
        _id: i._id,
        canonicalName: i.canonicalName,
      })),
      assemblyStatus: product.assemblyStatus ?? "pending_ingredients",
      pendingCount: product.pendingIngredientCount ?? 0,
      worstIngredientId: product.worstIngredientId,
    };
  },
});
