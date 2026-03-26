/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const modules = import.meta.glob("../convex/**/*.ts");

function withUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ tokenIdentifier: `test|${userId}|session` });
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

async function insertIngredient(
  t: ReturnType<typeof convexTest>,
  name: string,
  tier: "Clean" | "Watch" | "Caution" | "Avoid" = "Watch"
) {
  return t.run(async (ctx) =>
    ctx.db.insert("ingredients", {
      canonicalName: name,
      aliases: [],
      harmEvidenceScore: 3,
      regulatoryScore: 3,
      avoidanceScore: 3,
      baseScore: 6,
      tier,
      scoreVersion: 1,
      scoredAt: Date.now(),
    })
  );
}

async function linkIngredient(
  t: ReturnType<typeof convexTest>,
  productId: Id<"products">,
  ingredientId: Id<"ingredients">
) {
  return t.run(async (ctx) =>
    ctx.db.insert("product_ingredients", { productId, ingredientId })
  );
}

async function insertConditionModifier(
  t: ReturnType<typeof convexTest>,
  ingredientId: Id<"ingredients">,
  condition: string,
  modifierAmount = -1,
  status: "active" | "archived" = "active"
) {
  return t.run(async (ctx) =>
    ctx.db.insert("condition_modifiers", {
      ingredientId,
      condition,
      modifierAmount,
      evidenceCitation: "test-citation",
      evidenceQuality: "moderate",
      status,
    })
  );
}

async function insertProfile(
  t: ReturnType<typeof convexTest>,
  userId: string,
  conditions: string[],
  sensitivities: string[] = []
) {
  return t.run(async (ctx) =>
    ctx.db.insert("user_profiles", {
      userId,
      conditions,
      sensitivities,
    })
  );
}

// ============================================================
// getMatchDetailsForProduct
// ============================================================

describe("Epic 7 — getMatchDetailsForProduct: unauthenticated", () => {
  test("returns null when not authenticated", async () => {
    const t = convexTest(schema, modules);
    const productId = await insertProduct(t);

    const result = await t.query(api.products.getMatchDetailsForProduct, {
      productId,
    });
    expect(result).toBeNull();
  });
});

describe("Epic 7 — getMatchDetailsForProduct: no profile", () => {
  test("returns null when user has no profile", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { isPremium: false })
    );
    const productId = await insertProduct(t);
    const asUser = withUser(t, userId);

    const result = await asUser.query(api.products.getMatchDetailsForProduct, {
      productId,
    });
    expect(result).toBeNull();
  });
});

describe("Epic 7 — getMatchDetailsForProduct: empty profile", () => {
  test("returns 0% match when profile has no conditions", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { isPremium: false })
    );
    await insertProfile(t, userId, [], []);
    const productId = await insertProduct(t);
    const asUser = withUser(t, userId);

    const result = await asUser.query(api.products.getMatchDetailsForProduct, {
      productId,
    });
    expect(result).toEqual({ matchPercentage: 0, matchedFlags: [], totalFlags: 0 });
  });
});

describe("Epic 7 — getMatchDetailsForProduct: matching conditions", () => {
  test("returns 100% when all profile conditions are matched by product ingredients", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { isPremium: false })
    );
    await insertProfile(t, userId, ["adhd"], []);

    const productId = await insertProduct(t);
    const ingredientId = await insertIngredient(t, "Red 40");
    await linkIngredient(t, productId, ingredientId);
    await insertConditionModifier(t, ingredientId, "adhd", -1);

    const asUser = withUser(t, userId);
    const result = await asUser.query(api.products.getMatchDetailsForProduct, {
      productId,
    });
    expect(result).not.toBeNull();
    expect(result!.matchPercentage).toBe(100);
    expect(result!.matchedFlags).toContain("adhd");
    expect(result!.totalFlags).toBe(1);
  });

  test("returns correct partial match when only some conditions are matched", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { isPremium: false })
    );
    // Two profile conditions: adhd + diabetes
    await insertProfile(t, userId, ["adhd", "diabetes"], []);

    const productId = await insertProduct(t);
    const ingredientId = await insertIngredient(t, "Red 40");
    await linkIngredient(t, productId, ingredientId);
    // Only "adhd" modifier — "diabetes" not matched
    await insertConditionModifier(t, ingredientId, "adhd", -1);

    const asUser = withUser(t, userId);
    const result = await asUser.query(api.products.getMatchDetailsForProduct, {
      productId,
    });
    expect(result).not.toBeNull();
    expect(result!.matchPercentage).toBe(50);
    expect(result!.matchedFlags).toContain("adhd");
    expect(result!.matchedFlags).not.toContain("diabetes");
    expect(result!.totalFlags).toBe(2);
  });

  test("returns 0% when no profile conditions match any ingredient modifiers", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { isPremium: false })
    );
    await insertProfile(t, userId, ["eczema"], []);

    const productId = await insertProduct(t);
    const ingredientId = await insertIngredient(t, "Citric Acid");
    await linkIngredient(t, productId, ingredientId);
    // No modifier for "eczema"
    await insertConditionModifier(t, ingredientId, "adhd", -1);

    const asUser = withUser(t, userId);
    const result = await asUser.query(api.products.getMatchDetailsForProduct, {
      productId,
    });
    expect(result).not.toBeNull();
    expect(result!.matchPercentage).toBe(0);
    expect(result!.matchedFlags).toHaveLength(0);
  });

  test("treats sensitivities the same as conditions in match calculation", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { isPremium: false })
    );
    // Sensitivity (not condition) in profile
    await insertProfile(t, userId, [], ["gluten"]);

    const productId = await insertProduct(t);
    const ingredientId = await insertIngredient(t, "Wheat Starch");
    await linkIngredient(t, productId, ingredientId);
    await insertConditionModifier(t, ingredientId, "gluten", -2);

    const asUser = withUser(t, userId);
    const result = await asUser.query(api.products.getMatchDetailsForProduct, {
      productId,
    });
    expect(result).not.toBeNull();
    expect(result!.matchPercentage).toBe(100);
    expect(result!.matchedFlags).toContain("gluten");
  });

  test("ignores inactive condition modifiers", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { isPremium: false })
    );
    await insertProfile(t, userId, ["adhd"], []);

    const productId = await insertProduct(t);
    const ingredientId = await insertIngredient(t, "Red 40");
    await linkIngredient(t, productId, ingredientId);
    // Archived modifier — should not count
    await insertConditionModifier(t, ingredientId, "adhd", -1, "archived");

    const asUser = withUser(t, userId);
    const result = await asUser.query(api.products.getMatchDetailsForProduct, {
      productId,
    });
    expect(result).not.toBeNull();
    expect(result!.matchPercentage).toBe(0);
    expect(result!.matchedFlags).toHaveLength(0);
  });
});
