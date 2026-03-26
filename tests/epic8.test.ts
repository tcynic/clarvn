/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

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
    ctx.db.insert("users", {
      name: "Test User",
      email: "test@example.com",
      ...overrides,
    } as never)
  );
}

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
      baseScore: overrides.baseScore ?? 7.5,
      tier: overrides.tier ?? "Watch",
    })
  );
}

// ──────────────────────────────────────────
// Story 8.4 — Trial Mechanics
// ──────────────────────────────────────────
describe("Story 8.4 — Trial Mechanics", () => {
  test("isPremiumUser returns false for fresh user", async () => {
    const t = convexTest(schema, modules);
    const userId = "user1";
    await insertUser(t, userId);

    const result = await withUser(t, userId).query(
      api.userProfiles.getSubscriptionStatus,
      {}
    );
    expect(result?.isPremium).toBe(false);
  });

  test("startTrial sets isPremium, trialing status, premiumUntil", async () => {
    const t = convexTest(schema, modules);
    const userId = "user1";
    await insertUser(t, userId);

    await withUser(t, userId).mutation(api.users.startTrial, {});

    const user = await t.run(async (ctx) =>
      ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("name"), "Test User"))
        .first()
    );
    expect(user?.isPremium).toBe(true);
    expect(user?.subscriptionStatus).toBe("trialing");
    expect(user?.premiumUntil).toBeGreaterThan(Date.now());
    expect(user?.planTier).toBe("premium");
  });

  test("startTrial throws if user already trialing", async () => {
    const t = convexTest(schema, modules);
    const userId = "user1";
    await insertUser(t, userId);
    await withUser(t, userId).mutation(api.users.startTrial, {});

    await expect(
      withUser(t, userId).mutation(api.users.startTrial, {})
    ).rejects.toThrow();
  });

  test("startTrial throws if user previously canceled trial", async () => {
    const t = convexTest(schema, modules);
    const userId = "user1";
    await insertUser(t, userId, {
      isPremium: false,
      subscriptionStatus: "canceled",
    });

    await expect(
      withUser(t, userId).mutation(api.users.startTrial, {})
    ).rejects.toThrow();
  });

  test("expireTrials downgrades users with expired premiumUntil", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "user1", {
      isPremium: true,
      subscriptionStatus: "trialing",
      premiumUntil: Date.now() - 1000, // already expired
    });

    await t.mutation(internal.users.expireTrials, {});

    const user = await t.run(async (ctx) =>
      ctx.db.query("users").first()
    );
    expect(user?.isPremium).toBe(false);
    expect(user?.subscriptionStatus).toBe("canceled");
  });

  test("expireTrials leaves non-expired trials alone", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "user1", {
      isPremium: true,
      subscriptionStatus: "trialing",
      premiumUntil: Date.now() + 10 * 86400000, // 10 days from now
    });

    await t.mutation(internal.users.expireTrials, {});

    const user = await t.run(async (ctx) =>
      ctx.db.query("users").first()
    );
    expect(user?.isPremium).toBe(true);
    expect(user?.subscriptionStatus).toBe("trialing");
  });
});

// ──────────────────────────────────────────
// Story 8.1 — Pantry Limit (Gate 5)
// ──────────────────────────────────────────
describe("Story 8.1 — Pantry Limit (Gate 5)", () => {
  test("free user cannot add 11th pantry item", async () => {
    const t = convexTest(schema, modules);
    const userId = "user1";
    await insertUser(t, userId, { isPremium: false });

    // Add 10 products to pantry
    const productIds: Id<"products">[] = [];
    for (let i = 0; i < 10; i++) {
      const id = await insertProduct(t, { name: `Product ${i}` });
      productIds.push(id);
      await t.run(async (ctx) =>
        ctx.db.insert("pantry_items", {
          userId: `test|${userId}|session`,
          productId: id,
          addedAt: Date.now(),
        })
      );
    }

    // 11th add should fail
    const product11 = await insertProduct(t, { name: "Product 11" });
    await expect(
      withUser(t, userId).mutation(api.pantry.addToPantry, {
        productId: product11,
      })
    ).rejects.toThrow();
  });

  test("premium user can add more than 10 pantry items", async () => {
    const t = convexTest(schema, modules);
    const userId = "user1";
    await insertUser(t, userId, {
      isPremium: true,
      premiumUntil: Date.now() + 14 * 86400000,
    });

    for (let i = 0; i < 10; i++) {
      const id = await insertProduct(t, { name: `Product ${i}` });
      await t.run(async (ctx) =>
        ctx.db.insert("pantry_items", {
          userId: `test|${userId}|session`,
          productId: id,
          addedAt: Date.now(),
        })
      );
    }

    const product11 = await insertProduct(t, { name: "Product 11" });
    await expect(
      withUser(t, userId).mutation(api.pantry.addToPantry, {
        productId: product11,
      })
    ).resolves.not.toThrow();
  });
});

// ──────────────────────────────────────────
// Story 8.3 — Analysis Daily Cap
// ──────────────────────────────────────────
describe("Story 8.3 — Analysis Daily Cap", () => {
  test("getMyDailyAnalysisUsage returns 0 for fresh user", async () => {
    const t = convexTest(schema, modules);
    const userId = "user1";
    await insertUser(t, userId);

    const usage = await withUser(t, userId).query(
      api.analyzeIngredientsHelpers.getMyDailyAnalysisUsage,
      {}
    );
    expect(usage.count).toBe(0);
    expect(usage.atLimit).toBe(false);
  });

  test("recordAnalysis increments daily count", async () => {
    const t = convexTest(schema, modules);
    const userId = "user1";
    await insertUser(t, userId);

    await withUser(t, userId).run(async (ctx) => {
      await ctx.runMutation(internal.analyzeIngredientsHelpers.recordAnalysis, {});
      await ctx.runMutation(internal.analyzeIngredientsHelpers.recordAnalysis, {});
    });

    const usage = await withUser(t, userId).query(
      api.analyzeIngredientsHelpers.getMyDailyAnalysisUsage,
      {}
    );
    expect(usage.count).toBe(2);
  });

  test("atLimit is true at 3 analyses for free user", async () => {
    const t = convexTest(schema, modules);
    const userId = "user1";
    await insertUser(t, userId, { isPremium: false });

    const today = new Date().toISOString().slice(0, 10);
    await t.run(async (ctx) =>
      ctx.db.insert("analysis_usage", {
        userId: `test|${userId}|session`,
        date: today,
        count: 3,
      })
    );

    const usage = await withUser(t, userId).query(
      api.analyzeIngredientsHelpers.getMyDailyAnalysisUsage,
      {}
    );
    expect(usage.atLimit).toBe(true);
  });
});

// ──────────────────────────────────────────
// Story 8.2 — Compare Products Teaser
// ──────────────────────────────────────────
describe("Story 8.2 — compareProductsTeaser", () => {
  test("returns teaser data for valid product IDs", async () => {
    const t = convexTest(schema, modules);
    const id1 = await insertProduct(t, { name: "Product A", brand: "Brand A" });
    const id2 = await insertProduct(t, { name: "Product B", brand: "Brand B" });

    const result = await t.query(api.compare.compareProductsTeaser, {
      productIds: [id1, id2],
    });
    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("Product A");
    expect(result[1]?.name).toBe("Product B");
  });
});

// ──────────────────────────────────────────
// Pure function: calculateProductScore
// ──────────────────────────────────────────
describe("calculateProductScore", () => {
  test("empty array returns 1.0", async () => {
    const { calculateProductScore } = await import("../convex/assembly");
    const { baseScore } = calculateProductScore([]);
    expect(baseScore).toBe(1.0);
  });

  test("single ingredient: score equals ingredient score", async () => {
    const { calculateProductScore } = await import("../convex/assembly");
    const { baseScore } = calculateProductScore([5.0]);
    expect(baseScore).toBe(5.0);
  });

  test("multiple ingredients: worst + penalties", async () => {
    const { calculateProductScore } = await import("../convex/assembly");
    // worst = 8.0, second = 6.0 → penalty = 0.1 + (6.0-4.0)*0.1 = 0.3
    const { baseScore } = calculateProductScore([8.0, 6.0]);
    expect(baseScore).toBeCloseTo(8.3);
  });

  test("score is capped at 10.0", async () => {
    const { calculateProductScore } = await import("../convex/assembly");
    const { baseScore } = calculateProductScore([10.0, 10.0, 10.0, 10.0]);
    expect(baseScore).toBeLessThanOrEqual(10.0);
  });
});
