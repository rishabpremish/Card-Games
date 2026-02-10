import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table with authentication and wallet
  users: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    wallet: v.number(),
    createdAt: v.number(),
    lastLogin: v.number(),
    // Track when wallet was last reset to $500
    lastWalletReset: v.optional(v.number()),
    // User settings synced across devices
    settings: v.object({
      theme: v.optional(v.string()),
      cardSpeed: v.optional(v.string()),
      pushed: v.optional(v.boolean()),
      confirmNewGame: v.optional(v.boolean()),
      aceValue: v.optional(v.number()),
      scanlines: v.optional(v.boolean()),
      vignette: v.optional(v.boolean()),
      bgAnimation: v.optional(v.boolean()),
      highContrast: v.optional(v.boolean()),
      reduceMotion: v.optional(v.boolean()),
      soundEnabled: v.optional(v.boolean()),
    }),
    // Daily bonus tracking
    lastDailyBonusDate: v.optional(v.number()),
    dailyLoginStreak: v.optional(v.number()),
    // Achievements tracking
    achievements: v.optional(v.array(v.string())),
    bestStreak: v.optional(v.number()),
    lastStreakUpdate: v.optional(v.number()),
    isAdmin: v.optional(v.boolean()),
  }).index("by_username", ["username"]),

  // Weekly leaderboards (Sunday to Saturday)
  leaderboards: defineTable({
    weekStart: v.number(), // Unix timestamp of Sunday 00:00:00
    weekEnd: v.number(), // Unix timestamp of Saturday 23:59:59
    userId: v.id("users"),
    username: v.string(),
    balance: v.number(),
    rank: v.number(),
    isCurrent: v.boolean(), // True for current week
  })
    .index("by_week_and_rank", ["weekStart", "rank"])
    .index("by_user_and_week", ["userId", "weekStart"])
    .index("by_current", ["isCurrent", "rank"]),

  // Prize pot for weekly competition
  prizePots: defineTable({
    weekStart: v.number(),
    weekEnd: v.number(),
    amount: v.number(),
    description: v.optional(v.string()),
    isCurrent: v.boolean(),
  })
    .index("by_week", ["weekStart"])
    .index("by_current", ["isCurrent"]),

  // Transaction history for auditing
  transactions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("bet"),
      v.literal("win"),
      v.literal("cashout"),
      v.literal("deposit"),
      v.literal("admin_adjustment"),
    ),
    amount: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    game: v.optional(v.string()),
    description: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),
});
