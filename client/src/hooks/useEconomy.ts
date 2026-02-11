import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./useAuth";
import type { Id } from "../../convex/_generated/dataModel";

export function useEconomy() {
  const { user } = useAuth();

  // ── Queries ──
  const playerStats = useQuery(
    api.economy.getPlayerStats,
    user ? { userId: user.userId } : "skip",
  );

  const challenges = useQuery(
    api.economy.getChallenges,
    user ? { userId: user.userId } : "skip",
  );

  const activeLoans = useQuery(
    api.economy.getActiveLoans,
    user ? { userId: user.userId } : "skip",
  );

  const friends = useQuery(
    api.economy.getFriends,
    user ? { userId: user.userId } : "skip",
  );

  const shopData = useQuery(
    api.economy.getShopItems,
    user ? { userId: user.userId } : "skip",
  );

  // ── Mutations ──
  const addXPMutation = useMutation(api.economy.addXP);
  const addWageredMutation = useMutation(api.economy.addWagered);
  const updateVIPTierMutation = useMutation(api.economy.updateVIPTier);
  const generateDailyMutation = useMutation(
    api.economy.generateDailyChallenges,
  );
  const updateProgressMutation = useMutation(
    api.economy.updateChallengeProgress,
  );
  const claimRewardMutation = useMutation(api.economy.claimChallengeReward);
  const buyItemMutation = useMutation(api.economy.buyShopItem);
  const equipItemMutation = useMutation(api.economy.equipItem);
  const takeLoanMutation = useMutation(api.economy.takeLoan);
  const repayLoanMutation = useMutation(api.economy.repayLoan);
  const sendFriendReqMutation = useMutation(api.economy.sendFriendRequest);
  const acceptFriendReqMutation = useMutation(api.economy.acceptFriendRequest);

  // ── Helper wrappers ──
  const uid = () => {
    if (!user) throw new Error("Not logged in");
    return user.userId;
  };

  const addXP = (amount: number) => addXPMutation({ userId: uid(), amount });
  const addWagered = (amount: number) =>
    addWageredMutation({ userId: uid(), amount });
  const updateVIPTier = () => updateVIPTierMutation({ userId: uid() });

  const generateDailyChallenges = () =>
    generateDailyMutation({ userId: uid() });
  const updateChallengeProgress = (challengeType: string, amount: number) =>
    updateProgressMutation({ userId: uid(), challengeType, amount });
  const claimChallengeReward = (challengeId: Id<"challenges">) =>
    claimRewardMutation({ userId: uid(), challengeId });

  const buyShopItem = (itemId: string) =>
    buyItemMutation({ userId: uid(), itemId });
  const equipItem = (itemId: string) =>
    equipItemMutation({ userId: uid(), itemId });

  const takeLoan = (amount: number) =>
    takeLoanMutation({ userId: uid(), amount });
  const repayLoan = (loanId: Id<"loans">, amount: number) =>
    repayLoanMutation({ userId: uid(), loanId, amount });

  const sendFriendRequest = (targetUserId: Id<"users">) =>
    sendFriendReqMutation({ userId: uid(), targetUserId });
  const acceptFriendRequest = (fromUserId: Id<"users">) =>
    acceptFriendReqMutation({ userId: uid(), fromUserId });

  // Convenience: call after every bet placed in a game
  const trackBet = async (amount: number) => {
    try {
      await addWagered(amount);
      await updateChallengeProgress("wager", amount);
      await updateChallengeProgress("play", 1);
      await updateVIPTier();
    } catch {
      /* fire-and-forget */
    }
  };

  // Convenience: call after every win
  const trackWin = async (winAmount: number) => {
    try {
      const xpGain = Math.max(5, Math.round(winAmount / 10));
      await addXP(xpGain);
      await updateChallengeProgress("win", 1);
      if (winAmount >= 200) await updateChallengeProgress("big_win", winAmount);
    } catch {
      /* fire-and-forget */
    }
  };

  return {
    // data
    playerStats,
    challenges: challenges ?? [],
    activeLoans: activeLoans ?? [],
    friends: friends?.friends ?? [],
    friendRequests: friends?.requests ?? [],
    shopItems: shopData?.items ?? [],
    ownedItems: shopData?.owned ?? [],

    // xp / vip
    addXP,
    addWagered,
    updateVIPTier,

    // challenges
    generateDailyChallenges,
    updateChallengeProgress,
    claimChallengeReward,

    // shop
    buyShopItem,
    equipItem,

    // loans
    takeLoan,
    repayLoan,

    // friends
    sendFriendRequest,
    acceptFriendRequest,

    // game integration helpers
    trackBet,
    trackWin,
  };
}
