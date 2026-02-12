import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useEconomy } from "./hooks/useEconomy";
import Auth from "./components/Auth";
import Home from "./pages/Home";
import HigherLowerGame from "./pages/HigherLowerGame";
import Blackjack from "./pages/Blackjack";
import Baccarat from "./pages/Baccarat";
import Slots from "./pages/Slots";
import Roulette from "./pages/Roulette";
import Craps from "./pages/Craps";
import War from "./pages/War";
import Stats from "./pages/Stats";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import Shop from "./pages/Shop";
import Profile from "./pages/Profile";
import PokerPage from "./poker/PokerPage";
import "./styles.css";
import "./auth.css";

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const { playerStats } = useEconomy();

  // Apply equipped card back globally via a body class.
  useEffect(() => {
    const equipped = playerStats?.equippedCardBack;
    const classes = document.body.className
      .split(" ")
      .filter((c) => !c.startsWith("cardback_"));
    document.body.className = classes.join(" ");
    if (equipped) document.body.classList.add(equipped);
  }, [playerStats?.equippedCardBack]);

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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/higher-lower" element={<HigherLowerGame />} />
        <Route path="/poker" element={<PokerPage />} />
        <Route path="/blackjack" element={<Blackjack />} />
        <Route path="/baccarat" element={<Baccarat />} />
        <Route path="/slots" element={<Slots />} />
        <Route path="/roulette" element={<Roulette />} />
        <Route path="/craps" element={<Craps />} />
        <Route path="/war" element={<War />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
