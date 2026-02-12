import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useWallet } from "../hooks/useWallet";
import Settings from "../components/Settings";
import DailyBonus from "../components/DailyBonus";
import QueryErrorBoundary from "../components/QueryErrorBoundary";
import XPBar from "../components/XPBar";
import ChallengesPanel from "../components/ChallengesPanel";
import LoanPanel from "../components/LoanPanel";
import FriendsPanel from "../components/FriendsPanel";
import AchievementsPanel from "../components/AchievementsPanel";
import SessionStatsPanel from "../components/SessionStatsPanel";
import { useEconomy } from "../hooks/useEconomy";
import NotificationsPanel from "../components/NotificationsPanel";

function QuickMenu() {
  const [open, setOpen] = useState(false);
  const { activeLoans } = useEconomy();
  const hasActiveLoan = (activeLoans?.length ?? 0) > 0;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 150,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
      }}
    >
      {open && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "10px",
            width: "180px",
            animation: "qmSlideUp 0.2s ease-out",
          }}
        >
          <NotificationsPanel />
          <ChallengesPanel />
          <LoanPanel />
          <FriendsPanel />
          <AchievementsPanel />
          <SessionStatsPanel />
        </div>
      )}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "50px",
          height: "50px",
          background: "var(--bg-secondary, #1a1a3e)",
          border: "3px solid var(--retro-cyan, #00ffff)",
          color: "var(--retro-cyan, #00ffff)",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "1.2rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "3px 3px 0 rgba(0,255,255,0.3)",
          transition: "transform 0.15s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          position: "relative",
        }}
      >
        ▲
        {hasActiveLoan && !open && (
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: "#ff0000",
              border: "2px solid #ff4444",
              boxShadow: "0 0 6px rgba(255,0,0,0.6)",
            }}
          />
        )}
      </button>
      <style>{`
        @keyframes qmSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

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
          <Link to="/poker" className="game-link">
            🃏 Poker
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
          <Link to="/shop" className="game-link">
            🛒 Shop
          </Link>
          <Link
            to={`/profile/${user?.username ?? "player"}`}
            className="game-link"
          >
            👤 Public Profile
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

      {/* XP Bar — bottom left (homepage only) */}
      <XPBar />

      {/* Quick Menu — bottom right (homepage only) */}
      <QuickMenu />

      {/* Daily bonus modal */}
      <QueryErrorBoundary>
        <DailyBonus />
      </QueryErrorBoundary>
    </div>
  );
}
