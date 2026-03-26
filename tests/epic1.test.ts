import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

// convex-test needs import.meta.glob to discover all Convex function modules.
const modules = import.meta.glob("../convex/**/*.ts");

// Helper: seed a scored product and return its Id.
async function seedProduct(t: ReturnType<typeof convexTest>, opts?: { tier?: string; baseScore?: number }) {
  return await t.run(async (ctx) =>
    ctx.db.insert("products", {
      name: "Test Product",
      brand: "Test Brand",
      baseScore: opts?.baseScore ?? 2.5,
      tier: (opts?.tier ?? "Clean") as "Clean" | "Watch" | "Caution" | "Avoid",
      status: "scored",
      scoreVersion: 1,
      scoredAt: Date.now(),
    })
  );
}

// Helper: create an admin user with auth identity.
async function setupAdmin(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", { isAdmin: true })
  );
  return t.withIdentity({ tokenIdentifier: `test|${userId}|session` });
}

// Helper: create a regular user with auth identity.
function setupUser(t: ReturnType<typeof convexTest>, tokenSuffix = "user1") {
  return t.withIdentity({ tokenIdentifier: `test|${tokenSuffix}|session` });
}

// ─── Pantry ───────────────────────────────────────────────────────────────────

describe("Epic 1 — Pantry", () => {
  test("addToPantry creates an entry", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const asUser = setupUser(t);

    const id = await asUser.mutation(api.pantry.addToPantry, { productId });
    expect(id).toBeTruthy();
  });

  test("addToPantry is idempotent — second call returns same id", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const asUser = setupUser(t);

    const id1 = await asUser.mutation(api.pantry.addToPantry, { productId });
    const id2 = await asUser.mutation(api.pantry.addToPantry, { productId });
    expect(id1).toBe(id2);
  });

  test("isInPantry returns true after adding, false after removing", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const asUser = setupUser(t);

    expect(await asUser.query(api.pantry.isInPantry, { productId })).toBe(false);

    await asUser.mutation(api.pantry.addToPantry, { productId });
    expect(await asUser.query(api.pantry.isInPantry, { productId })).toBe(true);

    await asUser.mutation(api.pantry.removeFromPantry, { productId });
    expect(await asUser.query(api.pantry.isInPantry, { productId })).toBe(false);
  });

  test("getPantryStats returns correct counts and average score", async () => {
    const t = convexTest(schema, modules);
    const p1 = await seedProduct(t, { tier: "Clean", baseScore: 2.0 });
    const p2 = await seedProduct(t, { tier: "Watch", baseScore: 6.0 });
    const asUser = setupUser(t);

    await asUser.mutation(api.pantry.addToPantry, { productId: p1 });
    await asUser.mutation(api.pantry.addToPantry, { productId: p2 });

    const stats = await asUser.query(api.pantry.getPantryStats, {});
    expect(stats).not.toBeNull();
    expect(stats!.totalItems).toBe(2);
    expect(stats!.tierBreakdown.Clean).toBe(1);
    expect(stats!.tierBreakdown.Watch).toBe(1);
    expect(stats!.averageScore).toBeCloseTo(4.0);
  });

  test("getPantryStats returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const stats = await t.query(api.pantry.getPantryStats, {});
    expect(stats).toBeNull();
  });

  test("getMyPantry returns products with details", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    const asUser = setupUser(t);

    await asUser.mutation(api.pantry.addToPantry, { productId });
    const pantry = await asUser.query(api.pantry.getMyPantry, {});

    expect(pantry).toHaveLength(1);
    expect(pantry[0].product).not.toBeNull();
    expect(pantry[0].product!.name).toBe("Test Product");
  });
});

// ─── Check-ins ────────────────────────────────────────────────────────────────

describe("Epic 1 — Check-ins", () => {
  test("logCheckin creates a new entry", async () => {
    const t = convexTest(schema, modules);
    const asUser = setupUser(t);

    const id = await asUser.mutation(api.checkins.logCheckin, {
      date: "2026-03-26",
      mood: 4,
    });
    expect(id).toBeTruthy();
  });

  test("logCheckin upserts — same day call updates mood", async () => {
    const t = convexTest(schema, modules);
    const asUser = setupUser(t);

    await asUser.mutation(api.checkins.logCheckin, { date: "2026-03-26", mood: 3 });
    await asUser.mutation(api.checkins.logCheckin, { date: "2026-03-26", mood: 5 });

    const result = await t.run(async (ctx) => {
      return ctx.db
        .query("daily_checkins")
        .collect();
    });
    expect(result).toHaveLength(1);
    expect(result[0].mood).toBe(5);
  });

  test("logCheckin throws for mood out of range", async () => {
    const t = convexTest(schema, modules);
    const asUser = setupUser(t);

    await expect(
      asUser.mutation(api.checkins.logCheckin, { date: "2026-03-26", mood: 6 })
    ).rejects.toThrow("Mood must be between 1 and 5");
  });

  test("getTodayCheckin returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.checkins.getTodayCheckin, {});
    expect(result).toBeNull();
  });
});

// ─── Premium helpers ──────────────────────────────────────────────────────────

describe("Epic 1 — Admin Premium Management", () => {
  test("grantPremium sets all required fields correctly (30 days)", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await setupAdmin(t);

    // Create a target user
    const targetId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "user@test.com" })
    );

    const before = Date.now();
    await asAdmin.mutation(api.adminUsers.grantPremium, {
      userId: targetId,
      durationDays: 30,
    });
    const after = Date.now();

    const user = await t.run(async (ctx) => ctx.db.get(targetId));
    expect(user!.isPremium).toBe(true);
    expect(user!.isComplimentary).toBe(true);
    expect(user!.subscriptionStatus).toBe("active");
    expect(user!.premiumUntil).toBeGreaterThanOrEqual(before + 30 * 86_400_000 - 1000);
    expect(user!.premiumUntil).toBeLessThanOrEqual(after + 30 * 86_400_000 + 1000);
  });

  test("grantPremium with null durationDays sets sentinel premiumUntil", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await setupAdmin(t);

    const targetId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "vip@test.com" })
    );

    await asAdmin.mutation(api.adminUsers.grantPremium, {
      userId: targetId,
      durationDays: null,
    });

    const user = await t.run(async (ctx) => ctx.db.get(targetId));
    expect(user!.premiumUntil).toBe(9_999_999_999_999);
  });

  test("revokePremium on complimentary account sets isPremium=false", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await setupAdmin(t);

    const targetId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "comp@test.com",
        isPremium: true,
        isComplimentary: true,
        premiumUntil: Date.now() + 86_400_000,
        subscriptionStatus: "active",
      })
    );

    await asAdmin.mutation(api.adminUsers.revokePremium, { userId: targetId });

    const user = await t.run(async (ctx) => ctx.db.get(targetId));
    expect(user!.isPremium).toBe(false);
    expect(user!.subscriptionStatus).toBe("canceled");
  });

  test("revokePremium throws on non-complimentary account", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await setupAdmin(t);

    const targetId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "stripe@test.com",
        isPremium: true,
        isComplimentary: false,
        premiumUntil: Date.now() + 86_400_000,
        subscriptionStatus: "active",
      })
    );

    await expect(
      asAdmin.mutation(api.adminUsers.revokePremium, { userId: targetId })
    ).rejects.toThrow("not a complimentary account");
  });

  test("searchByEmail returns user with correct status fields", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await setupAdmin(t);

    await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "find-me@test.com",
        name: "Test User",
        isPremium: true,
        premiumUntil: Date.now() + 86_400_000,
        isComplimentary: true,
        subscriptionStatus: "active",
      })
    );

    const result = await asAdmin.query(api.adminUsers.searchByEmail, {
      email: "find-me@test.com",
    });

    expect(result).not.toBeNull();
    expect(result!.email).toBe("find-me@test.com");
    expect(result!.isPremium).toBe(true);
    expect(result!.isComplimentary).toBe(true);
  });

  test("searchByEmail returns null for unknown email", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await setupAdmin(t);

    const result = await asAdmin.query(api.adminUsers.searchByEmail, {
      email: "nobody@test.com",
    });
    expect(result).toBeNull();
  });

  test("listComplimentary returns only isComplimentary users", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await setupAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "comp1@test.com",
        isComplimentary: true,
        isPremium: true,
        premiumUntil: Date.now() + 86_400_000,
      });
      await ctx.db.insert("users", {
        email: "free@test.com",
        isComplimentary: false,
      });
    });

    const result = await asAdmin.query(api.adminUsers.listComplimentary, {});
    expect(result.length).toBe(1);
    expect(result[0].email).toBe("comp1@test.com");
  });
});

// ─── browseProducts ───────────────────────────────────────────────────────────

describe("Epic 1 — browseProducts", () => {
  test("browseProducts returns paginated results", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("products", {
          name: `Product ${i}`,
          brand: "Brand",
          baseScore: 2.0,
          tier: "Clean",
          status: "scored",
          scoreVersion: 1,
          scoredAt: Date.now(),
        });
      }
    });

    const result = await t.query(api.products.browseProducts, {
      paginationOpts: { numItems: 3, cursor: null },
    });

    expect(result.page).toHaveLength(3);
    expect(result.isDone).toBe(false);
  });

  test("browseProducts filters by category", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("products", {
        name: "Snack A",
        brand: "Brand",
        baseScore: 3.0,
        tier: "Clean",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
        category: "snacks",
      });
      await ctx.db.insert("products", {
        name: "Dairy B",
        brand: "Brand",
        baseScore: 4.0,
        tier: "Watch",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
        category: "dairy",
      });
    });

    const result = await t.query(api.products.browseProducts, {
      paginationOpts: { numItems: 10, cursor: null },
      category: "snacks",
    });

    expect(result.page).toHaveLength(1);
    expect(result.page[0].name).toBe("Snack A");
  });

  test("getProductClaims returns claims for a product", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("product_claims", {
        productId,
        claim: "gluten_free",
        verified: true,
        source: "manual",
      });
      await ctx.db.insert("product_claims", {
        productId,
        claim: "usda_organic",
        verified: false,
        source: "ai_extraction",
      });
    });

    const claims = await t.query(api.products.getProductClaims, { productId });
    expect(claims).toHaveLength(2);
    expect(claims.map((c) => c.claim)).toContain("gluten_free");
  });
});
