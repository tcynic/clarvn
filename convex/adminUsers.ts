import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const INDEFINITE_PREMIUM = 9_999_999_999_999;

/**
 * Grant premium access to a user (admin only).
 * durationDays: null = indefinite (sentinel value), otherwise days from now.
 */
export const grantPremium = mutation({
  args: {
    userId: v.id("users"),
    durationDays: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const premiumUntil =
      args.durationDays === null
        ? INDEFINITE_PREMIUM
        : Date.now() + args.durationDays * 24 * 60 * 60 * 1000;

    const identity = await ctx.auth.getUserIdentity();
    const parts = identity!.tokenIdentifier.split("|");
    const grantedBy = parts.length >= 2 ? parts[1] : identity!.tokenIdentifier;

    await ctx.db.patch(args.userId, {
      isPremium: true,
      premiumUntil,
      isComplimentary: true,
      grantedBy,
      subscriptionStatus: "active",
    });
  },
});

/**
 * Revoke complimentary premium from a user (admin only).
 * Throws if the account is not isComplimentary — Stripe-paying accounts
 * must be cancelled via Stripe, not this path.
 */
export const revokePremium = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (!user.isComplimentary) {
      throw new Error(
        "Cannot revoke: this account is not a complimentary account. Cancel via Stripe instead."
      );
    }

    await ctx.db.patch(args.userId, {
      isPremium: false,
      premiumUntil: Date.now(),
      isComplimentary: false,
      subscriptionStatus: "canceled",
    });
  },
});

/**
 * Search for a user by exact email address (admin only).
 * Returns the user doc with premium/subscription status fields.
 */
export const searchByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.email.trim()) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .first();

    if (!user) return null;

    const now = Date.now();
    const isPremiumActive =
      user.isPremium === true &&
      typeof user.premiumUntil === "number" &&
      user.premiumUntil > now;

    return {
      _id: user._id,
      name: user.name ?? null,
      email: user.email ?? null,
      isPremium: isPremiumActive,
      premiumUntil: user.premiumUntil ?? null,
      isComplimentary: user.isComplimentary ?? false,
      grantedBy: user.grantedBy ?? null,
      subscriptionStatus: user.subscriptionStatus ?? null,
      planTier: user.planTier ?? null,
    };
  },
});

/**
 * List all users with isComplimentary: true, sorted by premiumUntil ascending
 * (expiring soonest first, so admins can see who to renew).
 */
export const listComplimentary = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db
      .query("users")
      .withIndex("by_isComplimentary", (q) => q.eq("isComplimentary", true))
      .take(200);

    const now = Date.now();
    return users
      .map((user) => ({
        _id: user._id,
        name: user.name ?? null,
        email: user.email ?? null,
        isPremium:
          user.isPremium === true &&
          typeof user.premiumUntil === "number" &&
          user.premiumUntil > now,
        premiumUntil: user.premiumUntil ?? null,
        grantedBy: user.grantedBy ?? null,
        subscriptionStatus: user.subscriptionStatus ?? null,
      }))
      .sort((a, b) => (a.premiumUntil ?? 0) - (b.premiumUntil ?? 0));
  },
});
