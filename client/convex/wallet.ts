import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user's wallet balance
export const getWallet = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    return {
      wallet: user.wallet,
      username: user.username,
    };
  },
});

// Place a bet (deduct from wallet)
export const placeBet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    game: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new Error("Bet amount must be positive");
    }

    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.wallet < args.amount) {
      throw new Error("Insufficient funds");
    }

    let newWallet = Math.round((user.wallet - args.amount) * 100) / 100;
    // Ensure we don't have floating point precision errors showing as tiny values
    if (Math.abs(newWallet) < 0.01) {
      newWallet = 0;
    }

    // Update wallet
    await ctx.db.patch(args.userId, {
      wallet: newWallet,
    });

    // Log transaction
    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "bet",
      amount: args.amount,
      balanceBefore: user.wallet,
      balanceAfter: newWallet,
      game: args.game,
      timestamp: Date.now(),
    });

    return {
      wallet: newWallet,
      success: true,
    };
  },
});

// Add winnings to wallet
export const addWinnings = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    game: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount < 0) {
      throw new Error("Winning amount cannot be negative");
    }

    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    const newWallet = Math.round((user.wallet + args.amount) * 100) / 100;

    // Update wallet
    await ctx.db.patch(args.userId, {
      wallet: newWallet,
    });

    // Log transaction
    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "win",
      amount: args.amount,
      balanceBefore: user.wallet,
      balanceAfter: newWallet,
      game: args.game,
      description: args.description,
      timestamp: Date.now(),
    });

    return {
      wallet: newWallet,
      success: true,
    };
  },
});

// Cash out (same as add winnings but different type)
export const cashOut = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    game: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new Error("Cash out amount must be positive");
    }

    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    const newWallet = Math.round((user.wallet + args.amount) * 100) / 100;

    // Update wallet
    await ctx.db.patch(args.userId, {
      wallet: newWallet,
    });

    // Log transaction
    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "cashout",
      amount: args.amount,
      balanceBefore: user.wallet,
      balanceAfter: newWallet,
      game: args.game,
      timestamp: Date.now(),
    });

    return {
      wallet: newWallet,
      success: true,
    };
  },
});

// Update wallet directly (for dev tools / admin)
export const updateWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    const newWallet = Math.max(0, Math.round(args.amount * 100) / 100);

    // Update wallet
    await ctx.db.patch(args.userId, {
      wallet: newWallet,
    });

    // Log transaction
    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "admin_adjustment",
      amount: newWallet - user.wallet,
      balanceBefore: user.wallet,
      balanceAfter: newWallet,
      description: args.description || "Admin adjustment",
      timestamp: Date.now(),
    });

    return {
      wallet: newWallet,
      success: true,
    };
  },
});

// Get transaction history
export const getTransactions = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return transactions;
  },
});
