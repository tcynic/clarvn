import { v } from "convex/values";
import { mutation, internalMutation, internalQuery, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./lib/auth";

// Public mutation: add a product to the scoring queue with deduplication.
// Unauthenticated callers may only use source="user_request".
export const addToQueue = mutation({
  args: {
    productName: v.string(),
    source: v.union(
      v.literal("user_request"),
      v.literal("admin_add"),
      v.literal("alternative")
    ),
    priority: v.number(),
    sourceProductId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // admin_add requires auth; user_request and alternative are allowed unauthenticated
    // (alternatives are auto-queued by the scoring pipeline and bulk seed script)
    if (args.source === "admin_add") {
      await requireAdmin(ctx);
    }

    // Deduplication: check for existing pending or scoring entry by name
    const existing = await ctx.db
      .query("scoring_queue")
      .withIndex("by_productName", (q) =>
        q.eq("productName", args.productName)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "scoring")
        )
      )
      .first();

    if (existing) {
      // Increment requestCount on the existing entry
      await ctx.db.patch(existing._id, {
        requestCount: existing.requestCount + 1,
        // Escalate priority if a user is requesting something already queued
        priority: Math.min(existing.priority, args.priority),
      });
      return existing._id;
    }

    // Insert new queue entry
    return await ctx.db.insert("scoring_queue", {
      productName: args.productName,
      source: args.source,
      priority: args.priority,
      requestCount: 1,
      sourceProductId: args.sourceProductId,
      status: "pending",
    });
  },
});

// Internal mutation: add to queue without auth check (for deploy-key callers like seed scripts).
export const internalAddToQueue = internalMutation({
  args: {
    productName: v.string(),
    source: v.union(
      v.literal("user_request"),
      v.literal("admin_add"),
      v.literal("alternative")
    ),
    priority: v.number(),
    sourceProductId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scoring_queue")
      .withIndex("by_productName", (q) =>
        q.eq("productName", args.productName)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "scoring")
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        requestCount: existing.requestCount + 1,
        priority: Math.min(existing.priority, args.priority),
      });
      return existing._id;
    }

    return await ctx.db.insert("scoring_queue", {
      productName: args.productName,
      source: args.source,
      priority: args.priority,
      requestCount: 1,
      sourceProductId: args.sourceProductId,
      status: "pending",
    });
  },
});

// Internal mutation: update the status of a queue entry.
export const updateQueueStatus = internalMutation({
  args: {
    queueId: v.id("scoring_queue"),
    status: v.union(
      v.literal("pending"),
      v.literal("scoring"),
      v.literal("done"),
      v.literal("failed")
    ),
    productId: v.optional(v.id("products")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.productId !== undefined) patch.productId = args.productId;
    if (args.errorMessage !== undefined) patch.errorMessage = args.errorMessage;
    if (args.status === "done") patch.scoredAt = Date.now();
    await ctx.db.patch(args.queueId, patch);
  },
});

// Internal mutation: delete a queue entry by ID.
export const deleteQueueEntry = internalMutation({
  args: { queueId: v.id("scoring_queue") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.queueId);
  },
});

// Internal query: get a single queue entry by ID (used by scoreProduct action).
export const getQueueEntry = internalQuery({
  args: { queueId: v.id("scoring_queue") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.queueId);
  },
});

// Internal query: get the next batch of pending queue entries for server-side batch processing.
// Sorted by requestCount descending (most-requested items first).
export const getPendingBatch = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scoring_queue")
      .withIndex("by_status_and_requestCount", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(args.limit ?? 20);
  },
});

// Public query: get scored alternatives for a given product.
// Looks up the alternatives list from alternatives_queue, then resolves each
// alternative name to a product document from the products table.
export const getAlternativesForProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("scoring_queue")
      .withIndex("by_sourceProductId_and_status", (q) =>
        q.eq("sourceProductId", args.productId).eq("status", "done")
      )
      .filter((q) => q.eq(q.field("source"), "alternative"))
      .collect();

    const products = await Promise.all(
      entries
        .filter((e) => e.productId != null)
        .map((e) => ctx.db.get(e.productId!))
    );

    return products.filter(Boolean);
  },
});

// Internal mutation: delete all done entries from scoring_queue (one-time backlog cleanup).
// Run from the Convex dashboard — no auth required as it's internal-only.
export const purgeDoneEntries = internalMutation({
  args: {},
  handler: async (ctx) => {
    const done = await ctx.db
      .query("scoring_queue")
      .withIndex("by_status_and_priority", (q) => q.eq("status", "done"))
      .collect();
    await Promise.all(done.map((e) => ctx.db.delete(e._id)));
    return { deleted: done.length };
  },
});

// Internal query: get the singleton batch state document.
export const getBatchState = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("batch_state").first();
  },
});

// Internal mutation: upsert the singleton batch state.
export const setBatchState = internalMutation({
  args: {
    isRunning: v.boolean(),
    shouldStop: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("batch_state").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("batch_state", args);
    }
  },
});

// Admin-only query: list queue entries, paginated, sorted by priority asc.
// Optional status filter. Results within same priority sorted by requestCount desc.
export const listQueue = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("scoring"),
        v.literal("done"),
        v.literal("failed")
      )
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let q = ctx.db.query("scoring_queue");

    if (args.status !== undefined) {
      // Use the composite index for filtered queries
      const results = await ctx.db
        .query("scoring_queue")
        .withIndex("by_status_and_priority", (q) =>
          q.eq("status", args.status!)
        )
        .order("asc")
        .paginate(args.paginationOpts);
      return results;
    }

    // No status filter: paginate all entries
    return await q.order("asc").paginate(args.paginationOpts);
  },
});
