import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../hooks/useAuth";
import { useAchievements } from "../hooks/useAchievements";
import { Link } from "react-router-dom";

export default function Leaderboard() {
  const { user } = useAuth();
  const { achievements, winStreak } = useAchievements();
  const [selectedWeek, setSelectedWeek] = useState<string>("current");
  const [showAchievements, setShowAchievements] = useState(false);

  // Fetch current leaderboard
  const currentLeaderboard = useQuery(api.leaderboard.getCurrentLeaderboard);
  const userRank = useQuery(
    api.leaderboard.getUserRank,
    user ? { userId: user.userId } : "skip",
  );
  const historicalLeaderboards = useQuery(
    api.leaderboard.getHistoricalLeaderboards,
    {},
  );

  // Get selected leaderboard data
  const displayLeaderboard =
    selectedWeek === "current"
      ? currentLeaderboard
      : historicalLeaderboards?.find(
          (lb) => String(lb.weekStart) === selectedWeek,
        );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <Link to="/" className="back-button">
          ← Back to Home
        </Link>
        <h1 className="leaderboard-title">🏆 Leaderboard</h1>
        <button
          onClick={() => setShowAchievements(!showAchievements)}
          style={{
            background: "var(--bg-secondary)",
            border: "2px solid var(--retro-yellow)",
            color: "var(--retro-yellow)",
            padding: "8px 16px",
            fontFamily: "'Press Start 2P', cursive",
            fontSize: "0.45rem",
            cursor: "pointer",
          }}
        >
          🏅 Achievements ({achievements.length})
        </button>
      </div>

      {/* Achievements Panel */}
      {showAchievements && (
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "2px solid var(--retro-cyan)",
            padding: "20px",
            marginBottom: "20px",
            maxWidth: "600px",
            margin: "0 auto 20px",
          }}
        >
          <h3 style={{ fontFamily: "'Press Start 2P', cursive", fontSize: "0.7rem", marginBottom: "15px" }}>
            Your Achievements
          </h3>
          {achievements.length === 0 ? (
            <p style={{ fontFamily: "'VT323', monospace", color: "var(--text-secondary)" }}>
              No achievements yet. Keep playing to unlock them!
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {achievements.map((id) => (
                <span
                  key={id}
                  style={{
                    background: "rgba(0, 255, 0, 0.1)",
                    border: "1px solid var(--retro-green)",
                    padding: "5px 10px",
                    fontFamily: "'VT323', monospace",
                    fontSize: "0.9rem",
                  }}
                >
                  🏆 {id}
                </span>
              ))}
            </div>
          )}
          {winStreak > 0 && (
            <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px dashed var(--retro-cyan)" }}>
              <span style={{ fontFamily: "'Press Start 2P', cursive", fontSize: "0.5rem", color: "var(--retro-orange)" }}>
                🔥 Current Win Streak: {winStreak}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="leaderboard-controls">
        <select
          className="week-selector"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
        >
          {currentLeaderboard && (
            <option value="current">
              {formatDate(currentLeaderboard.weekStart)} - {formatDate(currentLeaderboard.weekEnd)}
            </option>
          )}
          {historicalLeaderboards
            ?.filter(
              (lb) =>
                !currentLeaderboard ||
                lb.weekStart !== currentLeaderboard.weekStart,
            )
            .map((lb) => (
              <option key={lb.weekStart} value={String(lb.weekStart)}>
                {formatDate(lb.weekStart)} - {formatDate(lb.weekEnd)}
              </option>
            ))}
        </select>
      </div>

      {displayLeaderboard && (
        <div className="leaderboard-info">
          <div className="week-dates">
            <span>
              {formatDate(displayLeaderboard.weekStart)} -{" "}
              {formatDate(displayLeaderboard.weekEnd)}
            </span>
          </div>
          {"prizePot" in displayLeaderboard &&
            (displayLeaderboard as any).prizePot > 0 && (
              <div className="prize-pot">
                <span className="prize-label">Prize Pot:</span>
                <span className="prize-amount">
                  ${(displayLeaderboard as any).prizePot.toFixed(2)}
                </span>
              </div>
            )}
          {"prizeDescription" in displayLeaderboard &&
            (displayLeaderboard as any).prizeDescription && (
              <div className="prize-description">
                {(displayLeaderboard as any).prizeDescription}
              </div>
            )}
        </div>
      )}

      <div className="leaderboard-container">
        {!displayLeaderboard ? (
          <div className="loading-message">Loading leaderboard...</div>
        ) : displayLeaderboard.entries.length === 0 ? (
          <div className="empty-message">
            No players on the leaderboard yet. Be the first!
          </div>
        ) : (
          <div className="leaderboard-list">
            {displayLeaderboard.entries
              .slice(0, 10)
              .map((entry: any, index: number) => {
                const rank = entry.rank ?? index + 1;
                const isCurrentUser = user?.userId === entry.userId;

                return (
                  <div
                    key={entry.userId}
                    className={`leaderboard-entry ${isCurrentUser ? "current-user" : ""} ${rank <= 3 ? `top-${rank}` : ""}`}
                  >
                    <div className="rank">{getRankEmoji(rank)}</div>
                    <div className="player-info">
                      <span className="username">
                        {entry.username}
                        {isCurrentUser && (
                          <span className="you-badge">YOU</span>
                        )}
                      </span>
                    </div>
                    <div className="balance">${entry.balance.toFixed(2)}</div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {user && userRank && selectedWeek === "current" && userRank.rank > 10 && (
        <div className="user-rank-card">
          <h3>Your Ranking</h3>
          <div className="user-rank-info">
            <span className="user-rank-position">#{userRank.rank}</span>
            <span className="user-rank-balance">
              ${userRank.balance.toFixed(2)}
            </span>
          </div>
          <div className="rank-message">Keep playing to climb the ranks!</div>
        </div>
      )}
    </div>
  );
}
