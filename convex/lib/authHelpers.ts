import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Check whether a user has admin access.
 * Used by requireAdmin to verify the isAdmin flag on the users table.
 */
export const checkIsAdmin = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await ctx.db.get(args.userId as Id<"users">);
    return user?.isAdmin === true;
  },
});
