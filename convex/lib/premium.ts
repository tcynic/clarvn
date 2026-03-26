import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Extract the stable user _id from the auth tokenIdentifier.
 * @convex-dev/auth format: "<issuer>|<userId>|<sessionId>"
 * The middle segment is the Convex users table _id.
 */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const parts = identity.tokenIdentifier.split("|");
  const userId = parts.length >= 2 ? parts[1] : undefined;
  if (!userId) return null;
  return userId as Id<"users">;
}

/**
 * Returns true only when BOTH conditions are met:
 *   1. user.isPremium === true
 *   2. user.premiumUntil > Date.now()
 *
 * Never rely on the isPremium boolean alone — always validate expiry server-side.
 */
export async function isPremiumUser(
  ctx: QueryCtx | MutationCtx
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  const user = await ctx.db.get(userId);
  if (!user) return false;
  return (
    user.isPremium === true &&
    typeof user.premiumUntil === "number" &&
    user.premiumUntil > Date.now()
  );
}

/**
 * Throws a ConvexError if the current user is not premium.
 * Use at the top of premium-gated query/mutation handlers.
 */
export async function requirePremium(
  ctx: QueryCtx | MutationCtx
): Promise<void> {
  const premium = await isPremiumUser(ctx);
  if (!premium) {
    throw new ConvexError("Premium subscription required");
  }
}

