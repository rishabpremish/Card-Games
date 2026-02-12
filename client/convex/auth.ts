import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper: Get start of week (Sunday 00:00:00)
function getWeekStart(date: Date): number {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Read-only: effective wallet for display (use in queries; no DB writes)
function getEffectiveWallet(user: any): number {
  const now = Date.now();
  const currentWeekStart = getWeekStart(new Date(now));
  const lastReset = user.lastWalletReset || 0;
  const lastResetWeek = getWeekStart(new Date(lastReset));
  if (lastResetWeek < currentWeekStart) {
    return 500;
  }
  return user.wallet;
}

// Helper: Check and reset wallet if needed (mutations only; performs DB writes)
async function checkAndResetWallet(ctx: any, user: any): Promise<number> {
  const now = Date.now();
  const currentWeekStart = getWeekStart(new Date(now));
  const lastReset = user.lastWalletReset || 0;
  const lastResetWeek = getWeekStart(new Date(lastReset));

  // Only reset if it hasn't been done for the current week
  if (lastResetWeek < currentWeekStart) {
    const oldWallet = user.wallet;
    await ctx.db.patch(user._id, {
      wallet: 500,
      lastWalletReset: now,
    });

    // Log the reset transaction
    await ctx.db.insert("transactions", {
      userId: user._id,
      type: "admin_adjustment",
      amount: 500 - oldWallet,
      balanceBefore: oldWallet,
      balanceAfter: 500,
      description: "Weekly wallet reset to $500",
      timestamp: now,
    });

    return 500;
  }

  return user.wallet;
}

// Register new user
export const register = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate username
    if (args.username.length < 3) {
      throw new Error("Username must be at least 3 characters");
    }
    if (args.username.length > 20) {
      throw new Error("Username must be at most 20 characters");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(args.username)) {
      throw new Error(
        "Username can only contain letters, numbers, and underscores",
      );
    }

    // Validate password
    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Check if username already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", args.username.toLowerCase()),
      )
      .first();

    if (existing) {
      throw new Error("Username already taken");
    }

    // Store password directly
    const passwordHash = args.password;

    // Create user with default settings
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      username: args.username.toLowerCase(),
      passwordHash,
      wallet: 500, // Starting balance
      createdAt: now,
      lastLogin: now,
      lastWalletReset: now, // Set to now so they don't get reset immediately
      settings: {
        theme: "default",
        cardSpeed: "normal",
        pushed: true,
        confirmNewGame: true,
        aceValue: 1,
        scanlines: true,
        vignette: true,
        bgAnimation: true,
        highContrast: false,
        reduceMotion: false,
      },
      isAdmin: false,
    });

    return {
      userId,
      username: args.username.toLowerCase(),
      wallet: 500,
    };
  },
});

// Login user
export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", args.username.toLowerCase()),
      )
      .first();

    if (!user) {
      throw new Error("Invalid username or password");
    }

    // Verify password
    if (args.password !== user.passwordHash) {
      throw new Error("Invalid username or password");
    }

    // Check and reset wallet if needed
    const currentWallet = await checkAndResetWallet(ctx, user);

    // Update last login
    await ctx.db.patch(user._id, {
      lastLogin: Date.now(),
    });

    return {
      userId: user._id,
      username: user.username,
      wallet: currentWallet,
      settings: user.settings,
      isAdmin: user.isAdmin || false,
    };
  },
});

// Get current user by ID
export const getCurrentUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    // Use read-only effective wallet (queries cannot write; reset happens on next login)
    const currentWallet = getEffectiveWallet(user);

    return {
      userId: user._id,
      username: user.username,
      wallet: currentWallet,
      settings: user.settings,
      isAdmin: user.isAdmin || false,
    };
  },
});

// Update user settings
export const updateSettings = mutation({
  args: {
    userId: v.id("users"),
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
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      settings: { ...user.settings, ...args.settings },
    });

    return { success: true };
  },
});

// Unlock achievement
export const unlockAchievement = mutation({
  args: {
    userId: v.id("users"),
    achievementId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    const currentAchievements = (user.achievements as string[]) || [];

    if (!currentAchievements.includes(args.achievementId)) {
      await ctx.db.patch(args.userId, {
        achievements: [...currentAchievements, args.achievementId],
      });
    }

    return { success: true };
  },
});

// Claim daily bonus
export const claimDailyBonus = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const today = new Date(now).setHours(0, 0, 0, 0);
    const lastBonus = user.lastDailyBonusDate || 0;
    const lastBonusDay = new Date(lastBonus).setHours(0, 0, 0, 0);

    // Check if already claimed today
    if (lastBonusDay === today) {
      throw new Error("Daily bonus already claimed today");
    }

    // Calculate streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();

    let newStreak = 1;
    if (lastBonusDay === yesterdayTime) {
      newStreak = (user.dailyLoginStreak || 0) + 1;
    }

    // Calculate bonus amount (increases with streak, max at 7 days)
    const baseBonus = 10;
    const streakBonus = Math.min(newStreak * 2, 14); // Max 14 extra
    const totalBonus = baseBonus + streakBonus;

    const newWallet = user.wallet + totalBonus;

    await ctx.db.patch(args.userId, {
      wallet: newWallet,
      lastDailyBonusDate: now,
      dailyLoginStreak: newStreak,
    });

    // Log transaction
    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "deposit",
      amount: totalBonus,
      balanceBefore: user.wallet,
      balanceAfter: newWallet,
      description: `Daily bonus (Day ${newStreak})`,
      timestamp: now,
    });

    return {
      amount: totalBonus,
      streak: newStreak,
      newBalance: newWallet,
    };
  },
});

// Check if daily bonus is available
export const checkDailyBonus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return { available: false, streak: 0 };
    }

    const now = Date.now();
    const today = new Date(now).setHours(0, 0, 0, 0);
    const lastBonus = user.lastDailyBonusDate || 0;
    const lastBonusDay = new Date(lastBonus).setHours(0, 0, 0, 0);

    // Check if already claimed today
    const available = lastBonusDay !== today;

    return {
      available,
      streak: user.dailyLoginStreak || 0,
    };
  },
});
