/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

describe("4.6 — getAlternativesForProduct", () => {
  test("returns empty array when no alternatives are queued for the product", async () => {
    const t = convexTest(schema, modules);

    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Froot Loops",
        brand: "Kellogg's",
        baseScore: 4.5,
        tier: "Watch",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    const alts = await t.query(api.scoringQueue.getAlternativesForProduct, {
      productId,
    });

    expect(alts).toEqual([]);
  });

  test("returns scored alternative product when a done alternative entry exists", async () => {
    const t = convexTest(schema, modules);

    // Source product (to be swapped FROM)
    const sourceProductId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Froot Loops",
        brand: "Kellogg's",
        baseScore: 4.5,
        tier: "Watch",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    // Alternative product (to be swapped TO)
    const altProductId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Three Wishes Grain-Free Cereal",
        brand: "Three Wishes",
        baseScore: 1.8,
        tier: "Clean",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    // Queue entry linking them
    await t.run(async (ctx) =>
      ctx.db.insert("scoring_queue", {
        productName: "Three Wishes Grain-Free Cereal",
        source: "alternative",
        priority: 2,
        requestCount: 1,
        sourceProductId,
        productId: altProductId,
        status: "done",
      })
    );

    const alts = await t.query(api.scoringQueue.getAlternativesForProduct, {
      productId: sourceProductId,
    });

    expect(alts).toHaveLength(1);
    expect((alts[0] as { name: string }).name).toBe(
      "Three Wishes Grain-Free Cereal"
    );
    expect((alts[0] as { tier: string }).tier).toBe("Clean");
  });

  test("skips alternatives that are still pending (not done)", async () => {
    const t = convexTest(schema, modules);

    const sourceProductId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Froot Loops",
        brand: "Kellogg's",
        baseScore: 4.5,
        tier: "Watch",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    // Pending alternative (not yet scored)
    await t.run(async (ctx) =>
      ctx.db.insert("scoring_queue", {
        productName: "Three Wishes Grain-Free Cereal",
        source: "alternative",
        priority: 2,
        requestCount: 1,
        sourceProductId,
        status: "pending",
      })
    );

    const alts = await t.query(api.scoringQueue.getAlternativesForProduct, {
      productId: sourceProductId,
    });

    expect(alts).toEqual([]);
  });

  test("does not return alternatives for a different product", async () => {
    const t = convexTest(schema, modules);

    const productA = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Product A",
        brand: "Brand A",
        baseScore: 4.5,
        tier: "Watch",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    const productB = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Product B",
        brand: "Brand B",
        baseScore: 3.0,
        tier: "Clean",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    const altForB = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Alt For B",
        brand: "Brand X",
        baseScore: 1.5,
        tier: "Clean",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      ctx.db.insert("scoring_queue", {
        productName: "Alt For B",
        source: "alternative",
        priority: 2,
        requestCount: 1,
        sourceProductId: productB,
        productId: altForB,
        status: "done",
      })
    );

    // Query alternatives for product A — should be empty
    const alts = await t.query(api.scoringQueue.getAlternativesForProduct, {
      productId: productA,
    });

    expect(alts).toEqual([]);
  });
});
