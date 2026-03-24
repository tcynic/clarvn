import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Extend the auth users table with an isAdmin flag.
  // Set isAdmin: true on a user document via the Convex dashboard to grant admin access.
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  // --- v2 product-level scoring queue (retained for backward compat) ---
  scoring_queue: defineTable({
    productName: v.string(),
    source: v.union(
      v.literal("user_request"),
      v.literal("admin_add"),
      v.literal("alternative")
    ),
    priority: v.number(),
    requestCount: v.number(),
    sourceProductId: v.optional(v.id("products")),
    status: v.union(
      v.literal("pending"),
      v.literal("scoring"),
      v.literal("done"),
      v.literal("failed")
    ),
    scoredAt: v.optional(v.number()),
    productId: v.optional(v.id("products")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_status_and_priority", ["status", "priority"])
    .index("by_status_and_requestCount", ["status", "requestCount"])
    .index("by_productName", ["productName"])
    .index("by_sourceProductId_and_status", ["sourceProductId", "status"]),
  batch_state: defineTable({
    isRunning: v.boolean(),
    shouldStop: v.boolean(),
  }),

  // --- v3 ingredient queue (admin's primary work surface) ---
  ingredient_queue: defineTable({
    canonicalName: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("scoring"),
      v.literal("done"),
      v.literal("failed")
    ),
    priority: v.number(), // 1 = user-requested, 2 = bulk seed, 3 = admin proactive
    requestCount: v.number(), // how many products are blocked on this ingredient
    blockedProductIds: v.array(v.id("products")),
    ingredientId: v.optional(v.id("ingredients")), // set on success
    errorMessage: v.optional(v.string()),
  })
    .index("by_status_and_priority", ["status", "priority"])
    .index("by_canonicalName", ["canonicalName"]),

  // --- v3 user profiles (server-side personalization) ---
  user_profiles: defineTable({
    userId: v.string(), // auth identity tokenIdentifier
    motivation: v.optional(v.string()),
    conditions: v.array(v.string()),
    sensitivities: v.array(v.string()),
  }).index("by_userId", ["userId"]),

  // --- v3 alternatives queue (decoupled from scoring pipeline) ---
  alternatives_queue: defineTable({
    productId: v.id("products"),
    status: v.union(
      v.literal("pending"),
      v.literal("done"),
      v.literal("failed")
    ),
    alternatives: v.optional(
      v.array(
        v.object({
          name: v.string(),
          brand: v.string(),
          reason: v.optional(v.string()),
        })
      )
    ),
  }),

  products: defineTable({
    name: v.string(),
    brand: v.string(),
    upc: v.optional(v.array(v.string())),
    emoji: v.optional(v.string()),
    // v3: baseScore and tier are optional (null when pending ingredients)
    baseScore: v.optional(v.number()),
    tier: v.optional(
      v.union(
        v.literal("Clean"),
        v.literal("Watch"),
        v.literal("Caution"),
        v.literal("Avoid")
      )
    ),
    status: v.union(v.literal("scored"), v.literal("archived")),
    scoreVersion: v.number(),
    scoredAt: v.number(),
    refreshConfirmedAt: v.optional(v.number()),
    // v3 assembly fields
    assemblyStatus: v.optional(
      v.union(
        v.literal("complete"),
        v.literal("partial"),
        v.literal("pending_ingredients")
      )
    ),
    pendingIngredientCount: v.optional(v.number()),
    worstIngredientId: v.optional(v.id("ingredients")),
    ingredientSource: v.optional(
      v.union(
        v.literal("open_food_facts"),
        v.literal("ai_extraction"),
        v.literal("manual")
      )
    ),
  })
    .index("by_name", ["name"])
    .index("by_status", ["status"])
    .index("by_assemblyStatus", ["assemblyStatus"]),

  ingredients: defineTable({
    canonicalName: v.string(),
    aliases: v.array(v.string()),
    harmEvidenceScore: v.number(),
    regulatoryScore: v.number(),
    avoidanceScore: v.number(),
    baseScore: v.number(),
    tier: v.union(
      v.literal("Clean"),
      v.literal("Watch"),
      v.literal("Caution"),
      v.literal("Avoid")
    ),
    flagLabel: v.optional(v.string()),
    evidenceSources: v.optional(v.any()),
    scoreVersion: v.optional(v.number()),
    scoredAt: v.optional(v.number()),
  }).index("by_canonicalName", ["canonicalName"]),

  condition_modifiers: defineTable({
    ingredientId: v.id("ingredients"),
    condition: v.string(),
    modifierAmount: v.number(),
    evidenceCitation: v.string(),
    evidenceQuality: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
  })
    .index("by_ingredientId", ["ingredientId"])
    .index("by_condition", ["condition"]),

  product_ingredients: defineTable({
    productId: v.id("products"),
    ingredientId: v.id("ingredients"),
  }).index("by_productId", ["productId"]),
});
