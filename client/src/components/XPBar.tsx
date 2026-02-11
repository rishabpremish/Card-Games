import { useState } from "react";
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
  const [expanded, setExpanded] = useState(false);

  if (!user || !playerStats) return null;

  const pct =
    playerStats.xpNeeded > 0
      ? Math.round((playerStats.xpInLevel / playerStats.xpNeeded) * 100)
      : 0;

  const tier = playerStats.vipTier ?? "bronze";

  return (
    <>
      <style>{`
        .xp-toggle-btn {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 150;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(15, 15, 35, 0.95);
          border: 3px solid var(--retro-yellow, #ffd700);
          padding: 10px 18px;
          cursor: pointer;
          font-family: 'Press Start 2P', cursive;
          font-size: 0.7rem;
          color: var(--retro-yellow, #ffd700);
          box-shadow: 4px 4px 0 rgba(255,215,0,0.25);
          transition: transform 0.15s, box-shadow 0.15s;
          user-select: none;
        }
        .xp-toggle-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 rgba(255,215,0,0.35);
        }
        .xp-toggle-vip {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .xp-toggle-mini-bar {
          width: 60px;
          height: 6px;
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
          overflow: hidden;
        }
        .xp-toggle-mini-fill {
          height: 100%;
          background: linear-gradient(90deg, #ffd700, #ff8c00);
          border-radius: 3px;
          transition: width 0.5s;
        }

        .xp-panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 30, 0.88);
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: xpFadeIn 0.2s ease-out;
        }
        @keyframes xpFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .xp-panel {
          background: var(--bg-primary, #0f0f23);
          border: 3px solid var(--retro-yellow, #ffd700);
          border-radius: 12px;
          padding: 36px;
          max-width: 460px;
          width: 92vw;
          font-family: 'Press Start 2P', cursive;
          box-shadow: 8px 8px 0 rgba(255,215,0,0.18);
          animation: xpSlideUp 0.25s ease-out;
        }
        @keyframes xpSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .xp-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .xp-panel-title {
          font-size: 1.1rem;
          color: var(--retro-yellow, #ffd700);
          text-shadow: 2px 2px 0 rgba(255,0,255,0.3);
          margin: 0;
        }
        .xp-panel-close {
          background: none;
          border: 2px solid #ff4444;
          color: #ff4444;
          font-family: 'Press Start 2P', cursive;
          font-size: 0.8rem;
          cursor: pointer;
          padding: 6px 10px;
          transition: all 0.15s;
        }
        .xp-panel-close:hover {
          background: #ff4444;
          color: #fff;
        }

        .xp-panel-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .xp-panel-label {
          color: rgba(255,255,255,0.5);
          font-size: 0.6rem;
        }
        .xp-panel-value {
          color: #fff;
          font-size: 0.75rem;
        }

        .xp-panel-track {
          width: 100%;
          height: 22px;
          background: rgba(255,255,255,0.08);
          border-radius: 11px;
          border: 2px solid rgba(255,255,255,0.18);
          overflow: hidden;
          margin: 10px 0 8px;
        }
        .xp-panel-fill {
          height: 100%;
          background: linear-gradient(90deg, #ffd700, #ff8c00);
          border-radius: 11px;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(255,215,0,0.4);
        }
        .xp-panel-xp-text {
          text-align: center;
          color: rgba(255,255,255,0.6);
          font-size: 0.55rem;
          margin-bottom: 8px;
        }

        .xp-panel-divider {
          margin: 20px 0;
          border: none;
          border-top: 2px solid rgba(255,255,255,0.1);
        }

        .xp-panel-vip-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.3);
        }
        .xp-panel-vip-tiers {
          color: rgba(255,255,255,0.3);
          font-size: 0.42rem;
          margin-top: 14px;
          line-height: 2;
        }
      `}</style>

      {/* Floating toggle button — bottom left */}
      <div className="xp-toggle-btn" onClick={() => setExpanded(true)}>
        <span
          className="xp-toggle-vip"
          style={{
            background: VIP_COLORS[tier],
            color: tier === "diamond" || tier === "silver" ? "#000" : "#fff",
          }}
        >
          {VIP_EMOJI[tier]}
        </span>
        <span>LV {playerStats.level}</span>
        <div className="xp-toggle-mini-bar">
          <div className="xp-toggle-mini-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Expanded panel overlay */}
      {expanded && (
        <div className="xp-panel-overlay" onClick={() => setExpanded(false)}>
          <div className="xp-panel" onClick={(e) => e.stopPropagation()}>
            <div className="xp-panel-header">
              <h2 className="xp-panel-title">⭐ Level & XP</h2>
              <button
                className="xp-panel-close"
                onClick={() => setExpanded(false)}
              >
                ✕
              </button>
            </div>

            <div className="xp-panel-row">
              <span className="xp-panel-label">Level</span>
              <span
                className="xp-panel-value"
                style={{ color: "#ffd700", fontSize: "1rem" }}
              >
                {playerStats.level}
              </span>
            </div>

            <div className="xp-panel-row">
              <span className="xp-panel-label">Total XP</span>
              <span className="xp-panel-value">
                {(playerStats.totalXp ?? 0).toLocaleString()}
              </span>
            </div>

            <div>
              <div className="xp-panel-track">
                <div className="xp-panel-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="xp-panel-xp-text">
                {playerStats.xpInLevel} / {playerStats.xpNeeded} XP to next
                level
              </div>
            </div>

            <hr className="xp-panel-divider" />

            <div className="xp-panel-row">
              <span className="xp-panel-label">VIP Tier</span>
              <span
                className="xp-panel-vip-badge"
                style={{
                  background: VIP_COLORS[tier],
                  color:
                    tier === "diamond" || tier === "silver" ? "#000" : "#fff",
                }}
              >
                {VIP_EMOJI[tier]} {tier}
              </span>
            </div>

            <div className="xp-panel-row">
              <span className="xp-panel-label">Total Wagered</span>
              <span className="xp-panel-value" style={{ color: "#00ff88" }}>
                ${(playerStats.totalWagered ?? 0).toLocaleString()}
              </span>
            </div>

            <p className="xp-panel-vip-tiers">
              Silver $5k · Gold $25k · Platinum $100k · Diamond $500k
            </p>

            {playerStats.equippedEmoji && (
              <div className="xp-panel-row" style={{ marginTop: "8px" }}>
                <span className="xp-panel-label">Emoji</span>
                <span style={{ fontSize: "1.4rem" }}>
                  {playerStats.equippedEmoji === "emoji_crown"
                    ? "👑"
                    : playerStats.equippedEmoji === "emoji_fire"
                      ? "🔥"
                      : playerStats.equippedEmoji === "emoji_diamond"
                        ? "💎"
                        : playerStats.equippedEmoji === "emoji_skull"
                          ? "💀"
                          : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
