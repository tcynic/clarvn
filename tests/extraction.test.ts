/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect, vi } from "vitest";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

async function seedProduct(
  t: ReturnType<typeof convexTest>,
  overrides: Record<string, unknown> = {}
) {
  return t.run(async (ctx) =>
    ctx.db.insert("products", {
      name: "Test Product",
      brand: "Unknown",
      status: "scored",
      scoreVersion: 0,
      scoredAt: 0,
      assemblyStatus: "pending_ingredients",
      baseScore: 0,
      tier: "Clean",
      ...overrides,
    })
  );
}

async function seedScoredIngredient(
  t: ReturnType<typeof convexTest>,
  name: string,
  tier: "Clean" | "Watch" | "Caution" | "Avoid" = "Clean"
) {
  return t.run(async (ctx) =>
    ctx.db.insert("ingredients", {
      canonicalName: name,
      aliases: [],
      harmEvidenceScore: 0,
      regulatoryScore: 0,
      avoidanceScore: 0,
      baseScore: 1.0,
      tier,
      scoreVersion: 1,
      scoredAt: Date.now(),
    })
  );
}

// ─── processExtractionResult ──────────────────────────────────────────────────

describe("extraction — processExtractionResult", () => {
  test("links scored ingredients to the product", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    await seedScoredIngredient(t, "water");
    await seedScoredIngredient(t, "sugar");

    // Include an unscored ingredient so pendingCount > 0 and assembly is not scheduled
    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId,
      ingredientNames: ["water", "sugar", "unscored_extra"],
      source: "manual",
    });

    const links = await t.run(async (ctx) =>
      ctx.db
        .query("product_ingredients")
        .withIndex("by_productId", (q) => q.eq("productId", productId))
        .collect()
    );
    // All 3 ingredients linked (2 scored + 1 placeholder)
    expect(links).toHaveLength(3);
  });

  test("creates placeholder ingredient for unknown ingredient", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId,
      ingredientNames: ["mystery_extract_123"],
      source: "ai_extraction",
    });

    const placeholder = await t.run(async (ctx) =>
      ctx.db
        .query("ingredients")
        .withIndex("by_canonicalName", (q) =>
          q.eq("canonicalName", "mystery_extract_123")
        )
        .first()
    );
    expect(placeholder).not.toBeNull();
    expect(placeholder!.scoreVersion).toBe(0); // unscored placeholder
  });

  test("sets assemblyStatus to complete when all ingredients are scored", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    await seedScoredIngredient(t, "salt");
    await seedScoredIngredient(t, "vinegar");

    vi.useFakeTimers();
    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId,
      ingredientNames: ["salt", "vinegar"],
      source: "open_food_facts",
    });
    await t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(100));
    vi.useRealTimers();

    const product = await t.run(async (ctx) => ctx.db.get(productId));
    expect(product!.assemblyStatus).toBe("complete");
    expect(product!.pendingIngredientCount).toBe(0);
  });

  test("sets assemblyStatus to pending_ingredients when some ingredients are unscored", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    await seedScoredIngredient(t, "oats");

    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId,
      ingredientNames: ["oats", "unknown_additive_x"],
      source: "ai_extraction",
    });

    const product = await t.run(async (ctx) => ctx.db.get(productId));
    expect(product!.assemblyStatus).toBe("pending_ingredients");
    expect(product!.pendingIngredientCount).toBe(1);
  });

  test("returns pendingCount and totalIngredients", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    await seedScoredIngredient(t, "flour");

    const result = await t.mutation(
      internal.extractionMutations.processExtractionResult,
      {
        productId,
        ingredientNames: ["flour", "mystery_flour_add"],
        source: "manual",
      }
    );

    expect(result.pendingCount).toBe(1);
    expect(result.totalIngredients).toBe(2);
  });

  test("does not create duplicate product_ingredient links", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    await seedScoredIngredient(t, "corn syrup");

    // Include an unscored ingredient to keep pendingCount > 0 (no assembly scheduled)
    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId,
      ingredientNames: ["corn syrup", "pending_ing"],
      source: "manual",
    });
    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId,
      ingredientNames: ["corn syrup", "pending_ing"],
      source: "manual",
    });

    const links = await t.run(async (ctx) =>
      ctx.db
        .query("product_ingredients")
        .withIndex("by_productId", (q) => q.eq("productId", productId))
        .collect()
    );
    expect(links).toHaveLength(2); // corn syrup + pending_ing — no duplicates
  });

  test("deduplicates ingredient_queue entries for same unscored ingredient", async () => {
    const t = convexTest(schema, modules);
    const product1 = await seedProduct(t, { name: "Product 1" });
    const product2 = await seedProduct(t, { name: "Product 2" });

    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId: product1,
      ingredientNames: ["shared_mystery_ingredient"],
      source: "manual",
    });
    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId: product2,
      ingredientNames: ["shared_mystery_ingredient"],
      source: "manual",
    });

    const queueEntries = await t.run(async (ctx) =>
      ctx.db
        .query("ingredient_queue")
        .withIndex("by_canonicalName", (q) =>
          q.eq("canonicalName", "shared_mystery_ingredient")
        )
        .collect()
    );

    // Should only have one queue entry (deduped)
    expect(queueEntries).toHaveLength(1);
    expect(queueEntries[0].requestCount).toBe(2);
    expect(queueEntries[0].blockedProductIds).toContain(product1);
    expect(queueEntries[0].blockedProductIds).toContain(product2);
  });

  test("enriches product brand from extraction when brand is Unknown", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t, { brand: "Unknown" });
    await seedScoredIngredient(t, "milk");

    // Include an unscored ingredient to avoid triggering assembly scheduler
    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId,
      ingredientNames: ["milk", "unscored_ing"],
      source: "open_food_facts",
      brand: "Organic Valley",
    });

    const product = await t.run(async (ctx) => ctx.db.get(productId));
    expect(product!.brand).toBe("Organic Valley");
  });

  test("does not overwrite an already-known brand", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t, { brand: "Existing Brand" });
    await seedScoredIngredient(t, "milk");

    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId,
      ingredientNames: ["milk", "unscored_ing2"],
      source: "open_food_facts",
      brand: "Impostor Brand",
    });

    const product = await t.run(async (ctx) => ctx.db.get(productId));
    expect(product!.brand).toBe("Existing Brand"); // not overwritten
  });

  test("sets ingredientSource on the product", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);
    await seedScoredIngredient(t, "canola oil");

    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId,
      ingredientNames: ["canola oil", "unscored_ing3"],
      source: "open_food_facts",
    });

    const product = await t.run(async (ctx) => ctx.db.get(productId));
    expect(product!.ingredientSource).toBe("open_food_facts");
  });

  test("reuses existing unscored placeholder instead of creating duplicate", async () => {
    const t = convexTest(schema, modules);
    const product1 = await seedProduct(t, { name: "Product A" });
    const product2 = await seedProduct(t, { name: "Product B" });

    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId: product1,
      ingredientNames: ["rare_unscored_ing"],
      source: "manual",
    });
    await t.mutation(internal.extractionMutations.processExtractionResult, {
      productId: product2,
      ingredientNames: ["rare_unscored_ing"],
      source: "manual",
    });

    const ingredients = await t.run(async (ctx) =>
      ctx.db
        .query("ingredients")
        .withIndex("by_canonicalName", (q) =>
          q.eq("canonicalName", "rare_unscored_ing")
        )
        .collect()
    );
    expect(ingredients).toHaveLength(1);
  });
});
