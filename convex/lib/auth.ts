import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

type AuthCtx = MutationCtx | QueryCtx | ActionCtx;

/**
 * Throws ConvexError if the caller is not an authenticated admin.
 *
 * Admin status is stored as isAdmin: true on the user document in the
 * users table. Set this field via the Convex dashboard to grant access.
 *
 * @convex-dev/auth tokenIdentifier format: "<issuer>|<userId>|<sessionId>"
 */
export async function requireAdmin(ctx: AuthCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  // Extract userId from the tokenIdentifier (second segment)
  const parts = identity.tokenIdentifier.split("|");
  const userId = parts.length >= 2 ? parts[1] : undefined;

  if (!userId) {
    throw new ConvexError("Could not determine user identity");
  }

  const isAdmin: boolean = await ctx.runQuery(
    internal.lib.authHelpers.checkIsAdmin,
    { userId }
  );

  if (!isAdmin) {
    throw new ConvexError("Unauthorized: not an admin");
  }
}
