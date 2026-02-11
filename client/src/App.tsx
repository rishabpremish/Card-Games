import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Auth from "./components/Auth";
import Home from "./pages/Home";
import HigherLowerGame from "./pages/HigherLowerGame";
import Blackjack from "./pages/Blackjack";
import Baccarat from "./pages/Baccarat";
import Slots from "./pages/Slots";
import Roulette from "./pages/Roulette";
import Craps from "./pages/Craps";
import War from "./pages/War";
import Shop from "./pages/Shop";
import Stats from "./pages/Stats";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import XPBar from "./components/XPBar";
import ChallengesPanel from "./components/ChallengesPanel";
import LoanPanel from "./components/LoanPanel";
import FriendsPanel from "./components/FriendsPanel";
import AchievementsPanel from "./components/AchievementsPanel";
import SessionStatsPanel from "./components/SessionStatsPanel";
import "./styles.css";
import "./auth.css";

function QuickMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 150, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px", width: "180px", animation: "qmSlideUp 0.2s ease-out" }}>
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
        }}
      >
        ▲
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

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "0.8rem",
          color: "var(--retro-cyan)",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <XPBar />
      <QuickMenu />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/higher-lower" element={<HigherLowerGame />} />
        <Route path="/blackjack" element={<Blackjack />} />
        <Route path="/baccarat" element={<Baccarat />} />
        <Route path="/slots" element={<Slots />} />
        <Route path="/roulette" element={<Roulette />} />
        <Route path="/craps" element={<Craps />} />
        <Route path="/war" element={<War />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
