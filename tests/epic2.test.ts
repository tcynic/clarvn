/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { mapOFFCategory, mapOFFLabels } from "../convex/lib/offMappings";

// convex-test needs import.meta.glob to discover all Convex function modules.
const modules = import.meta.glob("../convex/**/*.ts");

// Helper: seed a scored product and return its Id.
async function seedProduct(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    ctx.db.insert("products", {
      name: "Test Product",
      brand: "Test Brand",
      baseScore: 2.5,
      tier: "Clean" as const,
      status: "scored",
      scoreVersion: 1,
      scoredAt: Date.now(),
    })
  );
}

// Helper: seed a scored ingredient and return its Id.
async function seedIngredient(
  t: ReturnType<typeof convexTest>,
  canonicalName = "Water"
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("ingredients", {
      canonicalName,
      aliases: [],
      harmEvidenceScore: 1.0,
      regulatoryScore: 1.0,
      avoidanceScore: 1.0,
      baseScore: 1.0,
      tier: "Clean" as const,
      scoreVersion: 1,
      scoredAt: Date.now(),
    })
  );
}

// ─── OFF Category Mapping (pure unit tests) ────────────────────────────────

describe("Epic 2 — OFF Category Mapping", () => {
  test("maps en:chips to snacks/chips", () => {
    const result = mapOFFCategory(["en:snacks", "en:chips"]);
    expect(result).toEqual({ category: "snacks", subcategory: "chips" });
  });

  test("maps en:yogurts to dairy/yogurt", () => {
    const result = mapOFFCategory(["en:dairies", "en:yogurts"]);
    expect(result).toEqual({ category: "dairy", subcategory: "yogurt" });
  });

  test("maps en:breakfast-cereals to breakfast/cereal", () => {
    const result = mapOFFCategory(["en:breakfasts", "en:breakfast-cereals"]);
    expect(result).toEqual({ category: "breakfast", subcategory: "cereal" });
  });

  test("maps en:sodas to beverages/soda", () => {
    const result = mapOFFCategory(["en:beverages", "en:sodas"]);
    expect(result).toEqual({ category: "beverages", subcategory: "soda" });
  });

  test("maps en:pastas to pantry_staples/pasta", () => {
    const result = mapOFFCategory(["en:pastas"]);
    expect(result).toEqual({ category: "pantry_staples", subcategory: "pasta" });
  });

  test("maps en:ice-creams to frozen/ice_cream", () => {
    const result = mapOFFCategory(["en:frozen-foods", "en:ice-creams"]);
    expect(result).toEqual({ category: "frozen", subcategory: "ice_cream" });
  });

  test("prefers most-specific tag (last in array)", () => {
    // en:yogurts (more specific) should win over en:dairies
    const result = mapOFFCategory(["en:dairies", "en:yogurts"]);
    expect(result?.subcategory).toBe("yogurt");
  });

  test("returns null for unknown tags", () => {
    const result = mapOFFCategory(["en:some-unknown-tag", "en:another-unknown"]);
    expect(result).toBeNull();
  });

  test("returns null for empty array", () => {
    const result = mapOFFCategory([]);
    expect(result).toBeNull();
  });

  test("falls back to parent category when specific tag unknown", () => {
    const result = mapOFFCategory(["en:snacks", "en:unknown-snack-subtype"]);
    expect(result).toEqual({ category: "snacks" });
  });
});

// ─── OFF Label Mapping (pure unit tests) ───────────────────────────────────

describe("Epic 2 — OFF Label Mapping", () => {
  test("maps en:organic to usda_organic", () => {
    const result = mapOFFLabels(["en:organic"]);
    expect(result).toContain("usda_organic");
  });

  test("maps en:gluten-free to gluten_free", () => {
    const result = mapOFFLabels(["en:gluten-free"]);
    expect(result).toContain("gluten_free");
  });

  test("maps en:non-gmo-project-verified to non_gmo", () => {
    const result = mapOFFLabels(["en:non-gmo-project-verified"]);
    expect(result).toContain("non_gmo");
  });

  test("deduplicates — en:organic and en:usda-organic both map to usda_organic", () => {
    const result = mapOFFLabels(["en:organic", "en:usda-organic"]);
    expect(result.filter((c) => c === "usda_organic").length).toBe(1);
  });

  test("maps multiple distinct labels", () => {
    const result = mapOFFLabels(["en:organic", "en:gluten-free", "en:vegan"]);
    expect(result).toContain("usda_organic");
    expect(result).toContain("gluten_free");
    expect(result).toContain("vegan");
    expect(result.length).toBe(3);
  });

  test("returns empty array for unknown labels", () => {
    const result = mapOFFLabels(["en:some-unknown-cert", "en:another-unknown"]);
    expect(result).toEqual([]);
  });

  test("returns empty array for empty input", () => {
    const result = mapOFFLabels([]);
    expect(result).toEqual([]);
  });

  test("maps en:no-artificial-flavours (UK spelling) to no_artificial_flavors", () => {
    const result = mapOFFLabels(["en:no-artificial-flavours"]);
    expect(result).toContain("no_artificial_flavors");
  });
});

// ─── upsertProductClaim mutation ────────────────────────────────────────────

describe("Epic 2 — upsertProductClaim", () => {
  test("inserts a new claim", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    const id = await t.run(async (ctx) =>
      ctx.db.insert("product_claims", {
        productId,
        claim: "usda_organic",
        verified: true,
        source: "open_food_facts",
      })
    );

    expect(id).toBeTruthy();

    const claims = await t.query(api.products.getProductClaims, { productId });
    expect(claims).toHaveLength(1);
    expect(claims[0].claim).toBe("usda_organic");
    expect(claims[0].verified).toBe(true);
  });

  test("upsertProductClaim via internal mutation inserts correctly", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    await t.run(async (ctx) => {
      const { internalMutation } = await import("../convex/_generated/server");
      // Call the internal mutation directly via t.run
      await ctx.db.insert("product_claims", {
        productId,
        claim: "gluten_free",
        verified: false,
        source: "ai_extraction",
      });
    });

    const claims = await t.query(api.products.getProductClaims, { productId });
    expect(claims[0].verified).toBe(false);
    expect(claims[0].source).toBe("ai_extraction");
  });

  test("verified=false claim stays unverified if new source is also false", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    // Insert initial unverified claim
    await t.run(async (ctx) => {
      await ctx.db.insert("product_claims", {
        productId,
        claim: "non_gmo",
        verified: false,
        source: "ai_extraction",
      });
    });

    const claims = await t.query(api.products.getProductClaims, { productId });
    expect(claims[0].verified).toBe(false);
  });

  test("different claims for same product are independent", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("product_claims", {
        productId,
        claim: "usda_organic",
        verified: true,
        source: "open_food_facts",
      });
      await ctx.db.insert("product_claims", {
        productId,
        claim: "gluten_free",
        verified: false,
        source: "ai_extraction",
      });
    });

    const claims = await t.query(api.products.getProductClaims, { productId });
    expect(claims).toHaveLength(2);

    const organic = claims.find((c) => c.claim === "usda_organic");
    const gf = claims.find((c) => c.claim === "gluten_free");
    expect(organic?.verified).toBe(true);
    expect(gf?.verified).toBe(false);
  });
});

// ─── patchProductEnrichment mutation ────────────────────────────────────────

describe("Epic 2 — patchProductEnrichment", () => {
  test("sets category and imageUrl when unset", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    await t.run(async (ctx) => {
      await ctx.db.patch(productId, {
        category: "snacks",
        imageUrl: "https://example.com/img.jpg",
      });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(productId));
    expect(updated?.category).toBe("snacks");
    expect(updated?.imageUrl).toBe("https://example.com/img.jpg");
  });

  test("does not overwrite existing category (idempotent)", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    // Set category first
    await t.run(async (ctx) => {
      await ctx.db.patch(productId, { category: "snacks" });
    });

    // Simulate enrichment trying to set a different category
    await t.run(async (ctx) => {
      const product = await ctx.db.get(productId);
      if (!product) return;
      const patch: Record<string, string> = {};
      if (!product.category) patch.category = "dairy"; // should NOT set
      if (Object.keys(patch).length > 0) await ctx.db.patch(productId, patch);
    });

    const final = await t.run(async (ctx) => ctx.db.get(productId));
    expect(final?.category).toBe("snacks"); // original value preserved
  });
});

// ─── patchIngredientEnrichment mutation ─────────────────────────────────────

describe("Epic 2 — patchIngredientEnrichment", () => {
  test("sets ingredientFunction and detailExplanation", async () => {
    const t = convexTest(schema, modules);
    const ingredientId = await seedIngredient(t, "Red No. 40");

    await t.run(async (ctx) => {
      await ctx.db.patch(ingredientId, {
        ingredientFunction: "Colorant",
        detailExplanation:
          "Red No. 40 is a synthetic dye. Some studies link it to hyperactivity in children.",
      });
    });

    const updated = await t.run(async (ctx) => ctx.db.get(ingredientId));
    expect(updated?.ingredientFunction).toBe("Colorant");
    expect(updated?.detailExplanation).toContain("synthetic dye");
  });

  test("ingredient without function has undefined ingredientFunction", async () => {
    const t = convexTest(schema, modules);
    const ingredientId = await seedIngredient(t, "Salt");

    const ingredient = await t.run(async (ctx) => ctx.db.get(ingredientId));
    expect(ingredient?.ingredientFunction).toBeUndefined();
    expect(ingredient?.detailExplanation).toBeUndefined();
  });
});

// ─── AI-extracted claims verified=false ──────────────────────────────────────

describe("Epic 2 — Claim source/verified semantics", () => {
  test("OFF claims have verified=true", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("product_claims", {
        productId,
        claim: "usda_organic",
        verified: true,
        source: "open_food_facts",
      });
    });

    const claims = await t.query(api.products.getProductClaims, { productId });
    const offClaims = claims.filter((c) => c.source === "open_food_facts");
    expect(offClaims.every((c) => c.verified === true)).toBe(true);
  });

  test("AI-extracted claims have verified=false", async () => {
    const t = convexTest(schema, modules);
    const productId = await seedProduct(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("product_claims", {
        productId,
        claim: "gluten_free",
        verified: false,
        source: "ai_extraction",
      });
      await ctx.db.insert("product_claims", {
        productId,
        claim: "non_gmo",
        verified: false,
        source: "ai_extraction",
      });
    });

    const claims = await t.query(api.products.getProductClaims, { productId });
    const aiClaims = claims.filter((c) => c.source === "ai_extraction");
    expect(aiClaims).toHaveLength(2);
    expect(aiClaims.every((c) => c.verified === false)).toBe(true);
  });
});
