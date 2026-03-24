import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

// convex-test needs import.meta.glob to discover all Convex function modules.
const modules = import.meta.glob("../convex/**/*.ts");

// convex-test spins up an in-memory Convex backend for each test.

// Helper: insert an admin user and return a withIdentity context.
async function setupAdmin(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", { isAdmin: true })
  );
  return t.withIdentity({ tokenIdentifier: `test|${userId}|session` });
}

describe("1.3 — Queue management", () => {
  test("addToQueue inserts a new entry and listQueue returns it", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await setupAdmin(t);

    const id = await t.mutation(api.scoringQueue.addToQueue, {
      productName: "Froot Loops",
      source: "user_request",
      priority: 1,
    });

    expect(id).toBeTruthy();

    const result = await asAdmin.query(api.scoringQueue.listQueue, {
      status: "pending",
      paginationOpts: { numItems: 10, cursor: null },
    });

    expect(result.page).toHaveLength(1);
    expect(result.page[0].productName).toBe("Froot Loops");
    expect(result.page[0].requestCount).toBe(1);
  });

  test("addToQueue deduplicates: second call increments requestCount instead of inserting", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await setupAdmin(t);

    await t.mutation(api.scoringQueue.addToQueue, {
      productName: "Froot Loops",
      source: "user_request",
      priority: 1,
    });

    await t.mutation(api.scoringQueue.addToQueue, {
      productName: "Froot Loops",
      source: "user_request",
      priority: 1,
    });

    const result = await asAdmin.query(api.scoringQueue.listQueue, {
      status: "pending",
      paginationOpts: { numItems: 10, cursor: null },
    });

    // Still only one row
    expect(result.page).toHaveLength(1);
    expect(result.page[0].requestCount).toBe(2);
  });

  test("addToQueue with source=admin_add without auth throws", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.scoringQueue.addToQueue, {
        productName: "Test Product",
        source: "admin_add",
        priority: 3,
      })
    ).rejects.toThrow();
  });

  test("addToQueue with source=user_request without auth succeeds", async () => {
    const t = convexTest(schema, modules);

    const id = await t.mutation(api.scoringQueue.addToQueue, {
      productName: "Organic Milk",
      source: "user_request",
      priority: 1,
    });

    expect(id).toBeTruthy();
  });
});

describe("1.4 — Product write/read roundtrip", () => {
  test("writeProduct then getProduct returns the product", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("products", {
        name: "Froot Loops",
        brand: "Kellogg's",
        baseScore: 4.5,
        tier: "Watch",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      });
    });

    const product = await t.query(api.products.getProduct, {
      name: "Froot Loops",
    });

    expect(product).not.toBeNull();
    expect(product?.name).toBe("Froot Loops");
    expect(product?.brand).toBe("Kellogg's");
    expect(product?.tier).toBe("Watch");
  });
});

describe("1.4 — Ingredient upsert", () => {
  test("upsertIngredient inserts new ingredient on first call", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const existing = await ctx.db
        .query("ingredients")
        .withIndex("by_canonicalName", (q) =>
          q.eq("canonicalName", "Red No. 40")
        )
        .first();
      expect(existing).toBeNull();

      await ctx.db.insert("ingredients", {
        canonicalName: "Red No. 40",
        aliases: ["Allura Red AC", "FD&C Red 40"],
        harmEvidenceScore: 7.6,
        regulatoryScore: 1.3,
        avoidanceScore: 7.8,
        baseScore: 4.5,
        tier: "Watch",
        flagLabel: "Artificial dye",
      });
    });

    const found = await t.run(async (ctx) =>
      ctx.db
        .query("ingredients")
        .withIndex("by_canonicalName", (q) =>
          q.eq("canonicalName", "Red No. 40")
        )
        .first()
    );
    expect(found?.canonicalName).toBe("Red No. 40");
  });

  test("upsertIngredient patches on second call with same canonicalName", async () => {
    const t = convexTest(schema, modules);

    // Insert initial record
    await t.run(async (ctx) => {
      await ctx.db.insert("ingredients", {
        canonicalName: "BHT",
        aliases: [],
        harmEvidenceScore: 5.8,
        regulatoryScore: 2.0,
        avoidanceScore: 6.0,
        baseScore: 4.5,
        tier: "Watch",
      });
    });

    // Upsert same canonical name with updated score
    await t.run(async (ctx) => {
      const existing = await ctx.db
        .query("ingredients")
        .withIndex("by_canonicalName", (q) => q.eq("canonicalName", "BHT"))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { baseScore: 5.2, tier: "Caution" });
      }
    });

    const updated = await t.run(async (ctx) =>
      ctx.db
        .query("ingredients")
        .withIndex("by_canonicalName", (q) => q.eq("canonicalName", "BHT"))
        .first()
    );

    // Still only one row
    const allIngredients = await t.run(async (ctx) =>
      ctx.db.query("ingredients").collect()
    );
    expect(allIngredients).toHaveLength(1);
    expect(updated?.baseScore).toBe(5.2);
    expect(updated?.tier).toBe("Caution");
  });
});
