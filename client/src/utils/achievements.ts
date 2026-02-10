export type AchievementId = 
  | "first_blackjack"
  | "first_win"
  | "clear_the_deck"
  | "win_streak_3"
  | "win_streak_5"
  | "high_roller"
  | "baccarat_banker"
  | "baccarat_tie"
  | "lucky_day"
  | "daily_player"
  | "week_streak"
  | "session_winner";

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_blackjack",
    name: "Blackjack!",
    description: "Get your first Blackjack",
    icon: "⭐",
    rarity: "common",
  },
  {
    id: "first_win",
    name: "First Victory",
    description: "Win your first game",
    icon: "🏆",
    rarity: "common",
  },
  {
    id: "clear_the_deck",
    name: "Deck Master",
    description: "Clear all 52 cards in Higher or Lower",
    icon: "🃏",
    rarity: "rare",
  },
  {
    id: "win_streak_3",
    name: "On Fire",
    description: "Win 3 hands in a row",
    icon: "🔥",
    rarity: "rare",
  },
  {
    id: "win_streak_5",
    name: "Unstoppable",
    description: "Win 5 hands in a row",
    icon: "⚡",
    rarity: "epic",
  },
  {
    id: "high_roller",
    name: "High Roller",
    description: "Place a bet of $100 or more",
    icon: "💎",
    rarity: "rare",
  },
  {
    id: "baccarat_banker",
    name: "Banker's Best Friend",
    description: "Win 3 times betting on Banker",
    icon: "🏦",
    rarity: "common",
  },
  {
    id: "baccarat_tie",
    name: "Lightning Strike",
    description: "Win a Tie bet in Baccarat",
    icon: "⚡",
    rarity: "epic",
  },
  {
    id: "lucky_day",
    name: "Lucky Day",
    description: "Win 10 games in one session",
    icon: "🍀",
    rarity: "rare",
  },
  {
    id: "daily_player",
    name: "Daily Player",
    description: "Claim 7 daily bonuses",
    icon: "📅",
    rarity: "common",
  },
  {
    id: "week_streak",
    name: "Dedicated",
    description: "Maintain a 7-day login streak",
    icon: "🔥",
    rarity: "epic",
  },
  {
    id: "session_winner",
    name: "Session Champion",
    description: "End a session with positive profit",
    icon: "👑",
    rarity: "common",
  },
];

export function getAchievementById(id: AchievementId): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getRarityColor(rarity: Achievement["rarity"]): string {
  switch (rarity) {
    case "common":
      return "#888888";
    case "rare":
      return "#3399ff";
    case "epic":
      return "#9933ff";
    case "legendary":
      return "#ff9900";
    default:
      return "#888888";
  }
}
