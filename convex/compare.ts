import { v } from "convex/values";
import { query } from "./_generated/server";
import { requirePremium, isPremiumUser } from "./lib/premium";

/**
 * Premium-gated: full comparison data for 2–4 products.
 * Returns product details, ingredients, claims, and score info.
 */
export const compareProducts = query({
  args: {
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    await requirePremium(ctx);

    if (args.productIds.length < 2 || args.productIds.length > 4) {
      throw new Error("Comparison requires 2–4 products");
    }

    const results = await Promise.all(
      args.productIds.map(async (productId) => {
        const product = await ctx.db.get(productId);
        if (!product) return null;

        // Ingredients via product_ingredients join table
        const productIngredientLinks = await ctx.db
          .query("product_ingredients")
          .withIndex("by_productId", (q) => q.eq("productId", productId))
          .collect();
        const ingredients = (
          await Promise.all(productIngredientLinks.map((link) => ctx.db.get(link.ingredientId)))
        ).filter(Boolean);

        const ingredientCount = ingredients.length;
        const flaggedCount = ingredients.filter(
          (i) => i!.tier === "Caution" || i!.tier === "Avoid"
        ).length;

        // Claims
        const claims = await ctx.db
          .query("product_claims")
          .withIndex("by_productId", (q) => q.eq("productId", productId))
          .collect();

        return {
          product: {
            _id: product._id,
            name: product.name,
            brand: product.brand,
            emoji: product.emoji,
            imageUrl: product.imageUrl,
            baseScore: product.baseScore,
            tier: product.tier,
            size: product.size,
            price: product.price,
          },
          ingredientCount,
          flaggedCount,
          claimLabels: claims.map((c) => c.claim),
        };
      })
    );

    return results.filter(Boolean);
  },
});

/**
 * No auth check — returns minimal teaser data for the gate modal / free-user preview.
 */
export const compareProductsTeaser = query({
  args: {
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.productIds.map(async (productId) => {
        const product = await ctx.db.get(productId);
        if (!product) return null;
        return {
          id: product._id as string,
          name: product.name,
          brand: product.brand,
          emoji: product.emoji,
          imageUrl: product.imageUrl,
          baseScore: product.baseScore,
          tier: product.tier,
        };
      })
    );
    return results.filter(Boolean);
  },
});

/**
 * Search products by name prefix (for the comparison product selector).
 */
export const searchProductsForCompare = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.trim().toLowerCase();
    if (q.length < 2) return [];

    // Search by name using the search index if available, otherwise scan
    const results = await ctx.db
      .query("products")
      .withSearchIndex("search_name", (s) => s.search("name", q))
      .take(8);

    return results.map((p) => ({
      id: p._id as string,
      name: p.name,
      brand: p.brand,
      emoji: p.emoji,
      imageUrl: p.imageUrl,
      baseScore: p.baseScore,
      tier: p.tier,
    }));
  },
});
