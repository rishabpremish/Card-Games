import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./useAuth";

export function useWallet() {
  const { user } = useAuth();

  const walletQuery = useQuery(
    api.wallet.getWallet,
    user ? { userId: user.userId } : "skip",
  );

  const placeBetMutation = useMutation(api.wallet.placeBet);
  const addWinningsMutation = useMutation(api.wallet.addWinnings);
  const cashOutMutation = useMutation(api.wallet.cashOut);
  const updateWalletMutation = useMutation(api.wallet.updateWallet);

  const placeBet = async (amount: number, game: string) => {
    if (!user) {
      throw new Error("User not logged in");
    }

    try {
      const result = await placeBetMutation({
        userId: user.userId,
        amount,
        game,
      });
      return result;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const addWinnings = async (
    amount: number,
    game: string,
    description?: string,
  ) => {
    if (!user) {
      throw new Error("User not logged in");
    }

    try {
      const result = await addWinningsMutation({
        userId: user.userId,
        amount,
        game,
        description,
      });
      return result;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const cashOut = async (amount: number, game: string) => {
    if (!user) {
      throw new Error("User not logged in");
    }

    try {
      const result = await cashOutMutation({
        userId: user.userId,
        amount,
        game,
      });
      return result;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const updateWallet = async (amount: number, description?: string) => {
    if (!user) {
      throw new Error("User not logged in");
    }

    try {
      const result = await updateWalletMutation({
        userId: user.userId,
        amount,
        description,
      });
      return result;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  return {
    wallet: walletQuery?.wallet ?? (user?.wallet || 0),
    username: walletQuery?.username ?? (user?.username || ""),
    placeBet,
    addWinnings,
    cashOut,
    updateWallet,
    isLoading: walletQuery === undefined && !!user,
  };
}
