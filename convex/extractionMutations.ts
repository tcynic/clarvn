import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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
    brand: v.optional(v.string()),
    upc: v.optional(v.array(v.string())),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Enrich product fields — only overwrite brand if it's still the default
    // "Unknown"; only set upc/emoji if they're missing.
    const product = await ctx.db.get(args.productId);
    if (product) {
      const enrichPatch: Record<string, unknown> = {};
      if (args.brand && (product.brand === "Unknown" || !product.brand)) {
        enrichPatch.brand = args.brand;
      }
      if (args.upc && !product.upc) {
        enrichPatch.upc = args.upc;
      }
      if (args.emoji && !product.emoji) {
        enrichPatch.emoji = args.emoji;
      }
      if (Object.keys(enrichPatch).length > 0) {
        await ctx.db.patch(args.productId, enrichPatch);
      }
    }

    let pendingCount = 0;

    for (const name of args.ingredientNames) {
      // Look up by canonicalName
      const existing = await ctx.db
        .query("ingredients")
        .withIndex("by_canonicalName", (q) => q.eq("canonicalName", name))
        .first();

      if (existing && (existing.scoreVersion ?? 0) > 0) {
        // Already SCORED — link to product
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
        // Not yet scored: either a placeholder (scoreVersion=0) or brand new.
        // In both cases this product must wait for the ingredient to be scored.
        let ingredientId: Id<"ingredients">;

        if (existing) {
          // Reuse existing placeholder — don't create a duplicate record
          ingredientId = existing._id;
          const alreadyLinked = await ctx.db
            .query("product_ingredients")
            .withIndex("by_productId", (q) => q.eq("productId", args.productId))
            .filter((q) => q.eq(q.field("ingredientId"), ingredientId))
            .first();
          if (!alreadyLinked) {
            await ctx.db.insert("product_ingredients", {
              productId: args.productId,
              ingredientId,
            });
          }
        } else {
          // Create new placeholder ingredient (zeroed scores)
          ingredientId = await ctx.db.insert("ingredients", {
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
            productId: args.productId,
            ingredientId,
          });
        }

        // Add this product to the queue entry's blockedProductIds.
        // Filter by pending/scoring status to avoid matching a stale "done" entry.
        const existingQueueEntry = await ctx.db
          .query("ingredient_queue")
          .withIndex("by_canonicalName", (q) => q.eq("canonicalName", name))
          .filter((q) =>
            q.or(
              q.eq(q.field("status"), "pending"),
              q.eq(q.field("status"), "scoring")
            )
          )
          .first();

        if (existingQueueEntry) {
          // Dedup — add this product to the blocked list
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
