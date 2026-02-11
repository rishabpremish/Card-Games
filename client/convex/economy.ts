import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════
//  XP & LEVELING
// ═══════════════════════════════════

function xpForLevel(level: number): number {
  return level * 100;
}

function getLevelFromXP(totalXP: number): { level: number; xpInLevel: number; xpNeeded: number } {
  let level = 1;
  let remaining = totalXP;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, xpInLevel: remaining, xpNeeded: xpForLevel(level) };
}

export const getPlayerStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const xp = user.xp ?? 0;
    const { level, xpInLevel, xpNeeded } = getLevelFromXP(xp);
    return {
      xp, level, xpInLevel, xpNeeded,
      vipTier: user.vipTier ?? "bronze",
      totalWagered: user.totalWagered ?? 0,
      ownedItems: user.ownedItems ?? [],
      equippedTheme: user.equippedTheme,
      equippedCardBack: user.equippedCardBack,
      equippedEmoji: user.equippedEmoji,
    };
  },
});

export const addXP = mutation({
  args: { userId: v.id("users"), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const newXP = (user.xp ?? 0) + amount;
    const oldLevel = getLevelFromXP(user.xp ?? 0).level;
    const newLevel = getLevelFromXP(newXP).level;
    await ctx.db.patch(userId, { xp: newXP, level: newLevel });
    return { newXP, oldLevel, newLevel, leveledUp: newLevel > oldLevel };
  },
});

// ═══════════════════════════════════
//  VIP TIERS
// ═══════════════════════════════════

const VIP_TIERS = [
  { tier: "bronze", minWagered: 0 },
  { tier: "silver", minWagered: 5000 },
  { tier: "gold", minWagered: 25000 },
  { tier: "platinum", minWagered: 100000 },
  { tier: "diamond", minWagered: 500000 },
];

export const updateVIPTier = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const wagered = user.totalWagered ?? 0;
    let newTier = "bronze";
    for (const t of VIP_TIERS) {
      if (wagered >= t.minWagered) newTier = t.tier;
    }
    if (newTier !== (user.vipTier ?? "bronze")) {
      await ctx.db.patch(userId, { vipTier: newTier });
    }
    return newTier;
  },
});

export const addWagered = mutation({
  args: { userId: v.id("users"), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const newTotal = (user.totalWagered ?? 0) + amount;
    await ctx.db.patch(userId, { totalWagered: newTotal });
    return newTotal;
  },
});

// ═══════════════════════════════════
//  CHALLENGES
// ═══════════════════════════════════

const DAILY_CHALLENGES = [
  { id: "daily_win_3", title: "Win 3 Games", description: "Win 3 games today", target: 3, reward: 50, rewardType: "xp" as const },
  { id: "daily_wager_500", title: "Wager $500", description: "Wager a total of $500 today", target: 500, reward: 100, rewardType: "xp" as const },
  { id: "daily_play_5", title: "Play 5 Games", description: "Play 5 games today", target: 5, reward: 30, rewardType: "xp" as const },
  { id: "daily_big_win", title: "Big Winner", description: "Win $200+ in a single game", target: 200, reward: 25, rewardType: "money" as const },
];

// Weekly challenge templates (for future use)
const _WEEKLY_CHALLENGES = [
  { id: "weekly_win_20", title: "20 Wins", description: "Win 20 games this week", target: 20, reward: 500, rewardType: "xp" as const },
  { id: "weekly_wager_5000", title: "High Roller", description: "Wager $5,000 this week", target: 5000, reward: 100, rewardType: "money" as const },
  { id: "weekly_play_50", title: "Dedicated", description: "Play 50 games this week", target: 50, reward: 300, rewardType: "xp" as const },
];

export const getChallenges = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const challenges = await ctx.db.query("challenges")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return challenges.filter((c: any) => c.expiresAt > now || c.completed);
  },
});

export const generateDailyChallenges = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await ctx.db.query("challenges")
      .withIndex("by_user_and_type", (q: any) => q.eq("userId", userId).eq("type", "daily"))
      .collect();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const hasToday = existing.some((c: any) => c.createdAt >= todayStart.getTime());
    if (hasToday) return existing.filter((c: any) => c.type === "daily" && c.expiresAt > now);

    const shuffled = [...DAILY_CHALLENGES].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 3);

    const created = [];
    for (const ch of picked) {
      const id = await ctx.db.insert("challenges", {
        userId,
        challengeId: ch.id,
        type: "daily",
        title: ch.title,
        description: ch.description,
        target: ch.target,
        progress: 0,
        reward: ch.reward,
        rewardType: ch.rewardType,
        completed: false,
        claimed: false,
        expiresAt: endOfDay.getTime(),
        createdAt: now,
      });
      created.push(id);
    }
    return created;
  },
});

export const updateChallengeProgress = mutation({
  args: { userId: v.id("users"), challengeType: v.string(), amount: v.number() },
  handler: async (ctx, { userId, challengeType, amount }) => {
    const now = Date.now();
    const challenges = await ctx.db.query("challenges")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const active = challenges.filter((c: any) => !c.completed && c.expiresAt > now);

    for (const ch of active) {
      let shouldUpdate = false;
      if (challengeType === "win" && ch.challengeId.includes("win") && !ch.challengeId.includes("big")) shouldUpdate = true;
      if (challengeType === "wager" && ch.challengeId.includes("wager")) shouldUpdate = true;
      if (challengeType === "play" && ch.challengeId.includes("play")) shouldUpdate = true;
      if (challengeType === "big_win" && ch.challengeId.includes("big_win")) shouldUpdate = true;

      if (shouldUpdate) {
        const newProgress = Math.min(ch.progress + amount, ch.target);
        await ctx.db.patch(ch._id, { progress: newProgress, completed: newProgress >= ch.target });
      }
    }
  },
});

export const claimChallengeReward = mutation({
  args: { userId: v.id("users"), challengeId: v.id("challenges") },
  handler: async (ctx, { userId, challengeId }) => {
    const challenge = await ctx.db.get(challengeId);
    if (!challenge || challenge.userId !== userId) throw new Error("Not found");
    if (!challenge.completed || challenge.claimed) throw new Error("Cannot claim");

    await ctx.db.patch(challengeId, { claimed: true });

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (challenge.rewardType === "money") {
      await ctx.db.patch(userId, { wallet: user.wallet + challenge.reward });
    } else {
      await ctx.db.patch(userId, { xp: (user.xp ?? 0) + challenge.reward });
    }

    return { reward: challenge.reward, rewardType: challenge.rewardType };
  },
});

// ═══════════════════════════════════
//  SHOP
// ═══════════════════════════════════

export const SHOP_ITEMS = [
  { id: "theme_neon", name: "Neon Theme", category: "theme", price: 500, description: "Bright neon color scheme" },
  { id: "theme_midnight", name: "Midnight Theme", category: "theme", price: 500, description: "Deep blue dark theme" },
  { id: "theme_sunset", name: "Sunset Theme", category: "theme", price: 750, description: "Warm orange & purple" },
  { id: "theme_matrix", name: "Matrix Theme", category: "theme", price: 1000, description: "Green on black hacker look" },
  { id: "cardback_gold", name: "Gold Card Back", category: "cardback", price: 300, description: "Shiny gold card backs" },
  { id: "cardback_diamond", name: "Diamond Card Back", category: "cardback", price: 800, description: "Diamond patterned cards" },
  { id: "cardback_fire", name: "Fire Card Back", category: "cardback", price: 600, description: "Flaming card design" },
  { id: "emoji_crown", name: "Crown Emoji", category: "emoji", price: 200, description: "👑 next to your name" },
  { id: "emoji_fire", name: "Fire Emoji", category: "emoji", price: 200, description: "🔥 next to your name" },
  { id: "emoji_diamond", name: "Diamond Emoji", category: "emoji", price: 400, description: "💎 next to your name" },
  { id: "emoji_skull", name: "Skull Emoji", category: "emoji", price: 300, description: "💀 next to your name" },
];

export const getShopItems = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return { items: SHOP_ITEMS, owned: user?.ownedItems ?? [] };
  },
});

export const buyShopItem = mutation({
  args: { userId: v.id("users"), itemId: v.string() },
  handler: async (ctx, { userId, itemId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const item = SHOP_ITEMS.find((i: any) => i.id === itemId);
    if (!item) throw new Error("Item not found");

    const owned = user.ownedItems ?? [];
    if (owned.includes(itemId)) throw new Error("Already owned");
    if (user.wallet < item.price) throw new Error("Not enough money");

    await ctx.db.patch(userId, {
      wallet: Math.round(user.wallet - item.price),
      ownedItems: [...owned, itemId],
    });

    return { success: true };
  },
});

export const equipItem = mutation({
  args: { userId: v.id("users"), itemId: v.string() },
  handler: async (ctx, { userId, itemId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const owned = user.ownedItems ?? [];
    if (!owned.includes(itemId)) throw new Error("Not owned");

    const item = SHOP_ITEMS.find((i: any) => i.id === itemId);
    if (!item) throw new Error("Item not found");

    const patch: Record<string, string> = {};
    if (item.category === "theme") patch.equippedTheme = itemId;
    else if (item.category === "cardback") patch.equippedCardBack = itemId;
    else if (item.category === "emoji") patch.equippedEmoji = itemId;

    await ctx.db.patch(userId, patch);
    return { success: true };
  },
});

// ═══════════════════════════════════
//  LOANS
// ═══════════════════════════════════

export const getActiveLoans = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("loans")
      .withIndex("by_active", (q: any) => q.eq("userId", userId).eq("isActive", true))
      .collect();
  },
});

export const takeLoan = mutation({
  args: { userId: v.id("users"), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (amount < 100 || amount > 5000) throw new Error("Loan must be $100-$5000");
    const active = await ctx.db.query("loans")
      .withIndex("by_active", (q: any) => q.eq("userId", userId).eq("isActive", true))
      .collect();
    if (active.length > 0) throw new Error("Already have an active loan");

    const interestRate = 0.10;
    const totalOwed = Math.round(amount * (1 + interestRate));
    const dueAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("loans", {
      userId,
      amount,
      interestRate,
      totalOwed,
      repaid: 0,
      isActive: true,
      takenAt: Date.now(),
      dueAt,
    });

    await ctx.db.patch(userId, { wallet: Math.round(user.wallet + amount) });
    return { amount, totalOwed, dueAt };
  },
});

export const repayLoan = mutation({
  args: { userId: v.id("users"), loanId: v.id("loans"), amount: v.number() },
  handler: async (ctx, { userId, loanId, amount }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const loan = await ctx.db.get(loanId);
    if (!loan || loan.userId !== userId || !loan.isActive) throw new Error("Loan not found");

    const remaining = loan.totalOwed - loan.repaid;
    const repay = Math.min(amount, remaining, user.wallet);
    if (repay <= 0) throw new Error("Cannot repay");

    const newRepaid = loan.repaid + repay;
    const fullyPaid = newRepaid >= loan.totalOwed;

    await ctx.db.patch(loanId, { repaid: newRepaid, isActive: !fullyPaid });
    await ctx.db.patch(userId, { wallet: Math.round(user.wallet - repay) });

    return { repaid: repay, remaining: loan.totalOwed - newRepaid, fullyPaid };
  },
});

// ═══════════════════════════════════
//  FRIENDS
// ═══════════════════════════════════

export const searchUsers = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    if (search.length < 2) return [];
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u: any) => u.username.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10)
      .map((u: any) => ({ id: u._id, username: u.username, level: getLevelFromXP(u.xp ?? 0).level, vipTier: u.vipTier ?? "bronze" }));
  },
});

export const sendFriendRequest = mutation({
  args: { userId: v.id("users"), targetUserId: v.id("users") },
  handler: async (ctx, { userId, targetUserId }) => {
    if (userId === targetUserId) throw new Error("Cannot friend yourself");

    const target = await ctx.db.get(targetUserId);
    if (!target) throw new Error("User not found");

    const requests = target.friendRequests ?? [];
    const friends = target.friends ?? [];
    if (friends.includes(userId)) throw new Error("Already friends");
    if (requests.includes(userId)) throw new Error("Request already sent");

    await ctx.db.patch(targetUserId, { friendRequests: [...requests, userId] });
    return { success: true };
  },
});

export const acceptFriendRequest = mutation({
  args: { userId: v.id("users"), fromUserId: v.id("users") },
  handler: async (ctx, { userId, fromUserId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const requests = user.friendRequests ?? [];
    if (!requests.includes(fromUserId)) throw new Error("No request found");

    const myFriends = user.friends ?? [];
    await ctx.db.patch(userId, {
      friends: [...myFriends, fromUserId],
      friendRequests: requests.filter((id: any) => id !== fromUserId),
    });

    const other = await ctx.db.get(fromUserId);
    if (other) {
      const otherFriends = other.friends ?? [];
      await ctx.db.patch(fromUserId, { friends: [...otherFriends, userId] });
    }

    return { success: true };
  },
});

export const getFriends = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { friends: [], requests: [] };

    const friendIds = user.friends ?? [];
    const requestIds = user.friendRequests ?? [];

    const friends = await Promise.all(
      friendIds.map(async (id: any) => {
        const f = await ctx.db.get(id) as any;
        return f && f.username ? { id: f._id, username: f.username, wallet: f.wallet, level: getLevelFromXP(f.xp ?? 0).level, vipTier: f.vipTier ?? "bronze" } : null;
      })
    );

    const requests = await Promise.all(
      requestIds.map(async (id: any) => {
        const f = await ctx.db.get(id) as any;
        return f && f.username ? { id: f._id, username: f.username } : null;
      })
    );

    return {
      friends: friends.filter(Boolean),
      requests: requests.filter(Boolean),
    };
  },
});
