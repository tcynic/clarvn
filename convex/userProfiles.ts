import { v } from "convex/values";
import { mutation, internalMutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * Create or update the current user's health profile.
 * Auth required — userId derived server-side from identity.
 */
export const createOrUpdateProfile = mutation({
  args: {
    motivation: v.optional(v.string()),
    conditions: v.array(v.string()),
    sensitivities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // @convex-dev/auth tokenIdentifier format: "<issuer>|<userId>|<sessionId>"
    // Use the stable middle segment so the profile survives across sessions.
    const parts = identity.tokenIdentifier.split("|");
    const userId = parts.length >= 2 ? parts[1] : identity.tokenIdentifier;

    const existing = await ctx.db
      .query("user_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        motivation: args.motivation,
        conditions: args.conditions,
        sensitivities: args.sensitivities,
      });
      return existing._id;
    }

    return await ctx.db.insert("user_profiles", {
      userId,
      motivation: args.motivation,
      conditions: args.conditions,
      sensitivities: args.sensitivities,
    });
  },
});

/**
 * Internal version called by the onboarding action after LLM parsing.
 * Auth is derived server-side; no userId accepted as argument.
 */
export const createOrUpdateProfileInternal = internalMutation({
  args: {
    motivation: v.string(),
    conditions: v.array(v.string()),
    sensitivities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // @convex-dev/auth tokenIdentifier format: "<issuer>|<userId>|<sessionId>"
    const parts = identity.tokenIdentifier.split("|");
    const userId = parts.length >= 2 ? parts[1] : identity.tokenIdentifier;

    const existing = await ctx.db
      .query("user_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        motivation: args.motivation,
        conditions: args.conditions,
        sensitivities: args.sensitivities,
      });
      return existing._id;
    }

    return await ctx.db.insert("user_profiles", {
      userId,
      motivation: args.motivation,
      conditions: args.conditions,
      sensitivities: args.sensitivities,
    });
  },
});

/**
 * Get the current user's health profile.
 * Returns null if no profile exists yet (user hasn't completed onboarding).
 */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // @convex-dev/auth tokenIdentifier format: "<issuer>|<userId>|<sessionId>"
    const parts = identity.tokenIdentifier.split("|");
    const userId = parts.length >= 2 ? parts[1] : identity.tokenIdentifier;

    return await ctx.db
      .query("user_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});
