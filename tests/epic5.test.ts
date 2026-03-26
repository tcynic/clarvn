/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

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
      baseScore: overrides.baseScore ?? 3.0,
      tier: overrides.tier ?? "Clean",
    })
  );
}

// ============================================================
// getMyPantryProductIds
// ============================================================

describe("Epic 5 — getMyPantryProductIds", () => {
  test("returns empty array for unauthenticated user", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.query(api.pantry.getMyPantryProductIds, {});
    expect(ids).toEqual([]);
  });

  test("returns product IDs after adding items to pantry", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    const p1 = await insertProduct(t, { name: "Product A" });
    const p2 = await insertProduct(t, { name: "Product B" });

    await asUser.mutation(api.pantry.addToPantry, { productId: p1 });
    await asUser.mutation(api.pantry.addToPantry, { productId: p2 });

    const ids = await asUser.query(api.pantry.getMyPantryProductIds, {});

    expect(ids).toHaveLength(2);
    expect(ids).toContain(p1);
    expect(ids).toContain(p2);
  });

  test("returns empty array after removing all pantry items", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = withUser(t, userId);

    const productId = await insertProduct(t);

    await asUser.mutation(api.pantry.addToPantry, { productId });
    const afterAdd = await asUser.query(api.pantry.getMyPantryProductIds, {});
    expect(afterAdd).toContain(productId);

    await asUser.mutation(api.pantry.removeFromPantry, { productId });
    const afterRemove = await asUser.query(api.pantry.getMyPantryProductIds, {});
    expect(afterRemove).toEqual([]);
  });

  test("does not include another user's pantry items", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const userId2 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser1 = withUser(t, userId1);
    const asUser2 = withUser(t, userId2);

    const productId = await insertProduct(t);

    await asUser1.mutation(api.pantry.addToPantry, { productId });

    const user2Ids = await asUser2.query(api.pantry.getMyPantryProductIds, {});
    expect(user2Ids).toEqual([]);
  });
});
