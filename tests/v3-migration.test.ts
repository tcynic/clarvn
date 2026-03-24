/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

// Helper: create an authenticated user identity
function withUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ tokenIdentifier: `test|${userId}|session` });
}

// Helper: insert an admin user and return a withIdentity context.
async function setupAdmin(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", { isAdmin: true })
  );
  return t.withIdentity({ tokenIdentifier: `test|${userId}|session` });
}

// ============================================================
// User Profiles
// ============================================================

describe("Epic 1 — createOrUpdateProfile", () => {
  test("creates a new profile on first call", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {})
    );
    const asUser = withUser(t, userId);

    const profileId = await asUser.mutation(
      api.userProfiles.createOrUpdateProfile,
      {
        motivation: "General health",
        conditions: ["ADHD"],
        sensitivities: ["Migraines"],
      }
    );

    expect(profileId).toBeTruthy();

    const profile = await asUser.query(api.userProfiles.getMyProfile, {});
    expect(profile).not.toBeNull();
    expect(profile?.motivation).toBe("General health");
    expect(profile?.conditions).toEqual(["ADHD"]);
    expect(profile?.sensitivities).toEqual(["Migraines"]);
  });

  test("updates an existing profile on second call (upsert)", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {})
    );
    const asUser = withUser(t, userId);

    await asUser.mutation(api.userProfiles.createOrUpdateProfile, {
      motivation: "General health",
      conditions: ["ADHD"],
      sensitivities: [],
    });

    await asUser.mutation(api.userProfiles.createOrUpdateProfile, {
      motivation: "Kids",
      conditions: ["ADHD", "IBS"],
      sensitivities: ["Migraines"],
    });

    const profile = await asUser.query(api.userProfiles.getMyProfile, {});
    expect(profile?.motivation).toBe("Kids");
    expect(profile?.conditions).toEqual(["ADHD", "IBS"]);
    expect(profile?.sensitivities).toEqual(["Migraines"]);

    // Verify only one profile exists (not two)
    const allProfiles = await t.run(async (ctx) =>
      ctx.db.query("user_profiles").collect()
    );
    expect(allProfiles).toHaveLength(1);
  });

  test("unauthenticated call throws", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.userProfiles.createOrUpdateProfile, {
        conditions: ["ADHD"],
        sensitivities: [],
      })
    ).rejects.toThrow();
  });

  test("getMyProfile returns null for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.userProfiles.getMyProfile, {});
    expect(result).toBeNull();
  });
});

// ============================================================
// Ingredient Queue
// ============================================================

describe("Epic 1 — addToIngredientQueue", () => {
  test("inserts a new entry", async () => {
    const t = convexTest(schema, modules);

    const id = await t.mutation(api.ingredientQueue.addToIngredientQueue, {
      canonicalName: "Red No. 40",
      priority: 1,
    });

    expect(id).toBeTruthy();

    const entry = await t.run(async (ctx) => ctx.db.get(id));
    expect(entry?.canonicalName).toBe("Red No. 40");
    expect(entry?.status).toBe("pending");
    expect(entry?.requestCount).toBe(1);
    expect(entry?.blockedProductIds).toEqual([]);
  });

  test("deduplicates: second call increments requestCount", async () => {
    const t = convexTest(schema, modules);

    const id1 = await t.mutation(api.ingredientQueue.addToIngredientQueue, {
      canonicalName: "BHT",
      priority: 2,
    });

    const id2 = await t.mutation(api.ingredientQueue.addToIngredientQueue, {
      canonicalName: "BHT",
      priority: 1,
    });

    // Same entry returned
    expect(id1).toBe(id2);

    const entry = await t.run(async (ctx) => ctx.db.get(id1));
    expect(entry?.requestCount).toBe(2);
    // Priority escalated to minimum
    expect(entry?.priority).toBe(1);
  });

  test("appends blockedProductId on dedup", async () => {
    const t = convexTest(schema, modules);

    const productA = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Product A",
        brand: "Brand",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    const productB = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Product B",
        brand: "Brand",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    await t.mutation(api.ingredientQueue.addToIngredientQueue, {
      canonicalName: "Sodium Benzoate",
      priority: 1,
      blockedProductId: productA,
    });

    const id = await t.mutation(api.ingredientQueue.addToIngredientQueue, {
      canonicalName: "Sodium Benzoate",
      priority: 1,
      blockedProductId: productB,
    });

    const entry = await t.run(async (ctx) => ctx.db.get(id));
    expect(entry?.blockedProductIds).toHaveLength(2);
    expect(entry?.blockedProductIds).toContain(productA);
    expect(entry?.blockedProductIds).toContain(productB);
  });

  test("listIngredientQueue requires admin", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.query(api.ingredientQueue.listIngredientQueue, {})
    ).rejects.toThrow();
  });

  test("listIngredientQueue returns entries for admin", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await setupAdmin(t);

    await t.mutation(api.ingredientQueue.addToIngredientQueue, {
      canonicalName: "Red No. 40",
      priority: 1,
    });

    await t.mutation(api.ingredientQueue.addToIngredientQueue, {
      canonicalName: "BHT",
      priority: 2,
    });

    const entries = await asAdmin.query(
      api.ingredientQueue.listIngredientQueue,
      { status: "pending" }
    );

    expect(entries).toHaveLength(2);
  });
});

// ============================================================
// Schema backward compat: products with optional baseScore/tier
// ============================================================

describe("Epic 1 — Products with optional baseScore/tier", () => {
  test("product can be inserted without baseScore or tier", async () => {
    const t = convexTest(schema, modules);

    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Pending Product",
        brand: "Brand",
        status: "scored",
        scoreVersion: 0,
        scoredAt: Date.now(),
        assemblyStatus: "pending_ingredients",
        pendingIngredientCount: 3,
      })
    );

    const product = await t.query(api.products.getProduct, {
      name: "Pending Product",
    });

    expect(product).not.toBeNull();
    expect(product?.baseScore).toBeUndefined();
    expect(product?.tier).toBeUndefined();
    expect(product?.assemblyStatus).toBe("pending_ingredients");
    expect(product?.pendingIngredientCount).toBe(3);
  });

  test("product with baseScore and tier still works", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Froot Loops",
        brand: "Kellogg's",
        baseScore: 4.5,
        tier: "Watch",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
        assemblyStatus: "complete",
        pendingIngredientCount: 0,
      })
    );

    const product = await t.query(api.products.getProduct, {
      name: "Froot Loops",
    });

    expect(product?.baseScore).toBe(4.5);
    expect(product?.tier).toBe("Watch");
    expect(product?.assemblyStatus).toBe("complete");
  });
});
