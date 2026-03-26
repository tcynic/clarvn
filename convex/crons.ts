import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process pending scoring queue entries every 5 minutes.
// The action is a no-op if the batch is already running.
crons.interval(
  "process scoring queue",
  { minutes: 5 },
  internal.scoring.internalProcessAllPending,
  {}
);

// Expire free trials that have passed their premiumUntil date.
// Gracefully downgrades users to free tier — no data loss.
crons.interval(
  "expire trials",
  { hours: 1 },
  internal.users.expireTrials,
  {}
);

export default crons;
