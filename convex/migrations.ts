import { internalMutation } from "./_generated/server";

/**
 * One-time migration: backfill v3 fields on existing v2 data.
 *
 * 1. Sets scoreVersion=1 and scoredAt on ingredients missing scoreVersion
 * 2. Sets assemblyStatus="complete" on products with a baseScore
 *
 * Run via Convex Dashboard → Functions → migrations:backfillV3Fields
 * or: npx convex run migrations:backfillV3Fields
 */
export const backfillV3Fields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let ingredientsPatched = 0;
    let productsPatched = 0;

    // 1. Backfill ingredients missing scoreVersion
    const ingredients = await ctx.db.query("ingredients").take(2000);
    for (const ing of ingredients) {
      if (ing.scoreVersion === undefined || ing.scoreVersion === null) {
        // These are v2-scored ingredients — they have real scores but no version field
        const hasScores = ing.baseScore > 0;
        await ctx.db.patch(ing._id, {
          scoreVersion: hasScores ? 1 : 0,
          scoredAt: hasScores ? now : 0,
        });
        ingredientsPatched++;
      }
    }

    // 2. Backfill products missing assemblyStatus
    const products = await ctx.db.query("products").take(2000);
    for (const prod of products) {
      if (prod.assemblyStatus === undefined || prod.assemblyStatus === null) {
        const isScored = prod.baseScore != null && prod.baseScore > 0;
        await ctx.db.patch(prod._id, {
          assemblyStatus: isScored ? "complete" : "pending_ingredients",
          pendingIngredientCount: 0,
        });
        productsPatched++;
      }
    }

    return {
      ingredientsPatched,
      productsPatched,
    };
  },
});
