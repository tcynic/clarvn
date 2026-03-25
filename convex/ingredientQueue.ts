import { v } from "convex/values";
import { mutation, internalMutation, internalQuery, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Add an ingredient to the scoring queue with deduplication.
 * If the ingredient is already queued (pending/scoring), increments requestCount
 * and appends the blockedProductId.
 */
export const addToIngredientQueue = mutation({
  args: {
    canonicalName: v.string(),
    priority: v.number(),
    blockedProductId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    // Check for existing pending or scoring entry by canonicalName
    const existing = await ctx.db
      .query("ingredient_queue")
      .withIndex("by_canonicalName", (q) =>
        q.eq("canonicalName", args.canonicalName)
      )
      .first();

    if (existing && (existing.status === "pending" || existing.status === "scoring")) {
      const updatedBlocked = args.blockedProductId
        ? [...existing.blockedProductIds, args.blockedProductId]
        : existing.blockedProductIds;

      await ctx.db.patch(existing._id, {
        requestCount: existing.requestCount + 1,
        priority: Math.min(existing.priority, args.priority),
        blockedProductIds: updatedBlocked,
      });
      return existing._id;
    }

    // Insert new queue entry
    return await ctx.db.insert("ingredient_queue", {
      canonicalName: args.canonicalName,
      status: "pending",
      priority: args.priority,
      requestCount: 1,
      blockedProductIds: args.blockedProductId ? [args.blockedProductId] : [],
    });
  },
});

/**
 * Internal: add to ingredient queue without auth check.
 * Used by extraction pipeline and internal functions.
 */
export const internalAddToIngredientQueue = internalMutation({
  args: {
    canonicalName: v.string(),
    priority: v.number(),
    blockedProductId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ingredient_queue")
      .withIndex("by_canonicalName", (q) =>
        q.eq("canonicalName", args.canonicalName)
      )
      .first();

    if (existing && (existing.status === "pending" || existing.status === "scoring")) {
      const updatedBlocked = args.blockedProductId
        ? [...existing.blockedProductIds, args.blockedProductId]
        : existing.blockedProductIds;

      await ctx.db.patch(existing._id, {
        requestCount: existing.requestCount + 1,
        priority: Math.min(existing.priority, args.priority),
        blockedProductIds: updatedBlocked,
      });
      return existing._id;
    }

    return await ctx.db.insert("ingredient_queue", {
      canonicalName: args.canonicalName,
      status: "pending",
      priority: args.priority,
      requestCount: 1,
      blockedProductIds: args.blockedProductId ? [args.blockedProductId] : [],
    });
  },
});

/**
 * Internal mutation: update the status of an ingredient queue entry.
 */
export const updateIngredientQueueStatus = internalMutation({
  args: {
    queueId: v.id("ingredient_queue"),
    status: v.union(
      v.literal("pending"),
      v.literal("scoring"),
      v.literal("done"),
      v.literal("failed")
    ),
    ingredientId: v.optional(v.id("ingredients")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.ingredientId !== undefined) patch.ingredientId = args.ingredientId;
    if (args.errorMessage !== undefined) patch.errorMessage = args.errorMessage;
    if (args.status === "done") patch.blockedProductIds = [];
    await ctx.db.patch(args.queueId, patch);
  },
});

/**
 * Internal mutation: delete a single ingredient queue entry.
 * Called after successful scoring — done entries are not retained.
 */
export const deleteIngredientQueueEntry = internalMutation({
  args: { queueId: v.id("ingredient_queue") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.queueId);
  },
});

/**
 * Admin mutation: delete all existing "done" entries (one-time cleanup).
 */
export const deleteAllDoneEntries = internalMutation({
  args: {},
  handler: async (ctx) => {
    const done = await ctx.db
      .query("ingredient_queue")
      .withIndex("by_status_and_priority", (q) => q.eq("status", "done"))
      .collect();
    for (const entry of done) {
      await ctx.db.delete(entry._id);
    }
    return { deleted: done.length };
  },
});

/**
 * Internal query: get a single ingredient queue entry by ID.
 */
export const getIngredientQueueEntry = internalQuery({
  args: { queueId: v.id("ingredient_queue") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.queueId);
  },
});

/**
 * Admin query: list ingredient queue entries with optional status filter.
 * Sorted by priority ASC then requestCount DESC (most-blocked first).
 */
export const listIngredientQueue = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("scoring"),
        v.literal("done"),
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.status !== undefined) {
      return await ctx.db
        .query("ingredient_queue")
        .withIndex("by_status_and_priority", (q) =>
          q.eq("status", args.status!)
        )
        .order("asc")
        .take(100);
    }

    return await ctx.db
      .query("ingredient_queue")
      .order("asc")
      .take(100);
  },
});

/**
 * Internal query: get the next batch of pending ingredient queue entries.
 * Sorted by requestCount DESC (most-blocked ingredients first).
 */
export const getPendingIngredientBatch = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ingredient_queue")
      .withIndex("by_status_and_priority", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(args.limit ?? 20);
  },
});
