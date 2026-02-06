import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Helper: Get start of week (Sunday 00:00:00)
function getWeekStart(date: Date): number {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Helper: Get end of week (Saturday 23:59:59)
function getWeekEnd(weekStart: number): number {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// Get current week's leaderboard (real-time from users table)
export const getCurrentLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const weekStart = getWeekStart(new Date(now));

    // Query users directly for real-time balances instead of the
    // cached leaderboards table (which only updates via hourly cron).
    const users = await ctx.db.query("users").collect();

    const sortedUsers = users
      .sort((a, b) => b.wallet - a.wallet)
      .slice(0, 10);

    const entries = sortedUsers.map((user, i) => ({
      userId: user._id,
      username: user.username,
      balance: user.wallet,
      rank: i + 1,
      weekStart,
      weekEnd: getWeekEnd(weekStart),
      isCurrent: true,
    }));

    // Get prize pot for current week
    const prizePot = await ctx.db
      .query("prizePots")
      .withIndex("by_current", (q) => q.eq("isCurrent", true))
      .first();

    return {
      entries,
      weekStart,
      weekEnd: getWeekEnd(weekStart),
      prizePot: prizePot?.amount || 0,
      prizeDescription: prizePot?.description || "",
    };
  },
});

// Get user's rank in current week (real-time)
export const getUserRank = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    const weekStart = getWeekStart(new Date());

    // Count how many users have a higher wallet balance
    const allUsers = await ctx.db.query("users").collect();
    const sorted = allUsers.sort((a, b) => b.wallet - a.wallet);
    const rank = sorted.findIndex((u) => u._id === args.userId) + 1;

    if (rank === 0) return null;

    return {
      userId: args.userId,
      username: user.username,
      balance: user.wallet,
      rank,
      weekStart,
      weekEnd: getWeekEnd(weekStart),
      isCurrent: true,
    };
  },
});

// Get historical leaderboards
export const getHistoricalLeaderboards = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const currentWeekStart = getWeekStart(new Date());

    // Get unique weeks (ordered by most recent)
    const allEntries = await ctx.db
      .query("leaderboards")
      .order("desc")
      .collect();

    // Group by week
    const weekMap = new Map<number, any[]>();
    for (const entry of allEntries) {
      // Skip current week - it should only appear as "Current Week" option
      // Normalize both timestamps to ensure proper comparison
      const entryWeekStart = getWeekStart(new Date(entry.weekStart));
      if (entryWeekStart === currentWeekStart) {
        continue;
      }
      if (!weekMap.has(entry.weekStart)) {
        weekMap.set(entry.weekStart, []);
      }
      weekMap.get(entry.weekStart)!.push(entry);
    }

    // Convert to array and sort by week
    const weeks = Array.from(weekMap.entries())
      .sort((a, b) => b[0] - a[0])
      .slice(0, limit)
      .map(([weekStart, entries]) => {
        // Sort entries by rank
        const sortedEntries = entries
          .sort((a, b) => a.rank - b.rank)
          .slice(0, 10);

        return {
          weekStart,
          weekEnd: getWeekEnd(weekStart),
          entries: sortedEntries,
        };
      });

    return weeks;
  },
});

// Get prize pots history
export const getPrizePots = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const pots = await ctx.db.query("prizePots").order("desc").take(limit);

    return pots;
  },
});

// Update/create prize pot (admin only)
export const updatePrizePot = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.optional(v.string()),
    weekStart: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const user = await ctx.db.get(args.userId);

    if (!user || !user.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const weekStart = args.weekStart || getWeekStart(new Date());
    const weekEnd = getWeekEnd(weekStart);
    const isCurrent = weekStart === getWeekStart(new Date());

    // Check if pot already exists for this week
    const existing = await ctx.db
      .query("prizePots")
      .withIndex("by_week", (q) => q.eq("weekStart", weekStart))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        amount: args.amount,
        description: args.description,
        isCurrent,
      });
      return { success: true, potId: existing._id };
    } else {
      // Create new
      const potId = await ctx.db.insert("prizePots", {
        weekStart,
        weekEnd,
        amount: args.amount,
        description: args.description || "",
        isCurrent,
      });
      return { success: true, potId };
    }
  },
});

// Update leaderboard (called automatically via cron or manually)
export const updateLeaderboard = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const weekStart = getWeekStart(new Date(now));
    const weekEnd = getWeekEnd(weekStart);

    // Get all users
    const users = await ctx.db.query("users").collect();

    // Sort by wallet balance
    const sortedUsers = users.sort((a, b) => b.wallet - a.wallet).slice(0, 100); // Keep top 100

    // Mark previous week's entries as not current
    const previousEntries = await ctx.db
      .query("leaderboards")
      .withIndex("by_current", (q) => q.eq("isCurrent", true))
      .collect();

    for (const entry of previousEntries) {
      if (entry.weekStart !== weekStart) {
        await ctx.db.patch(entry._id, { isCurrent: false });
      }
    }

    // Update or create entries for current week
    for (let i = 0; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];
      const rank = i + 1;

      // Check if entry exists
      const existing = await ctx.db
        .query("leaderboards")
        .withIndex("by_user_and_week", (q) =>
          q.eq("userId", user._id).eq("weekStart", weekStart),
        )
        .first();

      if (existing) {
        // Update
        await ctx.db.patch(existing._id, {
          balance: user.wallet,
          rank,
          isCurrent: true,
        });
      } else {
        // Create
        await ctx.db.insert("leaderboards", {
          weekStart,
          weekEnd,
          userId: user._id,
          username: user.username,
          balance: user.wallet,
          rank,
          isCurrent: true,
        });
      }
    }

    // Update prize pot's isCurrent flag
    const allPots = await ctx.db.query("prizePots").collect();
    for (const pot of allPots) {
      const shouldBeCurrent = pot.weekStart === weekStart;
      if (pot.isCurrent !== shouldBeCurrent) {
        await ctx.db.patch(pot._id, { isCurrent: shouldBeCurrent });
      }
    }

    return { success: true, updatedCount: sortedUsers.length };
  },
});

// Manual trigger for leaderboard update (admin only)
export const triggerLeaderboardUpdate = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const user = await ctx.db.get(args.userId);

    if (!user || !user.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Call internal mutation
    await ctx.scheduler.runAfter(0, "leaderboard:updateLeaderboard" as any);

    return { success: true };
  },
});
