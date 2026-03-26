import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * One-time backfill: converts user_profiles.motivation from string to string[].
 *
 * Run manually from the Convex dashboard:
 *   Functions → internal.migrations.backfillMotivation.run → Run Function
 *
 * Processes up to 100 documents per invocation and self-schedules
 * until all records are converted.
 */
export const run = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("user_profiles")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    let converted = 0;
    for (const profile of results.page) {
      if (typeof profile.motivation === "string") {
        const asArray = profile.motivation
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
        await ctx.db.patch(profile._id, { motivation: asArray });
        converted++;
      }
    }

    if (!results.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillMotivation.run,
        { cursor: results.continueCursor }
      );
    }

    return {
      converted,
      done: results.isDone,
    };
  },
});
