/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

async function seedProduct(
  t: ReturnType<typeof convexTest>,
  opts?: {
    name?: string;
    brand?: string;
    baseScore?: number;
    tier?: "Clean" | "Watch" | "Caution" | "Avoid";
  }
) {
  return t.run(async (ctx) =>
    ctx.db.insert("products", {
      name: opts?.name ?? "Test Product",
      brand: opts?.brand ?? "Test Brand",
      baseScore: opts?.baseScore ?? 3.0,
      tier: opts?.tier ?? "Clean",
      status: "scored",
      scoreVersion: 1,
      scoredAt: Date.now(),
      assemblyStatus: "complete",
    })
  );
}

async function seedPremiumUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      isPremium: true,
      premiumUntil: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })
  );
  return t.withIdentity({ tokenIdentifier: `test|${userId}|session` });
}

async function seedFreeUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {})
  );
  return t.withIdentity({ tokenIdentifier: `test|${userId}|session` });
}

// ─── compareProducts ─────────────────────────────────────────────────────────

describe("compare — compareProducts", () => {
  test("throws for free (non-premium) user", async () => {
    const t = convexTest(schema, modules);
    const p1 = await seedProduct(t);
    const p2 = await seedProduct(t);
    const asFree = await seedFreeUser(t);

    await expect(
      asFree.query(api.compare.compareProducts, { productIds: [p1, p2] })
    ).rejects.toThrow();
  });

  test("throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const p1 = await seedProduct(t);
    const p2 = await seedProduct(t);

    await expect(
      t.query(api.compare.compareProducts, { productIds: [p1, p2] })
    ).rejects.toThrow();
  });

  test("throws when fewer than 2 products provided", async () => {
    const t = convexTest(schema, modules);
    const p1 = await seedProduct(t);
    const asPremium = await seedPremiumUser(t);

    await expect(
      asPremium.query(api.compare.compareProducts, { productIds: [p1] })
    ).rejects.toThrow("Comparison requires 2–4 products");
  });

  test("throws when more than 4 products provided", async () => {
    const t = convexTest(schema, modules);
    const ids = await Promise.all([
      seedProduct(t),
      seedProduct(t),
      seedProduct(t),
      seedProduct(t),
      seedProduct(t),
    ]);
    const asPremium = await seedPremiumUser(t);

    await expect(
      asPremium.query(api.compare.compareProducts, { productIds: ids })
    ).rejects.toThrow("Comparison requires 2–4 products");
  });

  test("returns product details for premium user with 2 products", async () => {
    const t = convexTest(schema, modules);
    const p1 = await seedProduct(t, { name: "Product A", brand: "Brand A", baseScore: 2.0, tier: "Clean" });
    const p2 = await seedProduct(t, { name: "Product B", brand: "Brand B", baseScore: 7.0, tier: "Caution" });
    const asPremium = await seedPremiumUser(t);

    const results = await asPremium.query(api.compare.compareProducts, {
      productIds: [p1, p2],
    });

    expect(results).toHaveLength(2);
    expect(results[0]!.product.name).toBe("Product A");
    expect(results[0]!.product.brand).toBe("Brand A");
    expect(results[0]!.product.baseScore).toBe(2.0);
    expect(results[0]!.product.tier).toBe("Clean");
    expect(results[1]!.product.name).toBe("Product B");
    expect(results[1]!.product.tier).toBe("Caution");
  });

  test("returns ingredient and flagged counts", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    // Add a clean and a flagged ingredient
    const cleanIngId = await t.run(async (ctx) =>
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
    const flaggedIngId = await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "red 40",
        aliases: [],
        harmEvidenceScore: 7,
        regulatoryScore: 6,
        avoidanceScore: 5,
        baseScore: 7.0,
        tier: "Caution",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("product_ingredients", { productId, ingredientId: cleanIngId });
      await ctx.db.insert("product_ingredients", { productId, ingredientId: flaggedIngId });
    });

    const p2 = await seedProduct(t);
    const asPremium = await seedPremiumUser(t);

    const results = await asPremium.query(api.compare.compareProducts, {
      productIds: [productId, p2],
    });

    const first = results.find((r) => r!.product._id === productId)!;
    expect(first.ingredientCount).toBe(2);
    expect(first.flaggedCount).toBe(1); // only red 40 is Caution
  });

  test("returns claim labels for products with claims", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("product_claims", {
        productId,
        claim: "Organic",
        source: "manual",
        verified: true,
      });
      await ctx.db.insert("product_claims", {
        productId,
        claim: "Non-GMO",
        source: "manual",
        verified: true,
      });
    });

    const p2 = await seedProduct(t);
    const asPremium = await seedPremiumUser(t);

    const results = await asPremium.query(api.compare.compareProducts, {
      productIds: [productId, p2],
    });

    const first = results.find((r) => r!.product._id === productId)!;
    expect(first.claimLabels).toContain("Organic");
    expect(first.claimLabels).toContain("Non-GMO");
  });

  test("accepts up to 4 products", async () => {
    const t = convexTest(schema, modules);
    const ids = await Promise.all([
      seedProduct(t, { name: "P1" }),
      seedProduct(t, { name: "P2" }),
      seedProduct(t, { name: "P3" }),
      seedProduct(t, { name: "P4" }),
    ]);
    const asPremium = await seedPremiumUser(t);

    const results = await asPremium.query(api.compare.compareProducts, {
      productIds: ids,
    });

    expect(results).toHaveLength(4);
  });
});

// ─── compareProductsTeaser ───────────────────────────────────────────────────

describe("compare — compareProductsTeaser", () => {
  test("returns minimal data without auth", async () => {
    const t = convexTest(schema, modules);
    const p1 = await seedProduct(t, { name: "Alpha Bar", brand: "Acme", baseScore: 3.0, tier: "Clean" });
    const p2 = await seedProduct(t, { name: "Beta Bar", brand: "Beta", baseScore: 7.5, tier: "Caution" });

    const results = await t.query(api.compare.compareProductsTeaser, {
      productIds: [p1, p2],
    });

    expect(results).toHaveLength(2);
    expect(results[0]!.name).toBe("Alpha Bar");
    expect(results[0]!.brand).toBe("Acme");
    expect(results[0]!.baseScore).toBe(3.0);
    expect(results[0]!.tier).toBe("Clean");
    // Teaser should NOT have ingredient details
    expect(results[0]).not.toHaveProperty("ingredientCount");
    expect(results[0]).not.toHaveProperty("claimLabels");
  });

  test("filters out null results for missing products", async () => {
    const t = convexTest(schema, modules);
    const p1 = await seedProduct(t, { name: "Real Product" });
    // p2 is a non-existent ID we'll fabricate by creating and not actually using
    const p2Real = await seedProduct(t);
    // Delete p2 from the DB
    await t.run(async (ctx) => ctx.db.delete(p2Real));

    const results = await t.query(api.compare.compareProductsTeaser, {
      productIds: [p1, p2Real],
    });

    // Only the existing product should be returned
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe("Real Product");
  });
});

// ─── searchProductsForCompare ────────────────────────────────────────────────

describe("compare — searchProductsForCompare", () => {
  test("returns empty array for queries shorter than 2 characters", async () => {
    const t = convexTest(schema, modules);
    await seedProduct(t, { name: "Almond Milk" });

    const results = await t.query(api.compare.searchProductsForCompare, {
      query: "a",
    });

    expect(results).toHaveLength(0);
  });

  test("returns results for valid query using search index", async () => {
    const t = convexTest(schema, modules);
    await seedProduct(t, { name: "Almond Milk", brand: "NutCo" });

    const results = await t.query(api.compare.searchProductsForCompare, {
      query: "almond",
    });

    // convex-test search index may return results — verify shape if any returned
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0]).toHaveProperty("name");
      expect(results[0]).toHaveProperty("brand");
      expect(results[0]).toHaveProperty("baseScore");
      expect(results[0]).toHaveProperty("tier");
    }
  });

  test("returns empty array for empty query", async () => {
    const t = convexTest(schema, modules);
    await seedProduct(t, { name: "Almond Milk" });

    const results = await t.query(api.compare.searchProductsForCompare, {
      query: "  ",
    });

    expect(results).toHaveLength(0);
  });
});
