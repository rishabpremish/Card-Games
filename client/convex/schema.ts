import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table with authentication and wallet
  users: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    wallet: v.number(),
    createdAt: v.number(),
    lastLogin: v.number(),
    // Track when wallet was last reset to $500
    lastWalletReset: v.optional(v.number()),
    // XP & Leveling
    xp: v.optional(v.number()),
    level: v.optional(v.number()),
    // VIP tier: "bronze" | "silver" | "gold" | "platinum" | "diamond"
    vipTier: v.optional(v.string()),
    totalWagered: v.optional(v.number()),
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
    }),
    // Daily bonus tracking
    lastDailyBonusDate: v.optional(v.number()),
    dailyLoginStreak: v.optional(v.number()),
    // Achievements tracking
    achievements: v.optional(v.array(v.string())),
    bestStreak: v.optional(v.number()),
    lastStreakUpdate: v.optional(v.number()),
    isAdmin: v.optional(v.boolean()),
    // Friends
    friends: v.optional(v.array(v.id("users"))),
    friendRequests: v.optional(v.array(v.id("users"))),
    // Shop: owned items (item IDs)
    ownedItems: v.optional(v.array(v.string())),
    equippedTheme: v.optional(v.string()),
    equippedCardBack: v.optional(v.string()),
    equippedEmoji: v.optional(v.string()),

    // Friend tipping limits
    lastTipDate: v.optional(v.number()),
    tipSentToday: v.optional(v.number()),
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
      v.literal("purchase"),
      v.literal("transfer"),
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

  // Daily / Weekly challenges
  challenges: defineTable({
    userId: v.id("users"),
    challengeId: v.string(), // e.g. "daily_win_3", "weekly_wager_1000"
    type: v.union(v.literal("daily"), v.literal("weekly")),
    title: v.string(),
    description: v.string(),
    target: v.number(),
    progress: v.number(),
    reward: v.number(), // XP or money reward
    rewardType: v.union(v.literal("xp"), v.literal("money")),
    completed: v.boolean(),
    claimed: v.boolean(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "type"]),

  // Loans
  loans: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    interestRate: v.number(), // e.g. 0.10 = 10%
    totalOwed: v.number(),
    repaid: v.number(),
    isActive: v.boolean(),
    takenAt: v.number(),
    dueAt: v.number(),
    // Optional per-loan penalty rate (defaults to 10% if missing)
    penaltyRate: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_active", ["userId", "isActive"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    kind: v.string(),
    message: v.string(),
    createdAt: v.number(),
    read: v.boolean(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_read", ["userId", "read", "createdAt"]),

  // Per-round match history
  matchHistory: defineTable({
    userId: v.id("users"),
    game: v.string(),
    bet: v.number(),
    payout: v.number(),
    net: v.number(),
    outcome: v.union(
      v.literal("win"),
      v.literal("loss"),
      v.literal("push"),
      v.literal("pending"),
    ),
    timestamp: v.number(),
    settledAt: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        roomCode: v.optional(v.string()),
        notes: v.optional(v.string()),
        handNumber: v.optional(v.number()),
      }),
    ),
  })
    .index("by_user_and_time", ["userId", "timestamp"])
    .index("by_user_game_and_time", ["userId", "game", "timestamp"]),
});
