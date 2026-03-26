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
    category: string;
    subcategory: string;
    price: number;
    reviewCount: number;
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
      tier: overrides.tier ?? "Clean",
      category: overrides.category,
      subcategory: overrides.subcategory,
      price: overrides.price,
      reviewCount: overrides.reviewCount,
    })
  );
}

async function addClaim(
  t: ReturnType<typeof convexTest>,
  productId: Id<"products">,
  claim: string
) {
  return t.run(async (ctx) =>
    ctx.db.insert("product_claims", {
      productId,
      claim,
      verified: true,
      source: "manual",
    })
  );
}

const PAGINATION = { numItems: 20, cursor: null };

// ============================================================
// exploreProducts — category filter
// ============================================================

describe("Epic 6 — exploreProducts: category filter", () => {
  test("returns all scored products when no filters applied", async () => {
    const t = convexTest(schema, modules);
    await insertProduct(t, { name: "Snack A", category: "snacks" });
    await insertProduct(t, { name: "Dairy B", category: "dairy" });

    const result = await t.query(api.explore.exploreProducts, {
      paginationOpts: PAGINATION,
    });
    expect(result.page.length).toBeGreaterThanOrEqual(2);
    expect(result.cappedForFree).toBe(false);
  });

  test("filters products by category", async () => {
    const t = convexTest(schema, modules);
    await insertProduct(t, { name: "Snack A", category: "snacks" });
    await insertProduct(t, { name: "Dairy B", category: "dairy" });

    const result = await t.query(api.explore.exploreProducts, {
      paginationOpts: PAGINATION,
      category: "snacks",
    });
    expect(result.page.every((p) => p.category === "snacks")).toBe(true);
    expect(result.page.some((p) => p.name === "Snack A")).toBe(true);
  });

  test("returns empty page for category with no products", async () => {
    const t = convexTest(schema, modules);
    await insertProduct(t, { name: "Snack A", category: "snacks" });

    const result = await t.query(api.explore.exploreProducts, {
      paginationOpts: PAGINATION,
      category: "frozen",
    });
    expect(result.page).toHaveLength(0);
  });
});

// ============================================================
// exploreProducts — claims filter (AND logic)
// ============================================================

describe("Epic 6 — exploreProducts: claims filter", () => {
  test("returns only products with a single claim", async () => {
    const t = convexTest(schema, modules);
    const p1 = await insertProduct(t, { name: "GF Product" });
    const p2 = await insertProduct(t, { name: "Regular Product" });
    await addClaim(t, p1, "gluten_free");

    const result = await t.query(api.explore.exploreProducts, {
      paginationOpts: PAGINATION,
      claims: ["gluten_free"],
    });
    expect(result.page.some((p) => p._id === p1)).toBe(true);
    expect(result.page.some((p) => p._id === p2)).toBe(false);
  });

  test("AND-combines two claims — returns only the intersection", async () => {
    const t = convexTest(schema, modules);
    const pBoth = await insertProduct(t, { name: "GF Vegan" });
    const pGfOnly = await insertProduct(t, { name: "GF Only" });
    const pVeganOnly = await insertProduct(t, { name: "Vegan Only" });

    await addClaim(t, pBoth, "gluten_free");
    await addClaim(t, pBoth, "vegan");
    await addClaim(t, pGfOnly, "gluten_free");
    await addClaim(t, pVeganOnly, "vegan");

    const result = await t.query(api.explore.exploreProducts, {
      paginationOpts: PAGINATION,
      claims: ["gluten_free", "vegan"],
    });
    expect(result.page).toHaveLength(1);
    expect(result.page[0]._id).toBe(pBoth);
  });

  test("returns empty when no products match all claims", async () => {
    const t = convexTest(schema, modules);
    const p1 = await insertProduct(t, { name: "GF Only" });
    await addClaim(t, p1, "gluten_free");

    const result = await t.query(api.explore.exploreProducts, {
      paginationOpts: PAGINATION,
      claims: ["gluten_free", "kosher"],
    });
    expect(result.page).toHaveLength(0);
  });

  test("combines claims + category filters", async () => {
    const t = convexTest(schema, modules);
    const p1 = await insertProduct(t, { name: "GF Snack", category: "snacks" });
    const p2 = await insertProduct(t, { name: "GF Dairy", category: "dairy" });
    await addClaim(t, p1, "gluten_free");
    await addClaim(t, p2, "gluten_free");

    const result = await t.query(api.explore.exploreProducts, {
      paginationOpts: PAGINATION,
      category: "snacks",
      claims: ["gluten_free"],
    });
    expect(result.page.some((p) => p._id === p1)).toBe(true);
    expect(result.page.some((p) => p._id === p2)).toBe(false);
  });
});

// ============================================================
// exploreProducts — free-tier cap
// ============================================================

describe("Epic 6 — exploreProducts: free-tier cap", () => {
  async function insertNProducts(t: ReturnType<typeof convexTest>, n: number) {
    for (let i = 0; i < n; i++) {
      await insertProduct(t, { name: `Product ${i}` });
    }
  }

  test("unauthenticated user gets at most 6 results with cappedForFree=true", async () => {
    const t = convexTest(schema, modules);
    await insertNProducts(t, 10);

    const result = await t.query(api.explore.exploreProducts, {
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(result.page.length).toBeLessThanOrEqual(6);
    expect(result.cappedForFree).toBe(true);
  });

  test("premium user gets all results with cappedForFree=false", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        isPremium: true,
        premiumUntil: 9_999_999_999_999,
      })
    );
    const asUser = withUser(t, userId);
    await insertNProducts(t, 10);

    const result = await asUser.query(api.explore.exploreProducts, {
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(result.cappedForFree).toBe(false);
    expect(result.page.length).toBeGreaterThan(6);
  });

  test("free user with 6 or fewer results does not get capped", async () => {
    const t = convexTest(schema, modules);
    await insertNProducts(t, 4);

    const result = await t.query(api.explore.exploreProducts, {
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(result.cappedForFree).toBe(false);
    expect(result.page.length).toBe(4);
  });
});

// ============================================================
// getExploreFilterCounts
// ============================================================

describe("Epic 6 — getExploreFilterCounts", () => {
  test("returns counts of 0 when no claims exist", async () => {
    const t = convexTest(schema, modules);
    const counts = await t.query(api.explore.getExploreFilterCounts, {});
    expect(counts["gluten_free"]).toBe(0);
    expect(counts["vegan"]).toBe(0);
  });

  test("counts products with a given claim", async () => {
    const t = convexTest(schema, modules);
    const p1 = await insertProduct(t, { name: "A" });
    const p2 = await insertProduct(t, { name: "B" });
    await addClaim(t, p1, "gluten_free");
    await addClaim(t, p2, "gluten_free");
    await addClaim(t, p1, "vegan");

    const counts = await t.query(api.explore.getExploreFilterCounts, {});
    expect(counts["gluten_free"]).toBe(2);
    expect(counts["vegan"]).toBe(1);
  });

  test("scopes counts to a category", async () => {
    const t = convexTest(schema, modules);
    const p1 = await insertProduct(t, { name: "GF Snack", category: "snacks" });
    const p2 = await insertProduct(t, { name: "GF Dairy", category: "dairy" });
    await addClaim(t, p1, "gluten_free");
    await addClaim(t, p2, "gluten_free");

    const counts = await t.query(api.explore.getExploreFilterCounts, {
      category: "snacks",
    });
    expect(counts["gluten_free"]).toBe(1);
  });
});
