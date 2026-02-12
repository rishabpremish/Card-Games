import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DAILY_TIP_LIMIT = 1000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function settlePreviousPendingRound(
  ctx: any,
  userId: any,
  game: string,
  settledAt: number,
) {
  const pending = await ctx.db
    .query("matchHistory")
    .withIndex("by_user_game_and_time", (q: any) =>
      q.eq("userId", userId).eq("game", game),
    )
    .order("desc")
    .take(1);

  const last = pending[0];
  if (!last || last.outcome !== "pending") return;

  await ctx.db.patch(last._id, {
    payout: 0,
    net: -last.bet,
    outcome: "loss",
    settledAt,
  });
}

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

    const now = Date.now();

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
      timestamp: now,
    });

    if (args.game !== "Poker") {
      await settlePreviousPendingRound(ctx, args.userId, args.game, now);
      await ctx.db.insert("matchHistory", {
        userId: args.userId,
        game: args.game,
        bet: args.amount,
        payout: 0,
        net: -args.amount,
        outcome: "pending",
        timestamp: now,
      });
    }

    // ── Economy auto-tracking ──
    // Track total wagered for VIP tiers
    const newWagered = (user.totalWagered ?? 0) + args.amount;
    const vipPatch: Record<string, any> = { totalWagered: newWagered };
    // Auto-update VIP tier
    const tiers = [
      { tier: "diamond", min: 500000 },
      { tier: "platinum", min: 100000 },
      { tier: "gold", min: 25000 },
      { tier: "silver", min: 5000 },
    ];
    let newTier = "bronze";
    for (const t of tiers) {
      if (newWagered >= t.min) {
        newTier = t.tier;
        break;
      }
    }
    if (newTier !== (user.vipTier ?? "bronze")) vipPatch.vipTier = newTier;
    await ctx.db.patch(args.userId, vipPatch);

    // Update challenge progress (wager + play)
    const challengeNow = Date.now();
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();
    for (const ch of challenges) {
      if (ch.completed || ch.expiresAt <= challengeNow) continue;
      let inc = 0;
      if (ch.challengeId.includes("wager")) inc = args.amount;
      else if (ch.challengeId.includes("play")) inc = 1;
      if (inc > 0) {
        const p = Math.min(ch.progress + inc, ch.target);
        await ctx.db.patch(ch._id, { progress: p, completed: p >= ch.target });
      }
    }

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

    const now = Date.now();

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
      timestamp: now,
    });

    const isPokerCashout =
      args.game === "Poker" &&
      (args.description ?? "").toLowerCase().includes("cash out");

    if (!isPokerCashout) {
      const recent = await ctx.db
        .query("matchHistory")
        .withIndex("by_user_game_and_time", (q: any) =>
          q.eq("userId", args.userId).eq("game", args.game),
        )
        .order("desc")
        .take(1);
      const pendingRound = recent[0];

      if (pendingRound && pendingRound.outcome === "pending") {
        const net = args.amount - pendingRound.bet;
        const outcome = net > 0 ? "win" : net < 0 ? "loss" : ("push" as const);
        await ctx.db.patch(pendingRound._id, {
          payout: args.amount,
          net,
          outcome,
          settledAt: now,
          metadata: {
            ...(pendingRound.metadata ?? {}),
            notes: args.description,
          },
        });
      } else {
        await ctx.db.insert("matchHistory", {
          userId: args.userId,
          game: args.game,
          bet: 0,
          payout: args.amount,
          net: args.amount,
          outcome: args.amount > 0 ? "win" : "push",
          timestamp: now,
          settledAt: now,
          metadata: { notes: args.description },
        });
      }
    }

    // ── Economy auto-tracking on win ──
    if (args.amount > 0) {
      // Award XP (roughly 1 XP per $10 won, minimum 5)
      const xpGain = Math.max(5, Math.round(args.amount / 10));
      const newXP = (user.xp ?? 0) + xpGain;
      let level = 1,
        remaining = newXP;
      while (remaining >= level * 100) {
        remaining -= level * 100;
        level++;
      }
      await ctx.db.patch(args.userId, { xp: newXP, level });

      // Update win challenges
      const challengeNow = Date.now();
      const challenges = await ctx.db
        .query("challenges")
        .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
        .collect();
      for (const ch of challenges) {
        if (ch.completed || ch.expiresAt <= challengeNow) continue;
        let inc = 0;
        if (ch.challengeId.includes("win") && !ch.challengeId.includes("big"))
          inc = 1;
        if (ch.challengeId.includes("big_win") && args.amount >= 200)
          inc = args.amount;
        if (inc > 0) {
          const p = Math.min(ch.progress + inc, ch.target);
          await ctx.db.patch(ch._id, {
            progress: p,
            completed: p >= ch.target,
          });
        }
      }
    }

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

// Tip a friend (peer-to-peer transfer)
export const tipFriend = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, { userId, targetUserId, amount }) => {
    if (userId === targetUserId) throw new Error("Cannot tip yourself");
    if (!Number.isFinite(amount) || amount <= 0)
      throw new Error("Amount must be positive");
    const amt = Math.round(amount * 100) / 100;

    const from = await ctx.db.get(userId);
    const to = await ctx.db.get(targetUserId);
    if (!from || !to) throw new Error("User not found");

    const isFriend = (from.friends ?? []).includes(targetUserId);
    if (!isFriend) throw new Error("You can only tip friends");
    if (from.wallet < amt) throw new Error("Insufficient funds");

    const now = Date.now();
    const today = startOfDay(now);
    const lastTip = startOfDay(from.lastTipDate ?? 0);
    const sentToday = lastTip === today ? (from.tipSentToday ?? 0) : 0;
    if (sentToday + amt > DAILY_TIP_LIMIT)
      throw new Error(`Daily tip limit is $${DAILY_TIP_LIMIT}`);

    const fromNew = Math.round((from.wallet - amt) * 100) / 100;
    const toNew = Math.round((to.wallet + amt) * 100) / 100;

    await ctx.db.patch(userId, {
      wallet: fromNew,
      lastTipDate: now,
      tipSentToday: sentToday + amt,
    });
    await ctx.db.patch(targetUserId, { wallet: toNew });

    await ctx.db.insert("transactions", {
      userId,
      type: "transfer",
      amount: amt,
      balanceBefore: from.wallet,
      balanceAfter: fromNew,
      game: "Friends",
      description: `Tipped ${to.username} $${amt}`,
      timestamp: now,
    });

    await ctx.db.insert("transactions", {
      userId: targetUserId,
      type: "transfer",
      amount: amt,
      balanceBefore: to.wallet,
      balanceAfter: toNew,
      game: "Friends",
      description: `Received tip from ${from.username} $${amt}`,
      timestamp: now,
    });

    // Notification for receiver
    await ctx.db.insert("notifications", {
      userId: targetUserId,
      kind: "tip_received",
      message: `💸 ${from.username} tipped you $${amt}`,
      createdAt: now,
      read: false,
    });

    return { success: true, fromWallet: fromNew, toWallet: toNew };
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

export const getMatchHistory = query({
  args: {
    userId: v.id("users"),
    game: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(50, args.limit || 50);

    if (args.game) {
      const rows = await ctx.db
        .query("matchHistory")
        .withIndex("by_user_game_and_time", (q) =>
          q.eq("userId", args.userId).eq("game", args.game as string),
        )
        .order("desc")
        .take(Math.max(limit * 3, 50));

      return rows.filter((r) => r.outcome !== "pending").slice(0, limit);
    }

    const knownGames = [
      "Blackjack",
      "Baccarat",
      "Craps",
      "Roulette",
      "Slots",
      "War",
      "Higher-Lower",
      "War - Surrender Refund",
      "Poker",
    ];

    const perGameRows = await Promise.all(
      knownGames.map((game) =>
        ctx.db
          .query("matchHistory")
          .withIndex("by_user_game_and_time", (q) =>
            q.eq("userId", args.userId).eq("game", game),
          )
          .order("desc")
          .take(Math.max(limit, 20)),
      ),
    );

    return perGameRows
      .flat()
      .filter((r) => r.outcome !== "pending")
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
});

export const recordMatchRound = mutation({
  args: {
    userId: v.id("users"),
    game: v.string(),
    bet: v.number(),
    payout: v.number(),
    timestamp: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        roomCode: v.optional(v.string()),
        notes: v.optional(v.string()),
        handNumber: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ts = args.timestamp ?? Date.now();
    const bet = Math.max(0, Math.round(args.bet * 100) / 100);
    const payout = Math.max(0, Math.round(args.payout * 100) / 100);
    const net = Math.round((payout - bet) * 100) / 100;
    const outcome = net > 0 ? "win" : net < 0 ? "loss" : "push";

    await settlePreviousPendingRound(ctx, args.userId, args.game, ts);

    const id = await ctx.db.insert("matchHistory", {
      userId: args.userId,
      game: args.game,
      bet,
      payout,
      net,
      outcome,
      timestamp: ts,
      settledAt: ts,
      metadata: args.metadata,
    });

    return { success: true, id };
  },
});
