import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";

interface GameSessionStats {
  higherLower: { wagered: number; won: number; lost: number };
  blackjack: { wagered: number; won: number; lost: number };
  baccarat: { wagered: number; won: number; lost: number };
  slots: { wagered: number; won: number; lost: number };
  roulette: { wagered: number; won: number; lost: number };
  craps: { wagered: number; won: number; lost: number };
  war: { wagered: number; won: number; lost: number };
}

interface SessionStatsContextType {
  stats: GameSessionStats;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
  gamesPlayed: {
    higherLower: number;
    blackjack: number;
    baccarat: number;
    slots: number;
    roulette: number;
    craps: number;
    war: number;
  };
  biggestWin: number;
  recordBet: (
    game: keyof GameSessionStats,
    amount: number,
    result: "win" | "loss",
  ) => void;
  resetSession: () => void;
}

const SessionStatsContext = createContext<SessionStatsContextType | null>(null);

const initialStats: GameSessionStats = {
  higherLower: { wagered: 0, won: 0, lost: 0 },
  blackjack: { wagered: 0, won: 0, lost: 0 },
  baccarat: { wagered: 0, won: 0, lost: 0 },
  slots: { wagered: 0, won: 0, lost: 0 },
  roulette: { wagered: 0, won: 0, lost: 0 },
  craps: { wagered: 0, won: 0, lost: 0 },
  war: { wagered: 0, won: 0, lost: 0 },
};

export function SessionStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<GameSessionStats>(initialStats);
  const [gamesPlayed, setGamesPlayed] = useState({
    higherLower: 0,
    blackjack: 0,
    baccarat: 0,
    slots: 0,
    roulette: 0,
    craps: 0,
    war: 0,
  });
  const [biggestWin, setBiggestWin] = useState(0);

  const recordBet = useCallback(
    (game: keyof GameSessionStats, amount: number, result: "win" | "loss") => {
      setStats((prev) => {
        const newStats = { ...prev };
        newStats[game] = {
          wagered: prev[game].wagered + amount,
          won: result === "win" ? prev[game].won + amount : prev[game].won,
          lost: result === "loss" ? prev[game].lost + amount : prev[game].lost,
        };
        return newStats;
      });

      setGamesPlayed((prev) => ({
        ...prev,
        [game]: prev[game] + 1,
      }));

      if (result === "win" && amount > biggestWin) {
        setBiggestWin(amount);
      }
    },
    [biggestWin],
  );

  const resetSession = useCallback(() => {
    setStats(initialStats);
    setGamesPlayed({
      higherLower: 0,
      blackjack: 0,
      baccarat: 0,
      slots: 0,
      roulette: 0,
      craps: 0,
      war: 0,
    });
    setBiggestWin(0);
  }, []);

  const totalWagered = Object.values(stats).reduce((a, g) => a + g.wagered, 0);
  const totalWon = Object.values(stats).reduce((a, g) => a + g.won, 0);
  const totalLost = Object.values(stats).reduce((a, g) => a + g.lost, 0);
  const netProfit = totalWon - totalLost;

  return (
    <SessionStatsContext.Provider
      value={{
        stats,
        totalWagered,
        totalWon,
        totalLost,
        netProfit,
        gamesPlayed,
        biggestWin,
        recordBet,
        resetSession,
      }}
    >
      {children}
    </SessionStatsContext.Provider>
  );
}

export function useSessionStats() {
  const context = useContext(SessionStatsContext);
  if (!context) {
    throw new Error(
      "useSessionStats must be used within a SessionStatsProvider",
    );
  }
  return context;
}
