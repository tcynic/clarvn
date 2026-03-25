import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

// Admin mutation: merge ingredient records that share the same canonicalName
// (case-insensitive). Keeps the record with the highest scoreVersion, reassigns
// product_ingredients and condition_modifiers from losers to the winner, then
// deletes the loser documents.
export const deduplicateIngredients = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const ingredients = await ctx.db.query("ingredients").take(500);

    // Group by normalized canonicalName
    const groups = new Map<string, typeof ingredients>();
    for (const ing of ingredients) {
      const key = ing.canonicalName.toLowerCase().trim();
      const group = groups.get(key) ?? [];
      group.push(ing);
      groups.set(key, group);
    }

    const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);
    if (duplicateGroups.length === 0) return { resolved: 0 };

    // Read all product_ingredients once (no ingredientId index — filter in JS)
    const allLinks = await ctx.db.query("product_ingredients").take(2000);

    let resolved = 0;

    for (const group of duplicateGroups) {
      // Winner = highest scoreVersion, then most recent scoredAt
      group.sort((a, b) => {
        const sv = (b.scoreVersion ?? 0) - (a.scoreVersion ?? 0);
        if (sv !== 0) return sv;
        return (b.scoredAt ?? 0) - (a.scoredAt ?? 0);
      });
      const [winner, ...losers] = group;

      // Track winner's existing product links to avoid creating duplicates
      const winnerLinks = allLinks.filter((l) => l.ingredientId === winner._id);
      const winnerProductIds = new Set(winnerLinks.map((l) => l.productId));

      // Track winner's existing condition modifiers
      const winnerModifiers = await ctx.db
        .query("condition_modifiers")
        .withIndex("by_ingredientId", (q) => q.eq("ingredientId", winner._id))
        .take(100);
      const winnerConditions = new Set(winnerModifiers.map((m) => m.condition));

      for (const loser of losers) {
        // Reassign product_ingredients
        const loserLinks = allLinks.filter((l) => l.ingredientId === loser._id);
        for (const link of loserLinks) {
          if (winnerProductIds.has(link.productId)) {
            await ctx.db.delete(link._id);
          } else {
            await ctx.db.patch(link._id, { ingredientId: winner._id });
            winnerProductIds.add(link.productId);
          }
        }

        // Reassign condition_modifiers
        const loserModifiers = await ctx.db
          .query("condition_modifiers")
          .withIndex("by_ingredientId", (q) => q.eq("ingredientId", loser._id))
          .take(100);
        for (const mod of loserModifiers) {
          if (winnerConditions.has(mod.condition)) {
            await ctx.db.delete(mod._id);
          } else {
            await ctx.db.patch(mod._id, { ingredientId: winner._id });
            winnerConditions.add(mod.condition);
          }
        }

        await ctx.db.delete(loser._id);
        resolved++;
      }
    }

    return { resolved };
  },
});

// Admin mutation: merge product records that share the same name
// (case-insensitive). Keeps the record with the highest scoreVersion, reassigns
// product_ingredients from losers to the winner, then deletes the losers.
export const deduplicateProducts = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const products = await ctx.db.query("products").take(500);

    // Group by normalized name
    const groups = new Map<string, typeof products>();
    for (const p of products) {
      const key = p.name.toLowerCase().trim();
      const group = groups.get(key) ?? [];
      group.push(p);
      groups.set(key, group);
    }

    const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);
    if (duplicateGroups.length === 0) return { resolved: 0 };

    let resolved = 0;

    for (const group of duplicateGroups) {
      // Winner = highest scoreVersion, then most recent scoredAt
      group.sort((a, b) => {
        const sv = b.scoreVersion - a.scoreVersion;
        if (sv !== 0) return sv;
        return b.scoredAt - a.scoredAt;
      });
      const [winner, ...losers] = group;

      // Track winner's existing ingredient links to avoid creating duplicates
      const winnerLinks = await ctx.db
        .query("product_ingredients")
        .withIndex("by_productId", (q) => q.eq("productId", winner._id))
        .take(200);
      const winnerIngredientIds = new Set(winnerLinks.map((l) => l.ingredientId));

      for (const loser of losers) {
        const loserLinks = await ctx.db
          .query("product_ingredients")
          .withIndex("by_productId", (q) => q.eq("productId", loser._id))
          .take(200);
        for (const link of loserLinks) {
          if (winnerIngredientIds.has(link.ingredientId)) {
            await ctx.db.delete(link._id);
          } else {
            await ctx.db.patch(link._id, { productId: winner._id });
            winnerIngredientIds.add(link.ingredientId);
          }
        }

        await ctx.db.delete(loser._id);
        resolved++;
      }
    }

    return { resolved };
  },
});
