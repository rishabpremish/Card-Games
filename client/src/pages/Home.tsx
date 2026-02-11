import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useWallet } from "../hooks/useWallet";
import Settings from "../components/Settings";
import DailyBonus from "../components/DailyBonus";
import QueryErrorBoundary from "../components/QueryErrorBoundary";

export default function Home() {
  const { user, logout } = useAuth();
  const { wallet } = useWallet();

  return (
    <div className="game-container">
      {/* Background decoration */}
      <div className="bg-decoration"></div>

      {/* Balance — top right */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
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
          <div
            style={{
              marginBottom: "5px",
              color: "var(--text-secondary)",
              fontSize: "0.4rem",
            }}
          >
            {user?.username || "Player"}
          </div>
          <div style={{ fontSize: "0.7rem" }}>${wallet}</div>
        </div>
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
          <Link
            to="/shop"
            className="game-link"
            style={{ borderColor: "#00ff88", color: "#00ff88" }}
          >
            🛒 Shop
          </Link>
          <Link
            to="/stats"
            className="game-link"
            style={{
              borderColor: "var(--retro-cyan)",
              color: "var(--retro-cyan)",
            }}
          >
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

      {/* Settings — top left (with logout inside) */}
      <Settings onLogout={logout} />

      {/* Daily bonus modal */}
      <QueryErrorBoundary>
        <DailyBonus />
      </QueryErrorBoundary>
    </div>
  );
}
