import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Look up a user's email from the users table by their user ID.
 * Used by requireAdmin to resolve emails when the auth provider
 * (e.g. @convex-dev/auth Password) doesn't include email in JWT claims.
 */
export const getUserEmail = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<string | null> => {
    const user = await ctx.db.get(args.userId as Id<"users">);
    return user?.email ?? null;
  },
});
