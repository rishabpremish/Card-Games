import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Update leaderboard every hour
crons.interval(
  "update leaderboard",
  { hours: 1 },
  internal.leaderboard.updateLeaderboard,
);

export default crons;
