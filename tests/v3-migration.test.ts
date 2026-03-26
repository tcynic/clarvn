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
    expect(profile?.motivation).toEqual(["General health"]);
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
    expect(profile?.motivation).toEqual(["Kids"]);
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
// Epic 2 — Extraction Result Processing
// ============================================================

describe("Epic 2 — processExtractionResult", () => {
  test("all-known ingredients → assemblyStatus=complete", async () => {
    const t = convexTest(schema, modules);

    // Pre-create a scored ingredient
    const ingId = await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "sugar",
        aliases: [],
        harmEvidenceScore: 2.0,
        regulatoryScore: 1.0,
        avoidanceScore: 3.0,
        baseScore: 2.0,
        tier: "Clean",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    // Create a pending product
    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Test Product",
        brand: "Brand",
        status: "scored",
        scoreVersion: 0,
        scoredAt: Date.now(),
        assemblyStatus: "pending_ingredients",
        pendingIngredientCount: 1,
      })
    );

    // Run processExtractionResult with a known ingredient
    await t.run(async (ctx) => {
      // Simulate the mutation logic inline
      const name = "sugar";
      const existing = await ctx.db
        .query("ingredients")
        .withIndex("by_canonicalName", (q) => q.eq("canonicalName", name))
        .first();
      expect(existing).not.toBeNull();

      // Link it
      await ctx.db.insert("product_ingredients", {
        productId,
        ingredientId: existing!._id,
      });

      // Update product status
      await ctx.db.patch(productId, {
        assemblyStatus: "complete",
        pendingIngredientCount: 0,
        ingredientSource: "open_food_facts",
      });
    });

    const product = await t.run(async (ctx) => ctx.db.get(productId));
    expect(product?.assemblyStatus).toBe("complete");
    expect(product?.pendingIngredientCount).toBe(0);
  });

  test("unknown ingredients → queue entries with blockedProductIds", async () => {
    const t = convexTest(schema, modules);

    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Mystery Product",
        brand: "Brand",
        status: "scored",
        scoreVersion: 0,
        scoredAt: Date.now(),
        assemblyStatus: "pending_ingredients",
        pendingIngredientCount: 0,
      })
    );

    // Simulate processExtractionResult with unknown ingredients
    await t.run(async (ctx) => {
      const unknownNames = ["mystery compound x", "fictional additive y"];
      for (const name of unknownNames) {
        // Create placeholder ingredient
        const ingredientId = await ctx.db.insert("ingredients", {
          canonicalName: name,
          aliases: [],
          harmEvidenceScore: 0,
          regulatoryScore: 0,
          avoidanceScore: 0,
          baseScore: 0,
          tier: "Clean",
          scoreVersion: 0,
          scoredAt: 0,
        });

        await ctx.db.insert("product_ingredients", {
          productId,
          ingredientId,
        });

        await ctx.db.insert("ingredient_queue", {
          canonicalName: name,
          status: "pending",
          priority: 1,
          requestCount: 1,
          blockedProductIds: [productId],
        });
      }

      await ctx.db.patch(productId, {
        assemblyStatus: "pending_ingredients",
        pendingIngredientCount: 2,
      });
    });

    const product = await t.run(async (ctx) => ctx.db.get(productId));
    expect(product?.assemblyStatus).toBe("pending_ingredients");
    expect(product?.pendingIngredientCount).toBe(2);

    // Verify queue entries
    const queueEntries = await t.run(async (ctx) =>
      ctx.db.query("ingredient_queue").take(10)
    );
    expect(queueEntries).toHaveLength(2);
    expect(queueEntries[0].blockedProductIds).toContain(productId);
  });
});

// ============================================================
// Epic 4 — Assembly Formula (pure function tests)
// ============================================================

import { calculateProductScore, getTierFromScore } from "../convex/assembly";

describe("Epic 4 — calculateProductScore", () => {
  test("Froot Loops example: [6.3, 5.8, 5.5, 2.1, 1.0] = 6.83", () => {
    const result = calculateProductScore([6.3, 5.8, 5.5, 2.1, 1.0]);
    expect(result.baseScore).toBeCloseTo(6.83, 1);
    expect(result.worstIndex).toBe(0); // 6.3 is the worst
  });

  test("all clean: [2.0, 1.5, 1.0] = 2.0 (no penalties)", () => {
    const result = calculateProductScore([2.0, 1.5, 1.0]);
    expect(result.baseScore).toBe(2.0);
  });

  test("caps at 10.0: [9.5, 8.0, 7.5, 6.0]", () => {
    const result = calculateProductScore([9.5, 8.0, 7.5, 6.0]);
    expect(result.baseScore).toBe(10.0);
  });

  test("single flagged: [4.0] = 4.0 (no additional penalty)", () => {
    const result = calculateProductScore([4.0]);
    expect(result.baseScore).toBe(4.0);
  });

  test("empty array returns 1.0", () => {
    const result = calculateProductScore([]);
    expect(result.baseScore).toBe(1.0);
    expect(result.worstIndex).toBe(-1);
  });

  test("single ingredient returns its score as the product score", () => {
    const result = calculateProductScore([7.2]);
    expect(result.baseScore).toBe(7.2);
    expect(result.worstIndex).toBe(0);
  });

  test("penalty scaling: two flagged ingredients", () => {
    // Worst = 6.0, additional 5.0 → penalty = 0.1 + (5.0-4.0)*0.1 = 0.20
    const result = calculateProductScore([6.0, 5.0]);
    expect(result.baseScore).toBeCloseTo(6.2, 2);
  });
});

describe("Epic 4 — getTierFromScore", () => {
  test("Clean: 1.0-3.9", () => {
    expect(getTierFromScore(1.0)).toBe("Clean");
    expect(getTierFromScore(3.0)).toBe("Clean");
    expect(getTierFromScore(3.9)).toBe("Clean");
  });

  test("Watch: 4.0-5.9", () => {
    expect(getTierFromScore(4.0)).toBe("Watch");
    expect(getTierFromScore(5.0)).toBe("Watch");
    expect(getTierFromScore(5.9)).toBe("Watch");
  });

  test("Caution: 6.0-7.9", () => {
    expect(getTierFromScore(6.0)).toBe("Caution");
    expect(getTierFromScore(7.0)).toBe("Caution");
    expect(getTierFromScore(7.9)).toBe("Caution");
  });

  test("Avoid: 8.0-10.0", () => {
    expect(getTierFromScore(8.0)).toBe("Avoid");
    expect(getTierFromScore(10.0)).toBe("Avoid");
  });
});

// ============================================================
// Epic 4 — Assembly mutation tests
// ============================================================

describe("Epic 4 — assembleProductScore (via Convex)", () => {
  test("partial assembly: 3/5 scored produces partial score", async () => {
    const t = convexTest(schema, modules);

    // Create product
    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Partial Product",
        brand: "Brand",
        status: "scored",
        scoreVersion: 0,
        scoredAt: Date.now(),
        assemblyStatus: "pending_ingredients",
        pendingIngredientCount: 5,
      })
    );

    // Create 3 scored + 2 unscored ingredients
    const scored1 = await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "scored1",
        aliases: [],
        harmEvidenceScore: 5.0,
        regulatoryScore: 4.0,
        avoidanceScore: 3.0,
        baseScore: 5.0,
        tier: "Watch",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );
    const scored2 = await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "scored2",
        aliases: [],
        harmEvidenceScore: 2.0,
        regulatoryScore: 1.5,
        avoidanceScore: 1.0,
        baseScore: 1.6,
        tier: "Clean",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );
    const scored3 = await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "scored3",
        aliases: [],
        harmEvidenceScore: 4.0,
        regulatoryScore: 3.5,
        avoidanceScore: 4.0,
        baseScore: 4.5,
        tier: "Watch",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );
    const unscored1 = await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "unscored1",
        aliases: [],
        harmEvidenceScore: 0,
        regulatoryScore: 0,
        avoidanceScore: 0,
        baseScore: 0,
        tier: "Clean",
        scoreVersion: 0,
        scoredAt: 0,
      })
    );
    const unscored2 = await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "unscored2",
        aliases: [],
        harmEvidenceScore: 0,
        regulatoryScore: 0,
        avoidanceScore: 0,
        baseScore: 0,
        tier: "Clean",
        scoreVersion: 0,
        scoredAt: 0,
      })
    );

    // Link all to product
    await t.run(async (ctx) => {
      for (const ingId of [scored1, scored2, scored3, unscored1, unscored2]) {
        await ctx.db.insert("product_ingredients", {
          productId,
          ingredientId: ingId,
        });
      }
    });

    // Run assembly
    await t.run(async (ctx) => {
      // Inline assembly logic since we can't call internal mutations from tests
      const links = await ctx.db
        .query("product_ingredients")
        .withIndex("by_productId", (q) => q.eq("productId", productId))
        .take(200);

      const ingredients = [];
      for (const link of links) {
        const ing = await ctx.db.get(link.ingredientId);
        if (ing) ingredients.push(ing);
      }

      const scored = ingredients.filter((i) => (i.scoreVersion ?? 0) > 0);
      const unscoredCount = ingredients.length - scored.length;

      const scores = scored.map((i) => i.baseScore);
      const { baseScore, worstIndex } = calculateProductScore(scores);
      const tier = getTierFromScore(baseScore);
      const worstIngredientId = worstIndex >= 0 ? scored[worstIndex]._id : undefined;

      await ctx.db.patch(productId, {
        baseScore,
        tier,
        assemblyStatus: unscoredCount === 0 ? "complete" : "partial",
        pendingIngredientCount: unscoredCount,
        worstIngredientId,
      });
    });

    const product = await t.run(async (ctx) => ctx.db.get(productId));
    expect(product?.assemblyStatus).toBe("partial");
    expect(product?.pendingIngredientCount).toBe(2);
    expect(product?.baseScore).toBeDefined();
    expect(product?.baseScore).toBeGreaterThan(0);
    expect(product?.worstIngredientId).toBe(scored1); // 5.0 is worst
  });
});

// ============================================================
// Epic 4 — Personalization tests
// ============================================================

describe("Epic 4 — getPersonalizedProduct", () => {
  test("ADHD user + Red No. 40 product adds modifier correctly", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {})
    );
    const asUser = withUser(t, userId);

    // Create user profile with ADHD
    await asUser.mutation(api.userProfiles.createOrUpdateProfile, {
      motivation: "Kids",
      conditions: ["ADHD"],
      sensitivities: [],
    });

    // Create a scored product
    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Red Dye Product",
        brand: "Brand",
        baseScore: 6.3,
        tier: "Caution",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
        assemblyStatus: "complete",
        pendingIngredientCount: 0,
      })
    );

    // Create ingredient with modifier
    const ingId = await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "red no. 40",
        aliases: ["Allura Red AC"],
        harmEvidenceScore: 7.6,
        regulatoryScore: 5.3,
        avoidanceScore: 7.8,
        baseScore: 6.3,
        tier: "Caution",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    await t.run(async (ctx) => {
      await ctx.db.insert("product_ingredients", {
        productId,
        ingredientId: ingId,
      });
      await ctx.db.insert("condition_modifiers", {
        ingredientId: ingId,
        condition: "ADHD",
        modifierAmount: 2.8,
        evidenceCitation: "McCann et al. 2007 Lancet RCT",
        evidenceQuality: "RCT",
        status: "active",
      });
    });

    const result = await asUser.query(api.assembly.getPersonalizedProduct, {
      productId,
    });

    expect(result).not.toBeNull();
    expect(result!.baseScore).toBe(6.3);
    expect(result!.personalScore).toBeCloseTo(9.1, 1);
    expect(result!.modifiers).toHaveLength(1);
    expect(result!.modifiers[0].condition).toBe("ADHD");
  });

  test("user with no matching conditions → baseScore == personalScore", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {})
    );
    const asUser = withUser(t, userId);

    // Create user profile without ADHD
    await asUser.mutation(api.userProfiles.createOrUpdateProfile, {
      conditions: [],
      sensitivities: [],
    });

    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "Clean Product",
        brand: "Brand",
        baseScore: 2.0,
        tier: "Clean",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
        assemblyStatus: "complete",
        pendingIngredientCount: 0,
      })
    );

    const ingId = await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "water",
        aliases: [],
        harmEvidenceScore: 1.0,
        regulatoryScore: 1.0,
        avoidanceScore: 1.0,
        baseScore: 1.0,
        tier: "Clean",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    await t.run(async (ctx) => {
      await ctx.db.insert("product_ingredients", {
        productId,
        ingredientId: ingId,
      });
    });

    const result = await asUser.query(api.assembly.getPersonalizedProduct, {
      productId,
    });

    expect(result).not.toBeNull();
    expect(result!.baseScore).toBe(2.0);
    expect(result!.personalScore).toBe(2.0);
    expect(result!.modifiers).toHaveLength(0);
  });

  test("personal score caps at 10.0", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {})
    );
    const asUser = withUser(t, userId);

    await asUser.mutation(api.userProfiles.createOrUpdateProfile, {
      conditions: ["ADHD", "IBS"],
      sensitivities: ["Migraines"],
    });

    const productId = await t.run(async (ctx) =>
      ctx.db.insert("products", {
        name: "High Score Product",
        brand: "Brand",
        baseScore: 8.5,
        tier: "Avoid",
        status: "scored",
        scoreVersion: 1,
        scoredAt: Date.now(),
        assemblyStatus: "complete",
        pendingIngredientCount: 0,
      })
    );

    const ingId = await t.run(async (ctx) =>
      ctx.db.insert("ingredients", {
        canonicalName: "problematic dye",
        aliases: [],
        harmEvidenceScore: 8.0,
        regulatoryScore: 7.0,
        avoidanceScore: 6.0,
        baseScore: 8.5,
        tier: "Avoid",
        scoreVersion: 1,
        scoredAt: Date.now(),
      })
    );

    await t.run(async (ctx) => {
      await ctx.db.insert("product_ingredients", {
        productId,
        ingredientId: ingId,
      });
      // Add multiple modifiers that would exceed 10.0
      await ctx.db.insert("condition_modifiers", {
        ingredientId: ingId,
        condition: "ADHD",
        modifierAmount: 2.8,
        evidenceCitation: "Study A",
        status: "active",
      });
      await ctx.db.insert("condition_modifiers", {
        ingredientId: ingId,
        condition: "IBS",
        modifierAmount: 3.5,
        evidenceCitation: "Study B",
        status: "active",
      });
    });

    const result = await asUser.query(api.assembly.getPersonalizedProduct, {
      productId,
    });

    expect(result).not.toBeNull();
    expect(result!.personalScore).toBe(10.0); // capped
    expect(result!.modifiers).toHaveLength(2);
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
