import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useAuth } from "../hooks/useAuth";
import { useConfetti } from "../hooks/useConfetti";
import { useAchievements } from "../hooks/useAchievements";
import { useSessionStats } from "../hooks/useSessionStats";

// Types
interface Card {
  suit: string;
  value: string;
  numericValue: number;
  isRed: boolean;
}

type BetType = "player" | "banker" | "tie";
type GamePhase =
  | "betting"
  | "dealing"
  | "playerThird"
  | "bankerThird"
  | "settling"
  | "complete";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];
const CHIP_VALUES = [5, 10, 25, 50, 100, 500];

function createShoe(): Card[] {
  const shoe: Card[] = [];
  for (let deck = 0; deck < 6; deck++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        let numericValue: number;
        if (value === "A") numericValue = 1;
        else if (["10", "J", "Q", "K"].includes(value)) numericValue = 0;
        else numericValue = parseInt(value);
        shoe.push({
          suit,
          value,
          numericValue,
          isRed: suit === "♥" || suit === "♦",
        });
      }
    }
  }
  return shuffleShoe(shoe);
}

function shuffleShoe(shoe: Card[]): Card[] {
  const s = [...shoe];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

function calcScore(hand: Card[]): number {
  return hand.reduce((a, c) => a + c.numericValue, 0) % 10;
}

function dealCard(shoe: Card[]): { card: Card; newShoe: Card[] } {
  return { card: shoe[0], newShoe: shoe.slice(1) };
}

function shouldReshuffle(shoe: Card[]): boolean {
  return shoe.length < 78;
}

// Card sub-component
function BacCard({ card }: { card: Card }) {
  return (
    <div className="bac-card">
      <div className={`bac-card-front ${card.isRed ? "red" : "black"}`}>
        <div className="bac-card-corner top">
          <span className="bac-card-value">{card.value}</span>
          <span className="bac-card-suit-small">{card.suit}</span>
        </div>
        <span className="bac-card-center">{card.suit}</span>
        <div className="bac-card-corner bottom">
          <span className="bac-card-value">{card.value}</span>
          <span className="bac-card-suit-small">{card.suit}</span>
        </div>
      </div>
      <div className="bac-card-back" />
    </div>
  );
}

function CardSlot() {
  return (
    <div className="bac-card-slot">
      <div className="bac-card-back" />
    </div>
  );
}

export default function Baccarat() {
  const navigate = useNavigate();
  const { wallet, placeBet: placeBetMutation, addWinnings } = useWallet();
  const { user } = useAuth();
  const { triggerConfetti } = useConfetti();
  const {
    unlockAchievement,
    incrementWinStreak,
    resetWinStreak,
    incrementBankerWins,
    incrementTieWins,
    incrementSessionWins,
  } = useAchievements();
  const { recordBet } = useSessionStats();

  const [shoe, setShoe] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [bankerHand, setBankerHand] = useState<Card[]>([]);
  const [stagedBet, setStagedBet] = useState(0);
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("betting");
  const [winner, setWinner] = useState<"player" | "banker" | "tie" | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [resultType, setResultType] = useState<"win" | "lose" | "neutral">(
    "neutral",
  );
  const [isDealing, setIsDealing] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

  useEffect(() => {
    setShoe(createShoe());
  }, []);

  const checkReshuffle = useCallback(
    (s: Card[]) => (shouldReshuffle(s) ? createShoe() : s),
    [],
  );

  const addChip = (val: number) => {
    if (gamePhase !== "betting") return;
    const avail = (wallet ?? 0) - stagedBet;
    if (avail >= val) setStagedBet((p) => p + val);
  };
  const clearBet = () => {
    if (gamePhase === "betting") setStagedBet(0);
  };

  const handlePlaceBet = async () => {
    if (!selectedBet || stagedBet <= 0 || stagedBet > (wallet ?? 0)) return;
    try {
      await placeBetMutation(stagedBet, "Baccarat");
      setGamePhase("dealing");
      setIsDealing(true);
      setMessage("");
      setWinner(null);
      if (stagedBet >= 100) unlockAchievement("high_roller");
      const currentShoe = checkReshuffle(shoe);
      setTimeout(() => {
        dealInitialCards(currentShoe);
      }, 500);
    } catch {
      setMessage("Failed to place bet");
    }
  };

  const dealInitialCards = (cs: Card[]) => {
    const { card: p1, newShoe: s1 } = dealCard(cs);
    const { card: b1, newShoe: s2 } = dealCard(s1);
    const { card: p2, newShoe: s3 } = dealCard(s2);
    const { card: b2, newShoe: s4 } = dealCard(s3);
    setPlayerHand([p1, p2]);
    setBankerHand([b1, b2]);
    setShoe(s4);
    setTimeout(() => checkNaturals([p1, p2], [b1, b2], s4), 1000);
  };

  const checkNaturals = (pH: Card[], bH: Card[], s: Card[]) => {
    if (calcScore(pH) >= 8 || calcScore(bH) >= 8) {
      setTimeout(() => determineWinner(pH, bH, s), 1000);
    } else {
      setGamePhase("playerThird");
      setTimeout(() => handlePlayerThird(pH, bH, s), 1000);
    }
  };

  const handlePlayerThird = (pH: Card[], bH: Card[], s: Card[]) => {
    if (calcScore(pH) <= 5) {
      const { card, newShoe } = dealCard(s);
      const newPH = [...pH, card];
      setPlayerHand(newPH);
      setShoe(newShoe);
      setGamePhase("bankerThird");
      setTimeout(
        () => handleBankerThird(newPH, bH, newShoe, card.numericValue),
        1000,
      );
    } else {
      setGamePhase("bankerThird");
      setTimeout(() => handleBankerThird(pH, bH, s, null), 1000);
    }
  };

  const handleBankerThird = (
    pH: Card[],
    bH: Card[],
    s: Card[],
    p3: number | null,
  ) => {
    const bs = calcScore(bH);
    let draw = false;
    if (p3 === null) draw = bs <= 5;
    else if (bs <= 2) draw = true;
    else if (bs === 3) draw = p3 !== 8;
    else if (bs === 4) draw = p3 >= 2 && p3 <= 7;
    else if (bs === 5) draw = p3 >= 4 && p3 <= 7;
    else if (bs === 6) draw = p3 === 6 || p3 === 7;
    if (draw) {
      const { card, newShoe } = dealCard(s);
      setBankerHand([...bH, card]);
      setShoe(newShoe);
      setTimeout(() => determineWinner(pH, [...bH, card], newShoe), 1000);
    } else {
      setTimeout(() => determineWinner(pH, bH, s), 1000);
    }
  };

  const determineWinner = async (pH: Card[], bH: Card[], cs: Card[]) => {
    const ps = calcScore(pH),
      bs = calcScore(bH);
    let gw: "player" | "banker" | "tie";
    if (ps > bs) gw = "player";
    else if (bs > ps) gw = "banker";
    else gw = "tie";
    setWinner(gw);
    setGamePhase("complete");

    if (selectedBet === gw) {
      let winAmount = 0;
      if (gw === "player") {
        winAmount = stagedBet * 2;
        setMessage(`Player wins! +$${stagedBet}`);
      } else if (gw === "banker") {
        const c = stagedBet * 0.05;
        winAmount = stagedBet * 2 - c;
        setMessage(`Banker wins! +$${(stagedBet - c).toFixed(2)}`);
        incrementBankerWins();
      } else {
        winAmount = stagedBet * 9;
        setMessage(`Tie! +$${(stagedBet * 8).toFixed(2)} (8:1)`);
        incrementTieWins();
      }
      setResultType("win");
      triggerConfetti({ intensity: gw === "tie" ? "high" : "medium" });
      incrementWinStreak();
      incrementSessionWins();
      recordBet("baccarat", stagedBet, "win");
      try {
        await addWinnings(winAmount, "Baccarat");
      } catch (error) {
        console.error("Failed to add Baccarat winnings", error);
      }
    } else {
      setMessage(
        `${gw.charAt(0).toUpperCase() + gw.slice(1)} wins. -$${stagedBet}`,
      );
      setResultType("lose");
      resetWinStreak();
      recordBet("baccarat", stagedBet, "loss");
    }
    setIsDealing(false);
    if (shouldReshuffle(cs)) setTimeout(() => setShoe(createShoe()), 2000);
  };

  const nextRound = () => {
    setPlayerHand([]);
    setBankerHand([]);
    setSelectedBet(null);
    setGamePhase("betting");
    setWinner(null);
    setMessage("");
    setStagedBet(0);
  };

  const ps = calcScore(playerHand),
    bs = calcScore(bankerHand);
  const availBet = (wallet ?? 0) - stagedBet;

  return (
    <div className="bac-page">
      <div className="bg-decoration" />
      <button
        className="home-btn"
        onClick={() =>
          window.history.length > 1 ? navigate(-1) : navigate("/")
        }
      >
        ← BACK
      </button>

      <style>{`
        /* ═══════════════════════════════════
           BACCARAT — FULL RETRO REDESIGN
           ═══════════════════════════════════ */
        .bac-page {
          height: 100vh; height: 100dvh;
          display: flex; flex-direction: column;
          max-width: 1250px; margin: 0 auto;
          padding: clamp(10px,2vh,18px) 20px;
          position: relative; overflow: hidden;
        }
        .bac-page .home-btn { position: fixed; top: 20px; left: 20px; z-index: 50; }

        /* Glow overlay */
        .bac-page::after {
          content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: radial-gradient(60% 40% at 50% 30%, rgba(0,255,247,0.06), transparent 60%),
                      radial-gradient(50% 35% at 50% 70%, rgba(255,0,255,0.05), transparent 60%);
        }

        .bac-top { flex-shrink: 0; text-align: center; position: relative; z-index: 1; }
        .bac-top h1 {
          font-family: 'Press Start 2P', cursive;
          font-size: clamp(1rem,3.5vw,2rem);
          color: var(--retro-yellow);
          text-shadow: 3px 3px 0 var(--retro-magenta); margin: 0;
        }
        .bac-sub { font-family: 'VT323', monospace; font-size: clamp(0.8rem,2.5vw,1.2rem); color: var(--text-secondary); margin-top: 2px; }

        /* Stats */
        .bac-stats {
          display: flex; justify-content: center; gap: clamp(8px,2vw,20px);
          margin: clamp(4px,1vh,10px) 0; flex-shrink: 0; position: relative; z-index: 1;
        }
        .bac-stat {
          background: var(--bg-secondary); border: 3px solid var(--retro-cyan);
          padding: clamp(5px,1vh,10px) clamp(10px,2vw,18px); text-align: center;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
        }
        .bac-stat-lbl { font-family: 'Press Start 2P'; font-size: clamp(0.5rem,1.2vw,0.65rem); color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 2px; }
        .bac-stat-val { font-family: 'Press Start 2P'; font-size: clamp(1.05rem,2.8vw,1.5rem); color: var(--retro-green); }

        /* Table middle */
        .bac-table {
          flex: 1; display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          gap: clamp(6px,1.2vh,14px); min-height: 0; position: relative; z-index: 1;
        }

        /* Hands */
        .bac-hands {
          display: flex; justify-content: center; align-items: flex-start;
          gap: clamp(14px,3.5vw,50px); width: 100%; max-width: 860px;
          padding: clamp(10px,2vh,18px) clamp(12px,2.5vw,26px);
          background: linear-gradient(180deg, rgba(16,28,52,0.88), rgba(10,18,36,0.92));
          border: 3px solid var(--retro-cyan);
          box-shadow: 8px 8px 0 rgba(0,255,247,0.12), inset 0 0 20px rgba(0,0,0,0.5);
        }
        .bac-hand-col { display: flex; flex-direction: column; align-items: center; gap: 5px; min-width: clamp(120px,26vw,200px); }
        .bac-hand-col.w { filter: drop-shadow(0 0 12px rgba(0,255,0,0.4)); }
        .bac-htitle { font-family: 'Press Start 2P'; font-size: clamp(0.65rem,1.6vw,0.95rem); color: var(--retro-cyan); text-shadow: 2px 2px 0 rgba(0,0,0,0.6); }
        .bac-htitle.wt { color: var(--retro-green); }
        .bac-cards { display: flex; gap: 6px; justify-content: center; min-height: clamp(72px,15vh,120px); align-items: center; }
        .bac-score {
          font-family: 'Press Start 2P'; font-size: clamp(0.92rem,2.3vw,1.3rem);
          color: var(--retro-yellow); background: rgba(0,0,0,0.6);
          border: 3px solid var(--retro-yellow); padding: 3px 10px;
          box-shadow: 3px 3px 0 rgba(255,255,0,0.2);
        }
        .bac-score.ws { border-color: var(--retro-green); color: var(--retro-green); }
        .bac-vs { font-family: 'Press Start 2P'; font-size: clamp(0.78rem,1.8vw,1.1rem); color: var(--retro-magenta); align-self: center; text-shadow: 2px 2px 0 rgba(0,0,0,0.6); }

        /* Cards */
        .bac-card {
          width: clamp(66px,13.5vw,108px); height: clamp(92px,19vw,152px);
          position: relative;
          animation: bacSlide 0.3s ease-out;
        }
        @keyframes bacSlide { from { opacity:0; transform:translateY(-16px) scale(0.92); } to { opacity:1; transform:translateY(0) scale(1); } }
        .bac-card .bac-card-front,
        .bac-card .bac-card-back {
          width: 100%; height: 100%; position: absolute; top: 0; left: 0;
        }
        .bac-card .bac-card-front {
          background-color: var(--card-white);
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 6px; border: 4px solid var(--card-black);
          box-shadow: 4px 4px 0px rgba(0,0,0,0.5); z-index: 2;
        }
        .bac-card .bac-card-front.red { color: var(--card-red); }
        .bac-card .bac-card-front.black { color: var(--card-black); }
        .bac-card .bac-card-front::before {
          content: ''; position: absolute; top: 3px; left: 3px; right: 3px; bottom: 3px;
          border: 2px solid rgba(0,0,0,0.15); pointer-events: none;
        }
        .bac-card .bac-card-back {
          background: var(--bg-card);
          border: 4px solid var(--retro-purple);
          box-shadow: 4px 4px 0px rgba(153,102,255,0.4);
          display: flex; align-items: center; justify-content: center; overflow: hidden; z-index: 1;
        }
        .bac-card .bac-card-back::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-conic-gradient(var(--retro-purple) 0deg 90deg, var(--bg-card) 90deg 180deg);
          background-size: 16px 16px; opacity: 0.3;
        }
        .bac-card .bac-card-back::after {
          content: ''; width: 30px; height: 30px;
          border: 4px solid var(--retro-magenta); position: relative; z-index: 1;
        }
        .bac-card-corner {
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
          z-index: 1;
        }
        .bac-card-corner.top { align-self: flex-start; }
        .bac-card-corner.bottom {
          align-self: flex-end;
          transform: rotate(180deg);
        }
        .bac-card-value {
          font-family: 'Press Start 2P', cursive;
          font-size: clamp(0.52rem,1.1vw,0.72rem);
          font-weight: normal;
        }
        .bac-card-suit-small {
          font-size: clamp(0.82rem,1.6vw,1.08rem);
          margin-top: 1px;
        }
        .bac-card-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: clamp(2rem,4.4vw,2.95rem);
        }
        .bac-card-slot {
          width: clamp(66px,13.5vw,108px); height: clamp(92px,19vw,152px);
          border: 3px dashed var(--retro-purple); opacity: 0.35;
          position: relative; overflow: hidden;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.3);
        }
        .bac-card-slot .bac-card-back {
          width: 100%; height: 100%; position: absolute; top: 0; left: 0;
          background: var(--bg-card);
          border: none;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .bac-card-slot .bac-card-back::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-conic-gradient(var(--retro-purple) 0deg 90deg, var(--bg-card) 90deg 180deg);
          background-size: 12px 12px; opacity: 0.15;
        }
        .bac-card-slot .bac-card-back::after {
          content: ''; width: 20px; height: 20px;
          border: 3px solid var(--retro-magenta); position: relative; z-index: 1; opacity: 0.4;
        }

        /* Message */
        .bac-msg {
          font-family: 'Press Start 2P'; font-size: clamp(0.75rem,1.8vw,1.05rem);
          text-align: center; padding: 12px 24px; background: rgba(10,16,32,0.85);
          border: 3px solid; box-shadow: 4px 4px 0 rgba(0,0,0,0.4);
          animation: msgPop 0.3s ease-out;
        }
        .bac-msg.win { color: var(--retro-green); border-color: var(--retro-green); }
        .bac-msg.lose { color: var(--retro-red); border-color: var(--retro-red); }
        .bac-msg.neutral { color: var(--retro-yellow); border-color: var(--retro-yellow); }
        @keyframes msgPop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .bac-dealing { font-family: 'Press Start 2P'; font-size: clamp(0.65rem,1.6vw,0.9rem); color: var(--retro-cyan); animation: dblink 0.6s ease-in-out infinite; }
        @keyframes dblink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .bac-next {
          font-family: 'Press Start 2P'; font-size: clamp(0.68rem,1.6vw,0.95rem);
          background: var(--retro-cyan); color: var(--bg-primary);
          border: 3px solid var(--retro-cyan); padding: 8px 24px; cursor: pointer;
          box-shadow: 4px 4px 0 rgba(0,255,247,0.3); transition: transform 0.1s;
        }
        .bac-next:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 rgba(0,255,247,0.4); }

        /* Betting */
        .bac-betting {
          flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
          gap: clamp(5px,1vh,10px); padding: clamp(8px,1.5vh,14px) 0; position: relative; z-index: 1;
        }
        .bac-bet-types { display: flex; gap: clamp(6px,1.5vw,14px); }
        .bac-betbtn {
          display: flex; flex-direction: column; align-items: center;
          padding: clamp(12px,1.8vh,18px) clamp(18px,3vw,28px);
          background: var(--bg-secondary); border: 3px solid; cursor: pointer;
          transition: transform 0.1s; box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
          min-width: clamp(82px,16vw,120px);
        }
        .bac-betbtn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 rgba(0,0,0,0.5); }
        .bac-betbtn.pb { border-color: var(--retro-blue); color: var(--retro-blue); }
        .bac-betbtn.pb.on { background: var(--retro-blue); color: var(--bg-primary); }
        .bac-betbtn.bb { border-color: var(--retro-red); color: var(--retro-red); }
        .bac-betbtn.bb.on { background: var(--retro-red); color: var(--bg-primary); }
        .bac-betbtn.tb { border-color: var(--retro-green); color: var(--retro-green); }
        .bac-betbtn.tb.on { background: var(--retro-green); color: var(--bg-primary); }
        .bac-bname { font-family: 'Press Start 2P'; font-size: clamp(0.52rem,1.3vw,0.72rem); }
        .bac-bodds { font-family: 'VT323', monospace; font-size: clamp(0.78rem,1.7vw,1.02rem); opacity: 0.8; margin-top: 2px; }

        .bac-chips { display: flex; gap: clamp(8px,1.6vw,16px); flex-wrap: wrap; justify-content: center; }
        .bac-chip {
          width: clamp(44px,7vw,76px); height: clamp(44px,7vw,76px);
          border-radius: 50%; border: 4px dashed rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Press Start 2P'; font-size: clamp(0.45rem,1.4vw,0.6rem);
          color: white; cursor: pointer; box-shadow: 0 6px 0 rgba(0,0,0,0.5);
          transition: transform 0.1s; user-select: none; text-shadow: 1px 1px 0 #000;
          position: relative;
        }
        .bac-chip::before { content:''; position:absolute; top:5px;left:5px;right:5px;bottom:5px; border-radius:50%; border:2px solid rgba(255,255,255,0.2); }
        .bac-chip:hover { transform: translateY(-5px); }
        .bac-chip:active { transform: translateY(0); box-shadow: 0 2px 0 rgba(0,0,0,0.5); }
        .bac-chip.off { filter: grayscale(1) brightness(0.5); cursor: not-allowed; pointer-events: none; }
        .bac-chip.v5 { background: var(--retro-blue); border-color: #88ccff; }
        .bac-chip.v10 { background: var(--retro-green); border-color: #88ff88; }
        .bac-chip.v25 { background: var(--retro-red); border-color: #ff8888; }
        .bac-chip.v50 { background: var(--retro-purple); border-color: #dcb3ff; }
        .bac-chip.v100 { background: #cc6600; border-color: #ff9933; }
        .bac-chip.v500 { background: #cc0066; border-color: #ff3399; }
        .bac-chip.vmax { background: var(--retro-yellow); color: black; text-shadow: none; border-color: #ffffaa; }

        .bac-bet-row { display: flex; align-items: center; gap: 10px; }
        .bac-bet-amt { font-family: 'Press Start 2P'; font-size: clamp(1.05rem,2.8vw,1.6rem); color: var(--retro-yellow); text-shadow: 2px 2px 0 #000; }
        .bac-btn-sm {
          font-family: 'Press Start 2P'; border: 3px solid; background: var(--bg-secondary);
          cursor: pointer; box-shadow: 4px 4px 0 rgba(0,0,0,0.5); transition: transform 0.1s;
          padding: clamp(8px,1.3vh,14px) clamp(16px,2.5vw,24px); font-size: clamp(0.6rem,1.3vw,0.82rem);
        }
        .bac-btn-sm.clr { border-color: #888; color: #aaa; }
        .bac-btn-sm.go { border-color: var(--retro-green); color: var(--retro-green); }
        .bac-btn-sm.go:hover:not(:disabled) { background: var(--retro-green); color: black; }
        .bac-btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 600px) {
          .bac-hands { flex-direction: column; align-items: center; gap: 8px; }
          .bac-vs { display: none; }
        }
      `}</style>

      <div className="bac-top">
        <h1>BACCARAT</h1>
        <div className="bac-sub">Bet on Player, Banker, or Tie</div>
      </div>

      <div className="bac-stats">
        <div className="bac-stat">
          <span className="bac-stat-lbl">Wallet</span>
          <span className="bac-stat-val">
            $
            {(wallet ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="bac-stat">
          <span className="bac-stat-lbl">Shoe</span>
          <span className="bac-stat-val">{shoe.length}</span>
        </div>
        {stagedBet > 0 && gamePhase === "betting" && (
          <div className="bac-stat">
            <span className="bac-stat-lbl">Bet</span>
            <span className="bac-stat-val">${stagedBet}</span>
          </div>
        )}
      </div>

      <div className="bac-table">
        <div className="bac-hands">
          <div className={`bac-hand-col ${winner === "banker" ? "w" : ""}`}>
            <div className={`bac-htitle ${winner === "banker" ? "wt" : ""}`}>
              BANKER
            </div>
            <div className="bac-cards">
              {bankerHand.length === 0 ? (
                <>
                  <CardSlot />
                  <CardSlot />
                </>
              ) : (
                bankerHand.map((c, i) => <BacCard key={`b${i}`} card={c} />)
              )}
            </div>
            {bankerHand.length > 0 && (
              <div className={`bac-score ${winner === "banker" ? "ws" : ""}`}>
                {bs}
              </div>
            )}
          </div>
          <div className="bac-vs">VS</div>
          <div className={`bac-hand-col ${winner === "player" ? "w" : ""}`}>
            <div className={`bac-htitle ${winner === "player" ? "wt" : ""}`}>
              PLAYER
            </div>
            <div className="bac-cards">
              {playerHand.length === 0 ? (
                <>
                  <CardSlot />
                  <CardSlot />
                </>
              ) : (
                playerHand.map((c, i) => <BacCard key={`p${i}`} card={c} />)
              )}
            </div>
            {playerHand.length > 0 && (
              <div className={`bac-score ${winner === "player" ? "ws" : ""}`}>
                {ps}
              </div>
            )}
          </div>
        </div>

        {message && <div className={`bac-msg ${resultType}`}>{message}</div>}
        {isDealing && !message && <div className="bac-dealing">Dealing…</div>}
        {gamePhase === "complete" && (
          <button className="bac-next" onClick={nextRound}>
            NEXT ROUND
          </button>
        )}
      </div>

      {gamePhase === "betting" && (
        <div className="bac-betting">
          <div className="bac-bet-types">
            <button
              className={`bac-betbtn pb ${selectedBet === "player" ? "on" : ""}`}
              onClick={() => setSelectedBet("player")}
            >
              <span className="bac-bname">Player</span>
              <span className="bac-bodds">1:1</span>
            </button>
            <button
              className={`bac-betbtn tb ${selectedBet === "tie" ? "on" : ""}`}
              onClick={() => setSelectedBet("tie")}
            >
              <span className="bac-bname">Tie</span>
              <span className="bac-bodds">8:1</span>
            </button>
            <button
              className={`bac-betbtn bb ${selectedBet === "banker" ? "on" : ""}`}
              onClick={() => setSelectedBet("banker")}
            >
              <span className="bac-bname">Banker</span>
              <span className="bac-bodds">1:1 -5%</span>
            </button>
          </div>
          <div className="bac-chips">
            {CHIP_VALUES.map((v) => (
              <div
                key={v}
                className={`bac-chip v${v} ${availBet < v ? "off" : ""}`}
                onClick={() => addChip(v)}
              >
                ${v}
              </div>
            ))}
            <div
              className={`bac-chip vmax ${availBet <= 0 ? "off" : ""}`}
              onClick={() => addChip(availBet)}
            >
              ALL
            </div>
          </div>
          <div className="bac-bet-row">
            <span className="bac-bet-amt">${stagedBet}</span>
            <button className="bac-btn-sm clr" onClick={clearBet}>
              CLEAR
            </button>
            <button
              className="bac-btn-sm go"
              onClick={handlePlaceBet}
              disabled={!selectedBet || stagedBet <= 0}
            >
              DEAL
            </button>
          </div>
        </div>
      )}

      {user?.isAdmin && (
        <>
          <button
            className="dev-tools-toggle"
            onClick={() => setShowDevPanel(!showDevPanel)}
            style={{
              position: "fixed",
              bottom: 20,
              right: 20,
              top: "auto",
              left: "auto",
              zIndex: 100,
            }}
          >
            DEV
          </button>
          {showDevPanel && (
            <div
              className="dev-tools-panel"
              style={{
                position: "fixed",
                bottom: 60,
                right: 20,
                top: "auto",
                left: "auto",
                zIndex: 100,
                background: "var(--bg-secondary)",
                border: "2px solid var(--retro-cyan)",
                padding: 10,
                fontFamily: "'VT323', monospace",
                fontSize: "0.9rem",
                color: "var(--retro-cyan)",
              }}
            >
              <p>
                Player: {ps} | Banker: {bs}
              </p>
              <p>
                Shoe: {shoe.length} | Phase: {gamePhase}
              </p>
            </div>
          )}
        </>
      )}

      <HowToPlay />
    </div>
  );
}

function HowToPlay() {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    const onPointerDown = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setVisible(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [visible]);

  return (
    <div className="instructions" ref={containerRef}>
      <button
        className="instructions-toggle"
        onClick={() => setVisible(!visible)}
      >
        How to Play
      </button>
      <div className={`instructions-content ${visible ? "visible" : ""}`}>
        <h3>Rules</h3>
        <ol>
          <li>
            Bet on <strong>Player</strong>, <strong>Banker</strong>, or{" "}
            <strong>Tie</strong>
          </li>
          <li>Two cards are dealt to each side; values are totaled (mod 10)</li>
          <li>A third card may be drawn based on standard baccarat rules</li>
          <li>The hand closest to 9 wins</li>
          <li>
            <strong>Player</strong> pays 1:1 • <strong>Banker</strong> pays
            0.95:1 • <strong>Tie</strong> pays 8:1
          </li>
        </ol>
        <p className="note">
          Face cards and 10s are worth 0. Aces are worth 1.
        </p>
      </div>
    </div>
  );
}
