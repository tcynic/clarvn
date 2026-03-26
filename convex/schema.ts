import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Extend the auth users table with isAdmin, premium, and Stripe fields.
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
    // Premium / subscription fields
    isPremium: v.optional(v.boolean()),
    premiumUntil: v.optional(v.number()), // timestamp ms; 9_999_999_999_999 = indefinite
    isComplimentary: v.optional(v.boolean()), // true = admin-granted, not Stripe
    grantedBy: v.optional(v.string()), // admin who granted
    // Stripe Phase 1 placeholders (null at launch)
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()), // "active"|"trialing"|"canceled"|"past_due"
    planTier: v.optional(v.string()), // "premium"|"family"
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_isComplimentary", ["isComplimentary"])
    .index("by_subscriptionStatus", ["subscriptionStatus"]),

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
    userId: v.string(), // auth identity tokenIdentifier (middle segment)
    motivation: v.optional(v.union(v.string(), v.array(v.string()))),
    conditions: v.array(v.string()),
    sensitivities: v.array(v.string()),
    // v3.4 onboarding redesign fields
    dietaryRestrictions: v.optional(v.array(v.string())),
    lifeStage: v.optional(v.string()), // "just_me" | "household"
    householdMembers: v.optional(
      v.array(
        v.object({
          role: v.string(),
          ageRange: v.optional(v.string()),
        })
      )
    ),
    ingredientsToAvoid: v.optional(v.array(v.string())),
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
  }).index("by_productId", ["productId"]),

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
    // v3.4 catalog enrichment fields
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    price: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    averageRating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    retailers: v.optional(v.array(v.string())), // bounded, typically 1-5
    size: v.optional(v.string()),
    description: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_status", ["status"])
    .index("by_assemblyStatus", ["assemblyStatus"])
    .index("by_category", ["category"])
    .index("by_tier", ["tier"])
    .index("by_category_and_tier", ["category", "tier"])
    .searchIndex("search_name", { searchField: "name" }),

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
    // v3.4 enrichment fields
    ingredientFunction: v.optional(v.string()),
    detailExplanation: v.optional(v.string()),
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

  shopping_list_items: defineTable({
    userId: v.string(),
    name: v.string(),
    requestSent: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_name", ["userId", "name"]),

  // --- v3.4 new tables ---

  pantry_items: defineTable({
    userId: v.string(), // identity.tokenIdentifier
    productId: v.id("products"),
    addedAt: v.number(), // timestamp ms
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_productId", ["userId", "productId"]),

  daily_checkins: defineTable({
    userId: v.string(), // identity.tokenIdentifier
    date: v.string(), // "YYYY-MM-DD"
    mood: v.number(), // 1-5
    notes: v.optional(v.string()),
  }).index("by_userId_and_date", ["userId", "date"]),

  product_claims: defineTable({
    productId: v.id("products"),
    claim: v.string(), // e.g. "gluten_free", "usda_organic"
    verified: v.boolean(),
    source: v.optional(v.string()), // "open_food_facts" | "ai_extraction" | "manual"
  })
    .index("by_productId", ["productId"])
    .index("by_claim", ["claim"]),

  content_articles: defineTable({
    title: v.string(),
    category: v.string(),
    emoji: v.optional(v.string()),
    slug: v.string(),
    body: v.string(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"]),

  // Daily usage tracking for paste-ingredients analysis (free tier: 3/day cap)
  analysis_usage: defineTable({
    userId: v.string(), // identity.tokenIdentifier
    date: v.string(), // "YYYY-MM-DD"
    count: v.number(),
  }).index("by_userId_and_date", ["userId", "date"]),
});
