import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

/**
 * List published content articles, most recent first.
 */
export const listArticles = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 6;
    if (args.category) {
      return await ctx.db
        .query("content_articles")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db
      .query("content_articles")
      .order("desc")
      .take(limit);
  },
});

/**
 * Seed initial content articles for Epic 4.
 * Safe to run multiple times — only inserts if no articles exist.
 */
export const seedArticles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("content_articles").take(1);
    if (existing.length > 0) return;

    const now = Date.now();
    const articles = [
      {
        title: "What 'Natural' Really Means on a Food Label",
        category: "label-literacy",
        emoji: "🌿",
        slug: "what-natural-really-means",
        body: "The FDA has no formal definition for the word 'natural' on food labels, meaning companies can use it almost freely. A product labeled 'natural' can still contain high-fructose corn syrup, artificial colors, and other processed ingredients.",
        publishedAt: now - 5 * 86400000,
      },
      {
        title: "Reading Ingredient Lists Like a Pro",
        category: "label-literacy",
        emoji: "📋",
        slug: "reading-ingredient-lists",
        body: "Ingredients are listed by weight from most to least, so the first few items make up the bulk of the product. If sugar (under any of its 60+ names) appears in the top three, the product is likely high in sugar regardless of what the front label claims.",
        publishedAt: now - 4 * 86400000,
      },
      {
        title: "The Dirty Dozen Additives to Watch For",
        category: "additives",
        emoji: "⚠️",
        slug: "dirty-dozen-additives",
        body: "Artificial dyes like Red 40 and Yellow 5, preservatives like BHA and BHT, and thickeners like carrageenan are among the most-studied additives with potential health concerns. Clarvn flags all of these by default and scores them based on current evidence.",
        publishedAt: now - 3 * 86400000,
      },
      {
        title: "Organic vs Non-GMO: What's the Difference?",
        category: "certifications",
        emoji: "🔍",
        slug: "organic-vs-non-gmo",
        body: "USDA Organic certification prohibits synthetic pesticides, fertilizers, and GMOs — it's a broader standard. Non-GMO Project Verified only addresses genetic modification and doesn't restrict pesticide use. For the most protection, look for both certifications.",
        publishedAt: now - 2 * 86400000,
      },
      {
        title: "Why 'Low-Fat' Often Means More Sugar",
        category: "label-literacy",
        emoji: "🍬",
        slug: "low-fat-more-sugar",
        body: "When manufacturers remove fat from a product, the result often tastes flat — so they compensate by adding sugar, corn syrup, or artificial sweeteners. Always compare the full nutrition panel, not just the front-of-pack marketing claims.",
        publishedAt: now - 1 * 86400000,
      },
      {
        title: "Understanding Serving Sizes",
        category: "label-literacy",
        emoji: "📏",
        slug: "understanding-serving-sizes",
        body: "Serving sizes on nutrition labels are set by the FDA based on typical consumption amounts, but they're often unrealistically small. A bag of chips might list one serving as 12 chips while most people eat the whole bag — multiplying every number on the label.",
        publishedAt: now,
      },
    ];

    for (const article of articles) {
      await ctx.db.insert("content_articles", article);
    }
  },
});
