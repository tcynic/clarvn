/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

function withUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ tokenIdentifier: `test|${userId}|session` });
}

// ============================================================
// Helpers
// ============================================================

async function insertProduct(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    name: string;
    brand: string;
    baseScore: number;
    tier: "Clean" | "Watch" | "Caution" | "Avoid";
  }> = {}
) {
  return t.run(async (ctx) =>
    ctx.db.insert("products", {
      name: overrides.name ?? "Test Product",
      brand: overrides.brand ?? "Test Brand",
      status: "scored",
      scoreVersion: 1,
      scoredAt: Date.now(),
      assemblyStatus: "complete",
      baseScore: overrides.baseScore ?? 3.0,
      tier: overrides.tier ?? "Clean",
    })
  );
}

async function insertIngredient(
  t: ReturnType<typeof convexTest>,
  name: string,
  baseScore = 3.0
) {
  return t.run(async (ctx) =>
    ctx.db.insert("ingredients", {
      canonicalName: name,
      aliases: [],
      harmEvidenceScore: baseScore,
      regulatoryScore: baseScore,
      avoidanceScore: baseScore,
      baseScore,
      tier: baseScore < 4 ? "Clean" : baseScore < 6 ? "Watch" : baseScore < 8 ? "Caution" : "Avoid",
      scoreVersion: 1,
      scoredAt: Date.now(),
    })
  );
}

// ============================================================
// getRecommendedProducts — authenticated
// ============================================================

describe("Epic 4 — getRecommendedProducts (authenticated)", () => {
  test("returns empty array if no scored products exist", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    // Insert user profile
    await t.run(async (ctx) =>
      ctx.db.insert("user_profiles", {
        userId,
        conditions: ["ADHD"],
        sensitivities: ["Migraines"],
      })
    );

    const results = await asUser.query(api.recommendations.getRecommendedProducts, {});
    expect(results).toEqual([]);
  });

  test("returns products sorted by match% descending", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    // Profile with 2 conditions
    await t.run(async (ctx) =>
      ctx.db.insert("user_profiles", {
        userId,
        conditions: ["ADHD"],
        sensitivities: ["Migraines"],
      })
    );

    // Product A: ingredient with modifier for ADHD (1/2 conditions = 50%)
    const productA = await insertProduct(t, { name: "Product A", baseScore: 3.5, tier: "Clean" });
    const ingA = await insertIngredient(t, "Ingredient A", 3.0);
    await t.run(async (ctx) => {
      await ctx.db.insert("product_ingredients", { productId: productA, ingredientId: ingA });
      await ctx.db.insert("condition_modifiers", {
        ingredientId: ingA,
        condition: "adhd",
        modifierAmount: 1.0,
        evidenceCitation: "Test",
        status: "active",
      });
    });

    // Product B: ingredient with modifiers for both ADHD + Migraines (2/2 = 100%)
    const productB = await insertProduct(t, { name: "Product B", baseScore: 4.0, tier: "Watch" });
    const ingB = await insertIngredient(t, "Ingredient B", 4.0);
    await t.run(async (ctx) => {
      await ctx.db.insert("product_ingredients", { productId: productB, ingredientId: ingB });
      await ctx.db.insert("condition_modifiers", {
        ingredientId: ingB,
        condition: "adhd",
        modifierAmount: 1.0,
        evidenceCitation: "Test",
        status: "active",
      });
      await ctx.db.insert("condition_modifiers", {
        ingredientId: ingB,
        condition: "migraines",
        modifierAmount: 0.5,
        evidenceCitation: "Test",
        status: "active",
      });
    });

    // Product C: no relevant modifiers (0%)
    const productC = await insertProduct(t, { name: "Product C", baseScore: 2.0, tier: "Clean" });
    const ingC = await insertIngredient(t, "Ingredient C", 2.0);
    await t.run(async (ctx) => {
      await ctx.db.insert("product_ingredients", { productId: productC, ingredientId: ingC });
    });

    const results = await asUser.query(api.recommendations.getRecommendedProducts, { limit: 3 });

    expect(results.length).toBeGreaterThanOrEqual(2);
    // Product B should be first (100% match), Product A second (50%)
    const names = results.map((r) => r.product.name);
    expect(names.indexOf("Product B")).toBeLessThan(names.indexOf("Product A"));
  });

  test("returns empty array when unauthenticated with no profileOverride", async () => {
    const t = convexTest(schema, modules);
    await insertProduct(t, { name: "Product X" });
    const results = await t.query(api.recommendations.getRecommendedProducts, {});
    expect(results).toEqual([]);
  });
});

// ============================================================
// getRecommendedProducts — guest (profileOverride)
// ============================================================

describe("Epic 4 — getRecommendedProducts (profileOverride / guest)", () => {
  test("uses profileOverride when provided, no auth needed", async () => {
    const t = convexTest(schema, modules);

    const productId = await insertProduct(t, { name: "Guest Product", baseScore: 3.0 });
    const ingId = await insertIngredient(t, "Guest Ingredient", 3.0);
    await t.run(async (ctx) => {
      await ctx.db.insert("product_ingredients", { productId, ingredientId: ingId });
      await ctx.db.insert("condition_modifiers", {
        ingredientId: ingId,
        condition: "eczema",
        modifierAmount: 2.0,
        evidenceCitation: "Test",
        status: "active",
      });
    });

    // Call as unauthenticated but with profileOverride
    const results = await t.query(api.recommendations.getRecommendedProducts, {
      profileOverride: {
        conditions: ["Eczema"],
        sensitivities: [],
      },
    });

    expect(results.length).toBeGreaterThanOrEqual(1);
    const guestProduct = results.find((r) => r.product.name === "Guest Product");
    expect(guestProduct).toBeTruthy();
    expect(guestProduct?.matchPercentage).toBe(100);
  });

  test("returns empty array if profileOverride has no conditions or sensitivities", async () => {
    const t = convexTest(schema, modules);
    await insertProduct(t, { name: "Product Z" });

    const results = await t.query(api.recommendations.getRecommendedProducts, {
      profileOverride: {
        conditions: [],
        sensitivities: [],
      },
    });
    expect(results).toEqual([]);
  });
});

// ============================================================
// listArticles
// ============================================================

describe("Epic 4 — listArticles", () => {
  test("seeds and lists articles with limit", async () => {
    const t = convexTest(schema, modules);

    // Seed via the internal mutation
    await t.run(async (ctx) => {
      await ctx.db.insert("content_articles", {
        title: "Article 1",
        category: "label-literacy",
        emoji: "📋",
        slug: "article-1",
        body: "Body 1",
        publishedAt: Date.now() - 2000,
      });
      await ctx.db.insert("content_articles", {
        title: "Article 2",
        category: "additives",
        emoji: "⚠️",
        slug: "article-2",
        body: "Body 2",
        publishedAt: Date.now() - 1000,
      });
      await ctx.db.insert("content_articles", {
        title: "Article 3",
        category: "label-literacy",
        emoji: "🌿",
        slug: "article-3",
        body: "Body 3",
        publishedAt: Date.now(),
      });
    });

    const all = await t.query(api.contentArticles.listArticles, { limit: 10 });
    expect(all.length).toBe(3);

    // Limit works
    const limited = await t.query(api.contentArticles.listArticles, { limit: 2 });
    expect(limited.length).toBe(2);
  });

  test("filters by category", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("content_articles", {
        title: "Label Article",
        category: "label-literacy",
        slug: "label-1",
        body: "Body",
      });
      await ctx.db.insert("content_articles", {
        title: "Additive Article",
        category: "additives",
        slug: "additive-1",
        body: "Body",
      });
    });

    const results = await t.query(api.contentArticles.listArticles, {
      category: "label-literacy",
    });
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Label Article");
  });
});

// ============================================================
// Check-in round-trip
// ============================================================

describe("Epic 4 — check-in round-trip", () => {
  test("logCheckin → getTodayCheckin returns correct mood", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    const today = new Date().toISOString().slice(0, 10);

    await asUser.mutation(api.checkins.logCheckin, { date: today, mood: 4 });

    const checkin = await asUser.query(api.checkins.getTodayCheckin, {});
    expect(checkin).not.toBeNull();
    expect(checkin?.mood).toBe(4);
    expect(checkin?.date).toBe(today);
  });

  test("calling logCheckin twice on same day upserts", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    const today = new Date().toISOString().slice(0, 10);
    await asUser.mutation(api.checkins.logCheckin, { date: today, mood: 2 });
    await asUser.mutation(api.checkins.logCheckin, { date: today, mood: 5 });

    const checkin = await asUser.query(api.checkins.getTodayCheckin, {});
    expect(checkin?.mood).toBe(5); // updated to latest
  });
});

// ============================================================
// Pantry stats
// ============================================================

describe("Epic 4 — getPantryStats", () => {
  test("returns correct totals after adding products", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    const cleanProduct = await insertProduct(t, { baseScore: 2.0, tier: "Clean" });
    const watchProduct = await insertProduct(t, { name: "Watch Item", baseScore: 4.5, tier: "Watch" });
    const avoidProduct = await insertProduct(t, { name: "Avoid Item", baseScore: 9.0, tier: "Avoid" });

    await asUser.mutation(api.pantry.addToPantry, { productId: cleanProduct });
    await asUser.mutation(api.pantry.addToPantry, { productId: watchProduct });
    await asUser.mutation(api.pantry.addToPantry, { productId: avoidProduct });

    const stats = await asUser.query(api.pantry.getPantryStats, {});

    expect(stats).not.toBeNull();
    expect(stats?.totalItems).toBe(3);
    expect(stats?.tierBreakdown.Clean).toBe(1);
    expect(stats?.tierBreakdown.Watch).toBe(1);
    expect(stats?.tierBreakdown.Avoid).toBe(1);
    expect(stats?.averageScore).toBeCloseTo((2.0 + 4.5 + 9.0) / 3, 1);
  });

  test("adding duplicate product does not change count", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    const productId = await insertProduct(t);

    await asUser.mutation(api.pantry.addToPantry, { productId });
    await asUser.mutation(api.pantry.addToPantry, { productId }); // duplicate

    const stats = await asUser.query(api.pantry.getPantryStats, {});
    expect(stats?.totalItems).toBe(1);
  });
});
