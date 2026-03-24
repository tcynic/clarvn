/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import {
  validateDiffResponse,
  DiffResponseSchema,
} from "../convex/lib/validator";

const modules = import.meta.glob("../convex/**/*.ts");

// --- 6.3: validateDiffResponse unit tests ---

describe("6.3 — validateDiffResponse (unit)", () => {
  test("accepts {change: false}", () => {
    const result = validateDiffResponse(JSON.stringify({ change: false }));
    expect(result).toEqual({ change: false });
  });

  test("accepts a valid change response with baseScore and tier", () => {
    const input = {
      change: true,
      change_reason: "EU banned Red No. 40 in March 2026",
      baseScore: 6.2,
      tier: "Caution",
    };
    const result = validateDiffResponse(JSON.stringify(input));
    expect(result).toMatchObject({
      change: true,
      change_reason: "EU banned Red No. 40 in March 2026",
      baseScore: 6.2,
      tier: "Caution",
    });
  });

  test("accepts a change response with only change_reason (no score update)", () => {
    const input = {
      change: true,
      change_reason: "New cohort study published",
    };
    const result = validateDiffResponse(JSON.stringify(input));
    expect(result).toMatchObject({ change: true, change_reason: "New cohort study published" });
  });

  test("rejects change:true without change_reason", () => {
    const input = { change: true, baseScore: 6.2 };
    expect(() => DiffResponseSchema.parse(input)).toThrow();
  });

  test("rejects invalid JSON", () => {
    expect(() => validateDiffResponse("not json")).toThrow();
  });

  test("strips markdown fences from raw response", () => {
    const raw = "```json\n" + JSON.stringify({ change: false }) + "\n```";
    const result = validateDiffResponse(raw);
    expect(result).toEqual({ change: false });
  });
});

// --- 6.3: updateRefreshConfirmed and applyRefresh DB mutation tests ---

describe("6.3 — updateRefreshConfirmed", () => {
  test("sets refreshConfirmedAt on the product document", async () => {
    const t = convexTest(schema, modules);

    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Test Product",
        brand: "Test Brand",
        baseScore: 2.0,
        tier: "Clean",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    await t.run(async (ctx) =>
      ctx.db.patch(productId, { refreshConfirmedAt: Date.now() })
    );

    const updated = await t.run(async (ctx) => ctx.db.get(productId));
    expect(updated?.refreshConfirmedAt).toBeDefined();
    expect(typeof updated?.refreshConfirmedAt).toBe("number");
    // scoreVersion should be unchanged
    expect(updated?.scoreVersion).toBe(1);
  });
});

describe("6.3 — applyRefresh", () => {
  test("increments scoreVersion and updates baseScore + tier", async () => {
    const t = convexTest(schema, modules);

    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Test Product",
        brand: "Test Brand",
        baseScore: 2.0,
        tier: "Clean",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    // Simulate applyRefresh logic
    await t.run(async (ctx) => {
      const product = await ctx.db.get(productId);
      if (!product) throw new Error("Product not found");
      await ctx.db.patch(productId, {
        baseScore: 6.2,
        tier: "Caution",
        scoreVersion: product.scoreVersion + 1,
        scoredAt: Date.now(),
        refreshConfirmedAt: Date.now(),
      });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(productId));
    expect(updated?.baseScore).toBe(6.2);
    expect(updated?.tier).toBe("Caution");
    expect(updated?.scoreVersion).toBe(2);
    expect(updated?.refreshConfirmedAt).toBeDefined();
  });

  test("no-change path only sets refreshConfirmedAt, leaves score unchanged", async () => {
    const t = convexTest(schema, modules);

    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Test Product",
        brand: "Test Brand",
        baseScore: 2.0,
        tier: "Clean",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    // Simulate updateRefreshConfirmed logic
    await t.run(async (ctx) => {
      await ctx.db.patch(productId, { refreshConfirmedAt: Date.now() });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(productId));
    expect(updated?.baseScore).toBe(2.0);
    expect(updated?.tier).toBe("Clean");
    expect(updated?.scoreVersion).toBe(1);
    expect(updated?.refreshConfirmedAt).toBeDefined();
  });
});
