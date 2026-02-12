import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useWallet } from "../hooks/useWallet";
import { useEconomy } from "../hooks/useEconomy";
import { useSessionStats } from "../hooks/useSessionStats";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💠",
  diamond: "💎",
};

export default function Stats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet: balance, matchHistory } = useWallet();
  const { playerStats } = useEconomy();
  const session = SafeSessionStats();
  const { achievements } = useAchievements();
  const [graphRange, setGraphRange] = useState<"daily" | "weekly">("daily");

  const txns = useQuery(
    api.wallet.getTransactions,
    user ? { userId: user.userId, limit: 500 } : "skip",
  );

  const stats = playerStats;

  const themeId = user?.settings?.theme ?? "default";
  const themeName: Record<string, string> = {
    default: "Arcade",
    blackwhite: "B&W",
    dracula: "Dracula",
    monokai: "Monokai",
    nord: "Nord",
    solarized: "Solarized",
    synthwave: "Synthwave",
    gruvbox: "Gruvbox",
    ocean: "Ocean",
    sunset: "Sunset",
    forest: "Forest",
    candy: "Candy",
    neon: "Neon",
  };

  const cardBackName: Record<string, string> = {
    default: "Default",
    cardback_neon_grid: "Neon Grid",
    cardback_cyber_circuit: "Cyber Circuit",
    cardback_arcade_sun: "Arcade Sun",
    cardback_holo_diamond: "Holo Diamond",
    cardback_royal_flush: "Royal Flush",
    cardback_glitch_wave: "Glitch Wave",
    cardback_void_vortex: "Void Vortex",
    cardback_gold_vault: "Gold Vault",
  };

  const bankrollPoints = useMemo(() => {
    if (!txns || txns.length === 0)
      return [] as { label: string; balance: number }[];

    // txns are desc; compute series oldest->newest
    const ordered = [...txns].sort(
      (a: any, b: any) => a.timestamp - b.timestamp,
    );
    const buckets = new Map<string, number>();

    for (const t of ordered as any[]) {
      const d = new Date(t.timestamp);
      let key = "";
      let label = "";
      if (graphRange === "weekly") {
        // Week bucket: YYYY-WW
        const tmp = new Date(d);
        tmp.setHours(0, 0, 0, 0);
        // Sunday-start week
        const day = tmp.getDay();
        tmp.setDate(tmp.getDate() - day);
        key = tmp.toISOString().slice(0, 10);
        label = tmp.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      } else {
        key = d.toISOString().slice(0, 10);
        label = d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      }

      // balanceAfter represents ending balance after this transaction
      buckets.set(key, t.balanceAfter);
      // Store label on same key by overwriting in a parallel map via encoding
      (buckets as any).__labels = (buckets as any).__labels || new Map();
      (buckets as any).__labels.set(key, label);
    }

    const labelsMap: Map<string, string> = (buckets as any).__labels;
    const entries = Array.from(buckets.entries()).map(([key, bal]) => ({
      key,
      label: labelsMap.get(key) ?? key,
      balance: bal,
    }));
    entries.sort((a, b) => (a.key < b.key ? -1 : 1));
    return entries.slice(-30).map(({ label, balance }) => ({ label, balance }));
  }, [txns, graphRange]);

  const bankrollSvg = useMemo(() => {
    if (bankrollPoints.length < 2) return null;
    const w = 520;
    const h = 140;
    const pad = 10;
    const vals = bankrollPoints.map((p) => p.balance);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = Math.max(1, max - min);

    const xStep = (w - pad * 2) / (bankrollPoints.length - 1);
    const pts = bankrollPoints
      .map((p, i) => {
        const x = pad + i * xStep;
        const y = pad + (h - pad * 2) * (1 - (p.balance - min) / range);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return { w, h, pts, min, max };
  }, [bankrollPoints]);

  return (
    <>
      <style>{`
        .stats-page {
          min-height: 100vh;
          background: var(--bg-primary, #0f0f23);
          padding: 44px 20px 20px;
          font-family: 'Press Start 2P', cursive;
          color: #fff;
          max-width: 1250px;
          margin: 0 auto;
        }
        .stats-back {
          position: absolute; top: 44px; left: 20px;
          background: none;
          border: 2px solid var(--retro-yellow, #ffd700);
          color: var(--retro-yellow, #ffd700);
          padding: 10px 22px;
          font-family: 'Press Start 2P', cursive;
          font-size: 0.7rem;
          cursor: pointer;
        }
        .stats-title {
          text-align: center;
          color: var(--retro-yellow, #ffd700);
          font-size: clamp(1.4rem, 3.5vw, 2rem);
          text-shadow: 3px 3px 0 var(--retro-magenta, #ff00ff);
          margin: 20px 0 28px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
          max-width: 1250px;
          margin: 0 auto;
        }
        .stats-card {
          background: rgba(255,255,255,0.04);
          border: 3px solid rgba(255,255,255,0.12);
          border-radius: 0;
          padding: 24px;
        }
        .stats-card h3 {
          font-size: 0.9rem;
          color: var(--retro-yellow, #ffd700);
          margin: 0 0 20px 0;
          border-bottom: 2px solid rgba(255,255,255,0.1);
          padding-bottom: 12px;
        }
        .stats-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .stats-label {
          color: rgba(255,255,255,0.5);
          font-size: 0.7rem;
        }
        .stats-value {
          color: #fff;
          font-size: 0.8rem;
        }
        .stats-value.green { color: #00ff88; }
        .stats-value.red { color: #ff4444; }
        .stats-value.gold { color: #ffd700; }
        .stats-xp-bar-track {
          width: 100%; height: 16px;
          background: rgba(255,255,255,0.08);
          border-radius: 0;
          overflow: hidden;
          margin-top: 10px;
          border: 2px solid rgba(255,255,255,0.18);
        }
        .stats-xp-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ffd700, #ff8c00);
          border-radius: 0;
          transition: width 0.5s;
        }
      `}</style>
      <div className="stats-page">
        <button className="stats-back" onClick={() => navigate("/")}>
          ← Back
        </button>
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
              <span className="stats-value green">
                ${balance.toLocaleString()}
              </span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Level</span>
              <span className="stats-value gold">Lv {stats?.level ?? 1}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">XP</span>
              <span className="stats-value">
                {stats?.xpInLevel ?? 0} / {stats?.xpNeeded ?? 100}
              </span>
            </div>
            <div className="stats-xp-bar-track">
              <div
                className="stats-xp-bar-fill"
                style={{
                  width: `${stats && stats.xpNeeded > 0 ? Math.round((stats.xpInLevel / stats.xpNeeded) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          {/* VIP Card */}
          <div className="stats-card">
            <h3>⭐ VIP Status</h3>
            <div className="stats-row">
              <span className="stats-label">Tier</span>
              <span
                className="stats-value gold"
                style={{ textTransform: "capitalize" }}
              >
                {VIP_EMOJI[stats?.vipTier ?? "bronze"]}{" "}
                {stats?.vipTier ?? "bronze"}
              </span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Total Wagered</span>
              <span className="stats-value">
                ${(stats?.totalWagered ?? 0).toLocaleString()}
              </span>
            </div>
            <div style={{ marginTop: "8px" }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.5rem" }}>
                Next: Silver $5k • Gold $25k • Platinum $100k • Diamond $500k
              </p>
            </div>
          </div>

          {/* Session Card */}
          <div className="stats-card">
            <h3>🎮 This Session</h3>
            <div className="stats-row">
              <span className="stats-label">Total Wagered</span>
              <span className="stats-value">
                ${(session?.totalWagered ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Won</span>
              <span className="stats-value green">
                ${(session?.totalWon ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Lost</span>
              <span className="stats-value red">
                ${(session?.totalLost ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Net Profit</span>
              <span
                className={`stats-value ${(session?.netProfit ?? 0) >= 0 ? "green" : "red"}`}
              >
                {(session?.netProfit ?? 0) >= 0 ? "+" : ""}$
                {(session?.netProfit ?? 0).toLocaleString()}
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
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginTop: "8px",
              }}
            >
              {achievements.slice(0, 12).map((a: any) => (
                <span
                  key={a}
                  style={{
                    background: "rgba(255,215,0,0.1)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: "0",
                    padding: "4px 10px",
                    fontSize: "0.5rem",
                    color: "#ffd700",
                  }}
                >
                  🏆 {typeof a === "string" ? a : (a.id ?? "?")}
                </span>
              ))}
              {achievements.length > 12 && (
                <span
                  style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.5rem" }}
                >
                  +{achievements.length - 12} more
                </span>
              )}
            </div>
          </div>

          {/* Bankroll Graph */}
          <div className="stats-card">
            <h3>📈 Bankroll</h3>
            <div className="stats-row" style={{ marginBottom: 10 }}>
              <span className="stats-label">Range</span>
              <select
                value={graphRange}
                onChange={(e) => setGraphRange(e.target.value as any)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "2px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  padding: "8px 10px",
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.5rem",
                }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            {!bankrollSvg ? (
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.6rem" }}>
                Not enough history yet.
              </p>
            ) : (
              <div style={{ width: "100%", overflowX: "auto" }}>
                <svg
                  width={bankrollSvg.w}
                  height={bankrollSvg.h}
                  viewBox={`0 0 ${bankrollSvg.w} ${bankrollSvg.h}`}
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "2px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <polyline
                    fill="none"
                    stroke="var(--retro-cyan)"
                    strokeWidth="3"
                    points={bankrollSvg.pts}
                  />
                </svg>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                    fontSize: "0.45rem",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  <span>${bankrollSvg.min.toLocaleString()}</span>
                  <span>${bankrollSvg.max.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Equipped Items Card */}
          <div className="stats-card">
            <h3>🎒 Equipped Items</h3>
            <div className="stats-row">
              <span className="stats-label">Theme</span>
              <span className="stats-value">
                {themeName[themeId] ?? themeId}
              </span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Card Back</span>
              <span className="stats-value">
                {cardBackName[stats?.equippedCardBack ?? "default"] ??
                  stats?.equippedCardBack ??
                  "Default"}
              </span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Emoji</span>
              <span className="stats-value">
                {stats?.equippedEmoji === "emoji_crown"
                  ? "👑"
                  : stats?.equippedEmoji === "emoji_fire"
                    ? "🔥"
                    : stats?.equippedEmoji === "emoji_diamond"
                      ? "💎"
                      : stats?.equippedEmoji === "emoji_skull"
                        ? "💀"
                        : "None"}
              </span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Owned Items</span>
              <span className="stats-value">
                {stats?.ownedItems?.length ?? 0}
              </span>
            </div>
          </div>

          {/* Match History Card */}
          <div className="stats-card" style={{ gridColumn: "1 / -1" }}>
            <h3>🧾 Match History (Last 50)</h3>
            {(matchHistory ?? []).length === 0 ? (
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.6rem",
                  margin: 0,
                }}
              >
                No completed rounds yet.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.8fr 0.8fr 0.8fr 1.6fr",
                    gap: 8,
                    fontSize: "0.5rem",
                    color: "rgba(255,255,255,0.55)",
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                    paddingBottom: 6,
                  }}
                >
                  <span>Game</span>
                  <span>Bet</span>
                  <span>Outcome</span>
                  <span>Net</span>
                  <span>Time</span>
                </div>
                {(matchHistory ?? []).slice(0, 50).map((row: any) => (
                  <div
                    key={row._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.8fr 0.8fr 0.8fr 1.6fr",
                      gap: 8,
                      fontSize: "0.53rem",
                      borderBottom: "1px dashed rgba(255,255,255,0.08)",
                      paddingBottom: 6,
                    }}
                  >
                    <span>{row.game}</span>
                    <span>${row.bet}</span>
                    <span
                      style={{
                        textTransform: "uppercase",
                        color:
                          row.outcome === "win"
                            ? "#00ff88"
                            : row.outcome === "loss"
                              ? "#ff4444"
                              : "#ffd700",
                      }}
                    >
                      {row.outcome}
                    </span>
                    <span
                      style={{ color: row.net >= 0 ? "#00ff88" : "#ff4444" }}
                    >
                      {row.net >= 0 ? "+" : ""}${row.net}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.65)" }}>
                      {new Date(row.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
