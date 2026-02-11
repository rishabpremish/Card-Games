import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useWallet } from "../hooks/useWallet";
import Settings from "../components/Settings";
import AchievementsPanel from "../components/AchievementsPanel";
import DailyBonus from "../components/DailyBonus";
import QueryErrorBoundary from "../components/QueryErrorBoundary";
import SessionStatsPanel from "../components/SessionStatsPanel";

export default function Home() {
  const { user, logout } = useAuth();
  const { wallet } = useWallet();

  return (
    <div className="game-container">
      {/* Background decoration */}
      <div className="bg-decoration"></div>

      {/* User Info Bar */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          display: "flex",
          alignItems: "center",
          gap: "15px",
          zIndex: 100,
        }}
      >
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "3px solid var(--retro-yellow)",
            padding: "10px 20px",
            fontFamily: "'Press Start 2P', cursive",
            fontSize: "0.5rem",
            color: "var(--retro-yellow)",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: "5px", color: "var(--text-secondary)" }}>
            {user?.username || "Player"}
          </div>
          <div style={{ fontSize: "0.7rem" }}>${wallet}</div>
        </div>

        <button
          onClick={logout}
          style={{
            background: "transparent",
            border: "3px solid var(--retro-red)",
            color: "var(--retro-red)",
            padding: "10px 15px",
            fontFamily: "'Press Start 2P', cursive",
            fontSize: "0.45rem",
            cursor: "pointer",
            transition: "0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--retro-red)";
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--retro-red)";
          }}
        >
          LOGOUT
        </button>
      </div>

      <header className="game-header" style={{ marginTop: "80px" }}>
        <h1>UgroundBetZ </h1>
        <p className="subtitle">Select a Game</p>
      </header>

      <div className="menu-container">
        <div className="game-list">
          <Link to="/higher-lower" className="game-link">
            Higher or Lower
          </Link>
          <Link to="/blackjack" className="game-link">
            Blackjack
          </Link>
          <Link to="/baccarat" className="game-link">
            Baccarat
          </Link>
          <Link to="/slots" className="game-link">
            🎰 Slots
          </Link>
          <Link to="/roulette" className="game-link">
            🎡 Roulette
          </Link>
          <Link to="/craps" className="game-link">
            🎲 Craps
          </Link>
          <Link to="/war" className="game-link">
            ⚔️ War
          </Link>
          <Link to="/shop" className="game-link" style={{ borderColor: "#00ff88", color: "#00ff88" }}>
            🛒 Shop
          </Link>
          <Link to="/stats" className="game-link" style={{ borderColor: "var(--retro-cyan)", color: "var(--retro-cyan)" }}>
            📊 Stats
          </Link>
          <Link to="/leaderboard" className="game-link">
            🏆 Leaderboard
          </Link>
          {user?.isAdmin && (
            <Link
              to="/admin"
              className="game-link"
              style={{
                borderColor: "var(--retro-magenta)",
                color: "var(--retro-magenta)",
              }}
            >
              ⚙️ Admin Panel
            </Link>
          )}
        </div>
      </div>

      {/* Settings modal accessible from home */}
      <Settings />

      {/* New features */}
      <QueryErrorBoundary>
        <DailyBonus />
      </QueryErrorBoundary>
      <AchievementsPanel />
      <SessionStatsPanel />
    </div>
  );
}
