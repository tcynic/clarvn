import { v } from "convex/values";
import { mutation, internalMutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "./lib/premium";
import { normalizeMotivation } from "./lib/normalizeMotivation";

/**
 * Extracts the stable Convex user ID from the auth token.
 * @convex-dev/auth tokenIdentifier format: "<issuer>|<userId>|<sessionId>"
 */
function extractUserId(tokenIdentifier: string): string {
  const parts = tokenIdentifier.split("|");
  return parts.length >= 2 ? parts[1] : tokenIdentifier;
}

/**
 * Create or save a profile from the new chip-based onboarding flow.
 * Called after the user signs up (or updates their profile).
 * Auth required — userId derived server-side.
 */
export const createProfileFromOnboarding = mutation({
  args: {
    motivation: v.array(v.string()),
    conditions: v.array(v.string()),
    sensitivities: v.array(v.string()),
    dietaryRestrictions: v.optional(v.array(v.string())),
    lifeStage: v.optional(v.string()),
    householdMembers: v.optional(
      v.array(
        v.object({
          role: v.string(),
          ageRange: v.optional(v.string()),
        })
      )
    ),
    ingredientsToAvoid: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = extractUserId(identity.tokenIdentifier);

    const existing = await ctx.db
      .query("user_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const profileData = {
      userId,
      motivation: args.motivation,
      conditions: args.conditions,
      sensitivities: args.sensitivities,
      dietaryRestrictions: args.dietaryRestrictions ?? [],
      lifeStage: args.lifeStage ?? "just_me",
      householdMembers: args.householdMembers ?? [],
      ingredientsToAvoid: args.ingredientsToAvoid ?? [],
    };

    if (existing) {
      await ctx.db.patch(existing._id, profileData);
      return existing._id;
    }

    return await ctx.db.insert("user_profiles", profileData);
  },
});

/**
 * Create or update the current user's health profile.
 * Auth required — userId derived server-side from identity.
 */
export const createOrUpdateProfile = mutation({
  args: {
    motivation: v.optional(v.union(v.string(), v.array(v.string()))),
    conditions: v.array(v.string()),
    sensitivities: v.array(v.string()),
    dietaryRestrictions: v.optional(v.array(v.string())),
    lifeStage: v.optional(v.string()),
    householdMembers: v.optional(
      v.array(
        v.object({
          role: v.string(),
          ageRange: v.optional(v.string()),
        })
      )
    ),
    ingredientsToAvoid: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = extractUserId(identity.tokenIdentifier);

    const existing = await ctx.db
      .query("user_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const patch = {
      motivation: normalizeMotivation(args.motivation),
      conditions: args.conditions,
      sensitivities: args.sensitivities,
      dietaryRestrictions: args.dietaryRestrictions,
      lifeStage: args.lifeStage,
      householdMembers: args.householdMembers,
      ingredientsToAvoid: args.ingredientsToAvoid,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("user_profiles", { userId, ...patch });
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
    const userId = extractUserId(identity.tokenIdentifier);

    const existing = await ctx.db
      .query("user_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        motivation: normalizeMotivation(args.motivation),
        conditions: args.conditions,
        sensitivities: args.sensitivities,
      });
      return existing._id;
    }

    return await ctx.db.insert("user_profiles", {
      userId,
      motivation: normalizeMotivation(args.motivation),
      conditions: args.conditions,
      sensitivities: args.sensitivities,
    });
  },
});

/**
 * Returns true if the current user has isAdmin: true on their users document.
 * Used by the consumer app to conditionally show the admin nav link.
 */
export const getIsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const parts = identity.tokenIdentifier.split("|");
    const userId = parts.length >= 2 ? parts[1] : undefined;
    if (!userId) return false;
    const user = await ctx.db.get(userId as Id<"users">);
    return user?.isAdmin === true;
  },
});

/**
 * Get the current user's health profile.
 * Returns null if no profile exists yet (user hasn't completed onboarding).
 * Normalizes `motivation` to always return string[].
 */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = extractUserId(identity.tokenIdentifier);

    const profile = await ctx.db
      .query("user_profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    return {
      ...profile,
      motivation: normalizeMotivation(profile.motivation),
    };
  },
});

/**
 * Returns the current user's subscription status for UI state management.
 * isPremium reflects the server-side check (both isPremium AND premiumUntil > now).
 * daysRemaining is populated for trialing users.
 */
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const now = Date.now();
    const isActive =
      user.isPremium === true &&
      typeof user.premiumUntil === "number" &&
      user.premiumUntil > now;

    const daysRemaining =
      isActive && typeof user.premiumUntil === "number"
        ? Math.ceil((user.premiumUntil - now) / (1000 * 60 * 60 * 24))
        : null;

    return {
      isPremium: isActive,
      premiumUntil: user.premiumUntil ?? null,
      planTier: user.planTier ?? "free",
      subscriptionStatus: user.subscriptionStatus ?? null,
      isComplimentary: user.isComplimentary ?? false,
      daysRemaining,
    };
  },
});
