import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * Get the current user's shopping list items, ordered by creation time.
 */
export const getMyList = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.tokenIdentifier;
    return await ctx.db
      .query("shopping_list_items")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(200);
  },
});

/**
 * Add an item to the current user's shopping list.
 * No-op if an item with the same name already exists.
 */
export const addItem = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = identity.tokenIdentifier;

    // Deduplicate
    const existing = await ctx.db
      .query("shopping_list_items")
      .withIndex("by_userId_and_name", (q) =>
        q.eq("userId", userId).eq("name", args.name)
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("shopping_list_items", {
      userId,
      name: args.name,
      requestSent: false,
    });
  },
});

/**
 * Mark an item as having had a scoring request sent.
 */
export const markRequested = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = identity.tokenIdentifier;

    const item = await ctx.db
      .query("shopping_list_items")
      .withIndex("by_userId_and_name", (q) =>
        q.eq("userId", userId).eq("name", args.name)
      )
      .first();
    if (item) {
      await ctx.db.patch(item._id, { requestSent: true });
    }
  },
});

/**
 * Swap one item's name for another (used when picking an alternative).
 */
export const swapItem = mutation({
  args: { currentName: v.string(), newName: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = identity.tokenIdentifier;

    const item = await ctx.db
      .query("shopping_list_items")
      .withIndex("by_userId_and_name", (q) =>
        q.eq("userId", userId).eq("name", args.currentName)
      )
      .first();
    if (item) {
      await ctx.db.patch(item._id, {
        name: args.newName,
        requestSent: false,
      });
    }
  },
});

/**
 * Clear all shopping list items for the current user.
 */
export const clearList = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = identity.tokenIdentifier;

    const items = await ctx.db
      .query("shopping_list_items")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(200);

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
  },
});
