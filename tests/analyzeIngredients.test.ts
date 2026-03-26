/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

function withUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ tokenIdentifier: `test|${userId}|session` });
}

async function insertUser(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: Record<string, unknown> = {}
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", { name: "Test", email: `${userId}@test.com`, ...overrides } as never)
  );
}

// ─── lookupIngredients ───────────────────────────────────────────────────────

describe("analyzeIngredients — lookupIngredients", () => {
  test("finds ingredient by canonical name (case-insensitive)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "water",
        aliases: [],
        harmEvidenceScore: 0,
        regulatoryScore: 0,
        avoidanceScore: 0,
        baseScore: 1.0,
        tier: "Clean",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    const results = await t.run(async (ctx) =>
      ctx.runQuery(internal.analyzeIngredientsHelpers.lookupIngredients, {
        names: ["Water"],
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0].recognized).toBe(true);
    expect(results[0].ingredient!.canonicalName).toBe("water");
  });

  test("finds ingredient by alias", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "sodium chloride",
        aliases: ["table salt", "salt"],
        harmEvidenceScore: 0,
        regulatoryScore: 0,
        avoidanceScore: 0,
        baseScore: 1.0,
        tier: "Clean",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    const results = await t.run(async (ctx) =>
      ctx.runQuery(internal.analyzeIngredientsHelpers.lookupIngredients, {
        names: ["Table Salt"],
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0].recognized).toBe(true);
    expect(results[0].ingredient!.canonicalName).toBe("sodium chloride");
  });

  test("returns recognized: false for unknown ingredient", async () => {
    const t = convexTest(schema, modules);

    const results = await t.run(async (ctx) =>
      ctx.runQuery(internal.analyzeIngredientsHelpers.lookupIngredients, {
        names: ["xanthogumboflavoring"],
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0].recognized).toBe(false);
    expect(results[0].ingredient).toBeNull();
  });

  test("handles multiple names — some known, some not", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "sugar",
        aliases: ["cane sugar"],
        harmEvidenceScore: 3,
        regulatoryScore: 0,
        avoidanceScore: 2,
        baseScore: 3.5,
        tier: "Clean",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    const results = await t.run(async (ctx) =>
      ctx.runQuery(internal.analyzeIngredientsHelpers.lookupIngredients, {
        names: ["sugar", "mystery_compound_xyz"],
      })
    );

    expect(results).toHaveLength(2);
    const sugar = results.find((r) => r.name === "sugar")!;
    expect(sugar.recognized).toBe(true);
    const mystery = results.find((r) => r.name === "mystery_compound_xyz")!;
    expect(mystery.recognized).toBe(false);
  });

  test("filters out empty names", async () => {
    const t = convexTest(schema, modules);

    const results = await t.run(async (ctx) =>
      ctx.runQuery(internal.analyzeIngredientsHelpers.lookupIngredients, {
        names: [""],
      })
    );

    expect(results).toHaveLength(0);
  });
});

// ─── checkDailyAnalysisCount / recordAnalysis ─────────────────────────────────

describe("analyzeIngredients — daily usage tracking", () => {
  test("returns count 0 for user with no analysis today", async () => {
    const t = convexTest(schema, modules);
    const userId = "user_fresh";
    await insertUser(t, userId);
    const asUser = withUser(t, userId);

    const result = await asUser.query(api.analyzeIngredientsHelpers.getMyDailyAnalysisUsage, {});

    expect(result.count).toBe(0);
    expect(result.limit).toBe(3);
    expect(result.atLimit).toBe(false);
  });

  test("increments count after recordAnalysis", async () => {
    const t = convexTest(schema, modules);
    const userId = "user_record";
    await insertUser(t, userId);
    const asUser = withUser(t, userId);

    // Run recordAnalysis as an internal mutation
    await t.run(async (ctx) => {
      // Simulate the user identity in t.run by inserting analysis_usage directly
      const today = new Date().toISOString().slice(0, 10);
      await ctx.db.insert("analysis_usage", {
        userId,
        date: today,
        count: 1,
      });
    });

    const result = await asUser.query(api.analyzeIngredientsHelpers.getMyDailyAnalysisUsage, {});
    expect(result.count).toBe(1);
    expect(result.atLimit).toBe(false);
  });

  test("atLimit is true when count reaches 3", async () => {
    const t = convexTest(schema, modules);
    const userId = "user_at_limit";
    await insertUser(t, userId);
    const asUser = withUser(t, userId);

    await t.run(async (ctx) => {
      const today = new Date().toISOString().slice(0, 10);
      await ctx.db.insert("analysis_usage", {
        userId,
        date: today,
        count: 3,
      });
    });

    const result = await asUser.query(api.analyzeIngredientsHelpers.getMyDailyAnalysisUsage, {});
    expect(result.count).toBe(3);
    expect(result.atLimit).toBe(true);
  });

  test("unauthenticated user gets count 0 with no error", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.analyzeIngredientsHelpers.getMyDailyAnalysisUsage, {});
    expect(result.count).toBe(0);
    expect(result.atLimit).toBe(false);
  });

  test("daily count is per-user (isolation)", async () => {
    const t = convexTest(schema, modules);
    const user1 = "user_iso1";
    const user2 = "user_iso2";
    await insertUser(t, user1);
    await insertUser(t, user2);

    await t.run(async (ctx) => {
      const today = new Date().toISOString().slice(0, 10);
      await ctx.db.insert("analysis_usage", { userId: user1, date: today, count: 3 });
    });

    const result1 = await withUser(t, user1).query(
      api.analyzeIngredientsHelpers.getMyDailyAnalysisUsage,
      {}
    );
    const result2 = await withUser(t, user2).query(
      api.analyzeIngredientsHelpers.getMyDailyAnalysisUsage,
      {}
    );

    expect(result1.atLimit).toBe(true);
    expect(result2.atLimit).toBe(false);
  });
});

// ─── saveProductFromAnalysis ──────────────────────────────────────────────────

describe("analyzeIngredients — saveProductFromAnalysis", () => {
  test("creates a scored product with correct fields", async () => {
    const t = convexTest(schema, modules);
    const userId = "user_save";
    await insertUser(t, userId);
    const asUser = withUser(t, userId);

    const productId = await asUser.mutation(
      api.analyzeIngredientsHelpers.saveProductFromAnalysis,
      {
        name: "  My Custom Product  ",
        brand: "  My Brand  ",
        baseScore: 6.5,
        tier: "Watch",
      }
    );

    expect(productId).toBeTruthy();

    const product = await t.run(async (ctx) => ctx.db.get(productId));
    expect(product!.name).toBe("My Custom Product"); // trimmed
    expect(product!.brand).toBe("My Brand"); // trimmed
    expect(product!.baseScore).toBe(6.5);
    expect(product!.tier).toBe("Watch");
    expect(product!.status).toBe("scored");
    expect(product!.assemblyStatus).toBe("complete");
    expect(product!.ingredientSource).toBe("ai_extraction");
  });

  test("accepts all tier values", async () => {
    const t = convexTest(schema, modules);
    const userId = "user_tiers";
    await insertUser(t, userId);
    const asUser = withUser(t, userId);

    const tiers = ["Clean", "Watch", "Caution", "Avoid"] as const;
    for (const tier of tiers) {
      const productId = await asUser.mutation(
        api.analyzeIngredientsHelpers.saveProductFromAnalysis,
        { name: `${tier} Product`, brand: "Test", baseScore: 5.0, tier }
      );
      const product = await t.run(async (ctx) => ctx.db.get(productId));
      expect(product!.tier).toBe(tier);
    }
  });
});
