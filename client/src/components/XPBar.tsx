import { useEconomy } from "../hooks/useEconomy";
import { useAuth } from "../hooks/useAuth";

const VIP_COLORS: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
  diamond: "#b9f2ff",
};

const VIP_EMOJI: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💠",
  diamond: "💎",
};

export default function XPBar() {
  const { user } = useAuth();
  const { playerStats } = useEconomy();

  if (!user || !playerStats) return null;

  const pct = playerStats.xpNeeded > 0
    ? Math.round((playerStats.xpInLevel / playerStats.xpNeeded) * 100)
    : 0;

  const tier = playerStats.vipTier ?? "bronze";

  return (
    <>
      <style>{`
        .xp-bar-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 28px;
          background: rgba(15, 15, 35, 0.95);
          border-bottom: 2px solid var(--retro-yellow, #ffd700);
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 10px;
          z-index: 200;
          font-family: 'Press Start 2P', cursive;
          font-size: 0.4rem;
          color: #fff;
        }
        .xp-vip-badge {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.35rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: bold;
        }
        .xp-level-label {
          color: var(--retro-yellow, #ffd700);
          white-space: nowrap;
        }
        .xp-track {
          flex: 1;
          height: 10px;
          background: rgba(255,255,255,0.1);
          border-radius: 5px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #ffd700, #ff8c00);
          border-radius: 5px;
          transition: width 0.5s ease;
        }
        .xp-text {
          white-space: nowrap;
          color: rgba(255,255,255,0.7);
        }
        .xp-emoji {
          font-size: 0.6rem;
        }
      `}</style>
      <div className="xp-bar-container">
        <span
          className="xp-vip-badge"
          style={{
            background: VIP_COLORS[tier],
            color: tier === "diamond" || tier === "silver" ? "#000" : "#fff",
          }}
        >
          {VIP_EMOJI[tier]} {tier}
        </span>
        <span className="xp-level-label">LV {playerStats.level}</span>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="xp-text">
          {playerStats.xpInLevel}/{playerStats.xpNeeded} XP
        </span>
        {playerStats.equippedEmoji && (
          <span className="xp-emoji">
            {playerStats.equippedEmoji === "emoji_crown" ? "👑" :
             playerStats.equippedEmoji === "emoji_fire" ? "🔥" :
             playerStats.equippedEmoji === "emoji_diamond" ? "💎" :
             playerStats.equippedEmoji === "emoji_skull" ? "💀" : ""}
          </span>
        )}
      </div>
    </>
  );
}
