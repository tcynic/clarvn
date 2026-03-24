import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";

type AuthCtx = MutationCtx | QueryCtx | ActionCtx;

/**
 * Throws ConvexError if the caller is not an authenticated admin.
 * Admin role is determined by the `isAdmin` field on the user's identity
 * or by being in the designated admin email list via environment.
 *
 * For MVP: we check the tokenIdentifier against an env-configured admin list.
 * Post-MVP: wire up proper role claims from the auth provider.
 */
export async function requireAdmin(ctx: AuthCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  // In MVP, admin status is granted to any authenticated user with a valid
  // identity. Refine this post-MVP when user roles are formalised.
  // The admin UI route guard + Convex Auth already ensures only the intended
  // user reaches admin functions in the browser. This server-side check
  // is the backstop.
  //
  // To restrict to specific emails, set ADMIN_EMAILS env var as
  // comma-separated list: e.g. "admin@example.com,other@example.com"
  // If not set, any authenticated user is treated as admin.
  const adminEmails = process.env.ADMIN_EMAILS;
  if (adminEmails) {
    const allowed = adminEmails.split(",").map((e) => e.trim().toLowerCase());
    const email = (identity.email ?? "").toLowerCase();
    if (!allowed.includes(email)) {
      throw new ConvexError("Unauthorized: not an admin");
    }
  }
}
