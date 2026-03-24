import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
    .index("by_productName", ["productName"]),

  products: defineTable({
    name: v.string(),
    brand: v.string(),
    upc: v.optional(v.array(v.string())),
    emoji: v.optional(v.string()),
    baseScore: v.number(),
    tier: v.union(
      v.literal("Clean"),
      v.literal("Watch"),
      v.literal("Caution"),
      v.literal("Avoid")
    ),
    status: v.union(v.literal("scored"), v.literal("archived")),
    scoreVersion: v.number(),
    scoredAt: v.number(),
    refreshConfirmedAt: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_status", ["status"]),

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
