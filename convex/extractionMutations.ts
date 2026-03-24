import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Epic 2.2 — Process the extraction result for a product.
 *
 * For each ingredient name:
 *   - If already in the ingredients table (scored) → link via product_ingredients.
 *   - If not found → create placeholder ingredient, link it, add to ingredient_queue.
 *
 * Updates the product's pendingIngredientCount and assemblyStatus.
 * If all ingredients are already scored, triggers product assembly.
 */
export const processExtractionResult = internalMutation({
  args: {
    productId: v.id("products"),
    ingredientNames: v.array(v.string()),
    source: v.union(
      v.literal("open_food_facts"),
      v.literal("ai_extraction"),
      v.literal("manual")
    ),
  },
  handler: async (ctx, args) => {
    let pendingCount = 0;

    for (const name of args.ingredientNames) {
      // Look up by canonicalName
      const existing = await ctx.db
        .query("ingredients")
        .withIndex("by_canonicalName", (q) => q.eq("canonicalName", name))
        .first();

      if (existing) {
        // Already scored — link to product
        const alreadyLinked = await ctx.db
          .query("product_ingredients")
          .withIndex("by_productId", (q) => q.eq("productId", args.productId))
          .filter((q) => q.eq(q.field("ingredientId"), existing._id))
          .first();

        if (!alreadyLinked) {
          await ctx.db.insert("product_ingredients", {
            productId: args.productId,
            ingredientId: existing._id,
          });
        }
      } else {
        // Not scored — create placeholder ingredient (zeroed scores)
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

        // Link to product
        await ctx.db.insert("product_ingredients", {
          productId: args.productId,
          ingredientId,
        });

        // Add to ingredient queue
        const existingQueueEntry = await ctx.db
          .query("ingredient_queue")
          .withIndex("by_canonicalName", (q) => q.eq("canonicalName", name))
          .first();

        if (
          existingQueueEntry &&
          (existingQueueEntry.status === "pending" ||
            existingQueueEntry.status === "scoring")
        ) {
          // Dedup — increment and add blocked product
          await ctx.db.patch(existingQueueEntry._id, {
            requestCount: existingQueueEntry.requestCount + 1,
            blockedProductIds: [
              ...existingQueueEntry.blockedProductIds,
              args.productId,
            ],
          });
        } else {
          await ctx.db.insert("ingredient_queue", {
            canonicalName: name,
            status: "pending",
            priority: 1,
            requestCount: 1,
            blockedProductIds: [args.productId],
          });
        }

        pendingCount++;
      }
    }

    // Update product assembly status
    if (pendingCount === 0) {
      await ctx.db.patch(args.productId, {
        assemblyStatus: "complete",
        pendingIngredientCount: 0,
        ingredientSource: args.source,
      });
      // Trigger assembly (will be called by the assembly module)
      // Schedule assembly via internal mutation
      await ctx.scheduler.runAfter(0, internal.assembly.assembleProductScore, {
        productId: args.productId,
      });
    } else {
      await ctx.db.patch(args.productId, {
        assemblyStatus: "pending_ingredients",
        pendingIngredientCount: pendingCount,
        ingredientSource: args.source,
      });
    }

    return { pendingCount, totalIngredients: args.ingredientNames.length };
  },
});
