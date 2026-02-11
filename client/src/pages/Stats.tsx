import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useWallet } from "../hooks/useWallet";
import { useEconomy } from "../hooks/useEconomy";
import { useSessionStats } from "../hooks/useSessionStats";

// Wrap the usage in a try/catch since SessionStatsProvider might not always exist
function SafeSessionStats() {
  try {
    const s = useSessionStats();
    return s;
  } catch {
    return null;
  }
}

import { useAchievements } from "../hooks/useAchievements";

const VIP_EMOJI: Record<string, string> = {
  bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💠", diamond: "💎",
};

export default function Stats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet: balance } = useWallet();
  const { playerStats } = useEconomy();
  const session = SafeSessionStats();
  const { achievements } = useAchievements();

  const stats = playerStats;

  return (
    <>
      <style>{`
        .stats-page {
          min-height: 100vh;
          background: var(--bg-primary, #0f0f23);
          padding: 44px 20px 20px;
          font-family: 'Press Start 2P', cursive;
          color: #fff;
        }
        .stats-back {
          position: absolute; top: 44px; left: 20px;
          background: none;
          border: 2px solid var(--retro-yellow, #ffd700);
          color: var(--retro-yellow, #ffd700);
          padding: 6px 14px;
          font-family: 'Press Start 2P', cursive;
          font-size: 0.4rem;
          cursor: pointer;
        }
        .stats-title {
          text-align: center;
          color: var(--retro-yellow, #ffd700);
          font-size: 1rem;
          margin: 20px 0 24px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
          max-width: 900px;
          margin: 0 auto;
        }
        .stats-card {
          background: rgba(255,255,255,0.04);
          border: 2px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          padding: 18px;
        }
        .stats-card h3 {
          font-size: 0.5rem;
          color: var(--retro-yellow, #ffd700);
          margin: 0 0 14px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 8px;
        }
        .stats-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .stats-label {
          color: rgba(255,255,255,0.5);
          font-size: 0.35rem;
        }
        .stats-value {
          color: #fff;
          font-size: 0.4rem;
        }
        .stats-value.green { color: #00ff88; }
        .stats-value.red { color: #ff4444; }
        .stats-value.gold { color: #ffd700; }
        .stats-xp-bar-track {
          width: 100%; height: 12px;
          background: rgba(255,255,255,0.08);
          border-radius: 6px;
          overflow: hidden;
          margin-top: 8px;
        }
        .stats-xp-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ffd700, #ff8c00);
          border-radius: 6px;
          transition: width 0.5s;
        }
      `}</style>
      <div className="stats-page">
        <button className="stats-back" onClick={() => navigate("/")}>← Back</button>
        <h1 className="stats-title">📊 Player Stats</h1>

        <div className="stats-grid">
          {/* Profile Card */}
          <div className="stats-card">
            <h3>👤 Profile</h3>
            <div className="stats-row">
              <span className="stats-label">Username</span>
              <span className="stats-value">{user?.username ?? "—"}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Balance</span>
              <span className="stats-value green">${balance.toLocaleString()}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Level</span>
              <span className="stats-value gold">Lv {stats?.level ?? 1}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">XP</span>
              <span className="stats-value">{stats?.xpInLevel ?? 0} / {stats?.xpNeeded ?? 100}</span>
            </div>
            <div className="stats-xp-bar-track">
              <div className="stats-xp-bar-fill" style={{
                width: `${stats && stats.xpNeeded > 0 ? Math.round((stats.xpInLevel / stats.xpNeeded) * 100) : 0}%`,
              }} />
            </div>
          </div>

          {/* VIP Card */}
          <div className="stats-card">
            <h3>⭐ VIP Status</h3>
            <div className="stats-row">
              <span className="stats-label">Tier</span>
              <span className="stats-value gold" style={{ textTransform: "capitalize" }}>
                {VIP_EMOJI[stats?.vipTier ?? "bronze"]} {stats?.vipTier ?? "bronze"}
              </span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Total Wagered</span>
              <span className="stats-value">${(stats?.totalWagered ?? 0).toLocaleString()}</span>
            </div>
            <div style={{ marginTop: "8px" }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.3rem" }}>
                Next: Silver $5k • Gold $25k • Platinum $100k • Diamond $500k
              </p>
            </div>
          </div>

          {/* Session Card */}
          <div className="stats-card">
            <h3>🎮 This Session</h3>
            <div className="stats-row">
              <span className="stats-label">Total Wagered</span>
              <span className="stats-value">${(session?.totalWagered ?? 0).toLocaleString()}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Won</span>
              <span className="stats-value green">${(session?.totalWon ?? 0).toLocaleString()}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Lost</span>
              <span className="stats-value red">${(session?.totalLost ?? 0).toLocaleString()}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Net Profit</span>
              <span className={`stats-value ${(session?.netProfit ?? 0) >= 0 ? "green" : "red"}`}>
                {(session?.netProfit ?? 0) >= 0 ? "+" : ""}${(session?.netProfit ?? 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Achievements Card */}
          <div className="stats-card">
            <h3>🏆 Achievements</h3>
            <div className="stats-row">
              <span className="stats-label">Unlocked</span>
              <span className="stats-value gold">{achievements.length}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
              {achievements.slice(0, 12).map((a: any) => (
                <span key={a} style={{
                  background: "rgba(255,215,0,0.1)",
                  border: "1px solid rgba(255,215,0,0.3)",
                  borderRadius: "3px",
                  padding: "2px 6px",
                  fontSize: "0.3rem",
                  color: "#ffd700",
                }}>🏆 {typeof a === "string" ? a : a.id ?? "?"}</span>
              ))}
              {achievements.length > 12 && (
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.3rem" }}>
                  +{achievements.length - 12} more
                </span>
              )}
            </div>
          </div>

          {/* Equipped Items Card */}
          <div className="stats-card">
            <h3>🎒 Equipped Items</h3>
            <div className="stats-row">
              <span className="stats-label">Theme</span>
              <span className="stats-value">{stats?.equippedTheme?.replace("theme_", "") ?? "Default"}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Card Back</span>
              <span className="stats-value">{stats?.equippedCardBack?.replace("cardback_", "") ?? "Default"}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Emoji</span>
              <span className="stats-value">
                {stats?.equippedEmoji === "emoji_crown" ? "👑" :
                 stats?.equippedEmoji === "emoji_fire" ? "🔥" :
                 stats?.equippedEmoji === "emoji_diamond" ? "💎" :
                 stats?.equippedEmoji === "emoji_skull" ? "💀" : "None"}
              </span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Owned Items</span>
              <span className="stats-value">{stats?.ownedItems?.length ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
