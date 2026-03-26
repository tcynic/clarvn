import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * Log or update today's wellness check-in.
 * Upserts by (userId, date) — calling twice on the same day updates the entry.
 */
export const logCheckin = mutation({
  args: {
    date: v.string(), // "YYYY-MM-DD"
    mood: v.number(), // 1-5
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    if (args.mood < 1 || args.mood > 5) {
      throw new ConvexError("Mood must be between 1 and 5");
    }
    const userId = identity.tokenIdentifier;

    const existing = await ctx.db
      .query("daily_checkins")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        mood: args.mood,
        notes: args.notes,
      });
      return existing._id;
    }

    return await ctx.db.insert("daily_checkins", {
      userId,
      date: args.date,
      mood: args.mood,
      notes: args.notes,
    });
  },
});

/**
 * Get today's check-in for the current user.
 * Returns null if not checked in today or not authenticated.
 */
export const getTodayCheckin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.tokenIdentifier;

    // Compute today's date as YYYY-MM-DD in local time
    const today = new Date().toISOString().slice(0, 10);

    return await ctx.db
      .query("daily_checkins")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .first();
  },
});
