import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { AchievementId } from "../utils/achievements";

interface AchievementsContextType {
  achievements: AchievementId[];
  unlockAchievement: (id: AchievementId) => void;
  hasAchievement: (id: AchievementId) => boolean;
  winStreak: number;
  incrementWinStreak: () => void;
  resetWinStreak: () => void;
  sessionWins: number;
  incrementSessionWins: () => void;
  sessionLosses: number;
  incrementSessionLosses: () => void;
  bankerWins: number;
  incrementBankerWins: () => void;
  tieWins: number;
  incrementTieWins: () => void;
}

const AchievementsContext = createContext<AchievementsContextType | null>(null);

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementId[]>([]);
  const [winStreak, setWinStreak] = useState(0);
  const [sessionWins, setSessionWins] = useState(0);
  const [sessionLosses, setSessionLosses] = useState(0);
  const [bankerWins, setBankerWins] = useState(0);
  const [tieWins, setTieWins] = useState(0);

  const unlockAchievementMutation = useMutation(api.auth.unlockAchievement);

  // Load achievements from user data
  useEffect(() => {
    if (user?.achievements) {
      setAchievements(user.achievements as AchievementId[]);
    }
    if (user?.bestStreak) {
      setWinStreak(user.bestStreak);
    }
  }, [user?.achievements, user?.bestStreak]);

  const unlockAchievement = useCallback(async (id: AchievementId) => {
    if (achievements.includes(id) || !user?.userId) return;

    const newAchievements = [...achievements, id];
    setAchievements(newAchievements);

    // Store in localStorage for immediate persistence
    localStorage.setItem(`achievements_${user.userId}`, JSON.stringify(newAchievements));

    // Sync to Convex
    try {
      await unlockAchievementMutation({ userId: user.userId, achievementId: id });
    } catch (error) {
      console.error("Failed to sync achievement:", error);
    }
  }, [achievements, user?.userId, unlockAchievementMutation]);

  const hasAchievement = useCallback((id: AchievementId) => {
    return achievements.includes(id);
  }, [achievements]);

  const incrementWinStreak = useCallback(() => {
    setWinStreak((prev) => {
      const newStreak = prev + 1;
      
      // Check for streak achievements
      if (newStreak === 3) {
        unlockAchievement("win_streak_3");
      } else if (newStreak === 5) {
        unlockAchievement("win_streak_5");
      }

      return newStreak;
    });
  }, [unlockAchievement]);

  const resetWinStreak = useCallback(() => {
    setWinStreak(0);
  }, []);

  const incrementSessionWins = useCallback(() => {
    setSessionWins((prev) => {
      const newWins = prev + 1;
      if (newWins === 10) {
        unlockAchievement("lucky_day");
      }
      return newWins;
    });
    unlockAchievement("first_win");
  }, [unlockAchievement]);

  const incrementSessionLosses = useCallback(() => {
    setSessionLosses((prev) => prev + 1);
  }, []);

  const incrementBankerWins = useCallback(() => {
    setBankerWins((prev) => {
      const newWins = prev + 1;
      if (newWins === 3) {
        unlockAchievement("baccarat_banker");
      }
      return newWins;
    });
  }, [unlockAchievement]);

  const incrementTieWins = useCallback(() => {
    setTieWins((prev) => prev + 1);
    unlockAchievement("baccarat_tie");
  }, [unlockAchievement]);

  return (
    <AchievementsContext.Provider
      value={{
        achievements,
        unlockAchievement,
        hasAchievement,
        winStreak,
        incrementWinStreak,
        resetWinStreak,
        sessionWins,
        incrementSessionWins,
        sessionLosses,
        incrementSessionLosses,
        bankerWins,
        incrementBankerWins,
        tieWins,
        incrementTieWins,
      }}
    >
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementsContext);
  if (!context) {
    throw new Error("useAchievements must be used within an AchievementsProvider");
  }
  return context;
}
