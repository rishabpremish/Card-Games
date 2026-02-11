import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Update leaderboard every hour
crons.interval(
  "update leaderboard",
  { hours: 1 },
  internal.leaderboard.updateLeaderboard,
);

// Weekly wallet reset - every Sunday at midnight (00:00)
crons.weekly(
  "weekly wallet reset",
  {
    dayOfWeek: "sunday",
    hourUTC: 0,
    minuteUTC: 0,
  },
  internal.leaderboard.weeklyWalletReset,
);

// Daily overdue loan penalty - deduct 10% of balance for overdue loans
crons.daily(
  "overdue loan penalty",
  { hourUTC: 0, minuteUTC: 0 },
  internal.economy.processOverdueLoans,
);

export default crons;
