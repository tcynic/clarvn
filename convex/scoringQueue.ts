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

// Internal query: get a single queue entry by ID (used by scoreProduct action).
export const getQueueEntry = internalQuery({
  args: { queueId: v.id("scoring_queue") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.queueId);
  },
});

// Public query: list queue entries, paginated, sorted by priority asc.
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
