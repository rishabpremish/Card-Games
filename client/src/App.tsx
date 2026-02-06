import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Auth from "./components/Auth";
import Home from "./pages/Home";
import HigherLowerGame from "./pages/HigherLowerGame";
import Blackjack from "./pages/Blackjack";
import PokerPage from "./poker/PokerPage";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import "./styles.css";
import "./auth.css";

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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/higher-lower" element={<HigherLowerGame />} />
        <Route path="/blackjack" element={<Blackjack />} />
        <Route path="/poker" element={<PokerPage />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
