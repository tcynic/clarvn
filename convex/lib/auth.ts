import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

type AuthCtx = MutationCtx | QueryCtx | ActionCtx;

/**
 * Throws ConvexError if the caller is not an authenticated admin.
 *
 * To restrict to specific emails, set ADMIN_EMAILS env var as
 * comma-separated list: e.g. "admin@example.com,other@example.com"
 * If not set, any authenticated user is treated as admin.
 *
 * With @convex-dev/auth Password provider, identity.email is not in
 * JWT claims. We extract the user ID from tokenIdentifier and look
 * up the email from the users table.
 */
export async function requireAdmin(ctx: AuthCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const adminEmails = process.env.ADMIN_EMAILS;
  if (adminEmails) {
    const allowed = adminEmails.split(",").map((e) => e.trim().toLowerCase());

    // First try identity.email (populated by some auth providers)
    let email = identity.email?.toLowerCase();

    // If not on the JWT, look up from the users table.
    // @convex-dev/auth tokenIdentifier format: "<issuer>|<userId>|<sessionId>"
    if (!email) {
      const parts = identity.tokenIdentifier.split("|");
      // The user ID is the second segment (index 1)
      const userId = parts.length >= 2 ? parts[1] : undefined;
      if (userId) {
        const userEmail: string | null = await ctx.runQuery(
          internal.lib.authHelpers.getUserEmail,
          { userId }
        );
        email = userEmail?.toLowerCase();
      }
    }

    if (!email || !allowed.includes(email)) {
      throw new ConvexError("Unauthorized: not an admin");
    }
  }
}
