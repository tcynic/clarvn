import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "./lib/premium";

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Start a 14-day free Premium trial for the current user.
 * No credit card required.
 * Guards: throws if user is already premium or has already used a trial.
 */
export const startTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    if (user.isPremium === true && user.premiumUntil && user.premiumUntil > Date.now()) {
      throw new ConvexError("Already a Premium member");
    }

    if (user.subscriptionStatus === "canceled") {
      throw new ConvexError("Free trial has already been used");
    }

    await ctx.db.patch(userId, {
      isPremium: true,
      subscriptionStatus: "trialing",
      premiumUntil: Date.now() + TRIAL_DURATION_MS,
      planTier: "premium",
    });
  },
});

/**
 * Internal: expire trials that have passed their premiumUntil date.
 * Run hourly via cron. Processes up to 50 users per run.
 */
export const expireTrials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const trialing = await ctx.db
      .query("users")
      .withIndex("by_subscriptionStatus", (q) =>
        q.eq("subscriptionStatus", "trialing")
      )
      .take(50);

    for (const user of trialing) {
      if (user.premiumUntil && user.premiumUntil <= now) {
        await ctx.db.patch(user._id, {
          isPremium: false,
          subscriptionStatus: "canceled",
        });
      }
    }
  },
});
