import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useSound } from "../hooks/useSound";
import { useConfetti } from "../hooks/useConfetti";
import { useAchievements } from "../hooks/useAchievements";
import { useSessionStats } from "../hooks/useSessionStats";

interface Card {
  suit: string;
  value: string;
  rank: number;
  isRed: boolean;
}
type Phase = "betting" | "dealt" | "war" | "result";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = [
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
  "A",
];
const CHIP_VALUES = [1, 5, 10, 25, 100, 500];

function createDeck(): Card[] {
  const d: Card[] = [];
  for (const suit of SUITS) {
    for (let i = 0; i < VALUES.length; i++) {
      d.push({
        suit,
        value: VALUES[i],
        rank: i + 2,
        isRed: suit === "♥" || suit === "♦",
      });
    }
  }
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function WarCard({ card }: { card: Card }) {
  return (
    <div className="war-card">
      <div className={`card-front ${card.isRed ? "red" : "black"}`}>
        <div className="card-corner top">
          <span className="card-value">{card.value}</span>
          <span className="card-suit-small">{card.suit}</span>
        </div>
        <span className="card-center">{card.suit}</span>
        <div className="card-corner bottom">
          <span className="card-value">{card.value}</span>
          <span className="card-suit-small">{card.suit}</span>
        </div>
      </div>
      <div className="card-back" />
    </div>
  );
}

function CardSlot() {
  return (
    <div className="war-card-slot">
      <div className="card-back" />
    </div>
  );
}

export default function War() {
  const navigate = useNavigate();
  const { wallet, placeBet: placeBetMutation, addWinnings } = useWallet();
  const { playSound } = useSound();
  const { triggerConfetti } = useConfetti();
  const { incrementWinStreak, resetWinStreak, incrementSessionWins } =
    useAchievements();
  const { recordBet } = useSessionStats();

  const [deck, setDeck] = useState<Card[]>(createDeck);
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [dealerCard, setDealerCard] = useState<Card | null>(null);
  const [warPlayerCards, setWarPlayerCards] = useState<Card[]>([]);
  const [warDealerCards, setWarDealerCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>("betting");
  const [stagedBet, setStagedBet] = useState(0);
  const [message, setMessage] = useState("");
  const [resultType, setResultType] = useState<"win" | "lose" | "neutral">(
    "neutral",
  );
  const [history, setHistory] = useState<("W" | "L" | "T")[]>([]);

  const ensureDeck = useCallback((): Card[] => {
    if (deck.length < 10) {
      const d = createDeck();
      setDeck(d);
      return d;
    }
    return deck;
  }, [deck]);

  const addChip = (val: number) => {
    if (phase !== "betting") return;
    const avail = (wallet ?? 0) - stagedBet;
    if (avail >= val) setStagedBet((p) => p + val);
  };
  const clearBet = () => {
    if (phase === "betting") setStagedBet(0);
  };

  const deal = async () => {
    if (stagedBet <= 0 || stagedBet > (wallet ?? 0)) return;
    try {
      await placeBetMutation(stagedBet, "War");
    } catch {
      setMessage("Failed to place bet");
      return;
    }

    playSound("deal");
    const d = ensureDeck();
    const pc = d[0],
      dc = d[1];
    setPlayerCard(pc);
    setDealerCard(dc);
    setDeck(d.slice(2));
    setWarPlayerCards([]);
    setWarDealerCards([]);

    if (pc.rank > dc.rank) {
      setTimeout(
        () => win(`Your ${pc.value}${pc.suit} beats ${dc.value}${dc.suit}!`),
        600,
      );
    } else if (pc.rank < dc.rank) {
      setTimeout(
        () =>
          lose(
            `Dealer's ${dc.value}${dc.suit} beats your ${pc.value}${pc.suit}.`,
          ),
        600,
      );
    } else {
      // Tie — offer war
      setPhase("dealt");
      setTimeout(() => {
        setMessage(`Tie! ${pc.value} vs ${dc.value}. Go to WAR or Surrender?`);
        setResultType("neutral");
      }, 600);
    }
  };

  const goToWar = async () => {
    // War costs an additional bet of equal size
    const warCost = stagedBet;
    if (warCost > (wallet ?? 0)) {
      setMessage("Not enough for war! Surrendering...");
      surrender();
      return;
    }
    try {
      await placeBetMutation(warCost, "War - War Bet");
    } catch {
      surrender();
      return;
    }

    playSound("deal");
    setPhase("war");
    const d = ensureDeck();
    // Burn 3 cards each, then deal 1 each
    const burned = d.slice(0, 6);
    const wpc = d[6],
      wdc = d[7];
    setWarPlayerCards([...burned.slice(0, 3), wpc]);
    setWarDealerCards([...burned.slice(3, 6), wdc]);
    setDeck(d.slice(8));

    setTimeout(() => {
      if (wpc.rank >= wdc.rank) {
        // Player wins war — gets original bet + war bet back + original bet winnings
        const winAmt = stagedBet * 4; // 2x original + 2x war
        winWar(
          `War won! ${wpc.value}${wpc.suit} vs ${wdc.value}${wdc.suit}!`,
          winAmt,
        );
      } else {
        loseWar(
          `War lost. ${wdc.value}${wdc.suit} beats ${wpc.value}${wpc.suit}.`,
        );
      }
    }, 800);
  };

  const surrender = () => {
    // Get half bet back
    const refund = Math.floor(stagedBet / 2);
    setMessage(`Surrendered. -$${stagedBet - refund}`);
    setResultType("lose");
    playSound("lose");
    resetWinStreak();
    recordBet("war", stagedBet, "loss");
    setHistory((h) => [...h, "L"]);
    setPhase("result");
    if (refund > 0)
      addWinnings(refund, "War - Surrender Refund").catch(() => {});
  };

  const win = async (msg: string) => {
    setMessage(msg + ` +$${stagedBet}`);
    setResultType("win");
    playSound("win");
    triggerConfetti({ intensity: "medium" });
    incrementWinStreak();
    incrementSessionWins();
    recordBet("war", stagedBet, "win");
    setHistory((h) => [...h, "W"]);
    setPhase("result");
    try {
      await addWinnings(stagedBet * 2, "War");
    } catch {}
  };

  const winWar = async (msg: string, amount: number) => {
    setMessage(msg + ` +$${amount - stagedBet * 2}`);
    setResultType("win");
    playSound("win");
    triggerConfetti({ intensity: "high" });
    incrementWinStreak();
    incrementSessionWins();
    recordBet("war", stagedBet * 2, "win");
    setHistory((h) => [...h, "W"]);
    setPhase("result");
    try {
      await addWinnings(amount, "War");
    } catch {}
  };

  const lose = (msg: string) => {
    setMessage(msg + ` -$${stagedBet}`);
    setResultType("lose");
    playSound("lose");
    resetWinStreak();
    recordBet("war", stagedBet, "loss");
    setHistory((h) => [...h, "L"]);
    setPhase("result");
  };

  const loseWar = (msg: string) => {
    setMessage(msg + ` -$${stagedBet * 2}`);
    setResultType("lose");
    playSound("lose");
    resetWinStreak();
    recordBet("war", stagedBet * 2, "loss");
    setHistory((h) => [...h, "L"]);
    setPhase("result");
  };

  const newRound = () => {
    setPlayerCard(null);
    setDealerCard(null);
    setWarPlayerCards([]);
    setWarDealerCards([]);
    setPhase("betting");
    setMessage("");
    setStagedBet(0);
  };

  const availBet = (wallet ?? 0) - stagedBet;

  return (
    <div className="war-page">
      <button className="home-btn" onClick={() => navigate("/")}>
        🏠 HOME
      </button>

      <style>{`
        .war-page {
          height: 100vh; height: 100dvh;
          display: flex; flex-direction: column;
          max-width: 1250px; margin: 0 auto;
          padding: clamp(10px,2vh,18px) 20px;
          overflow: hidden; position: relative;
        }
        .war-page .home-btn { position: fixed; top: 20px; left: 20px; z-index: 50; }

        .war-top { flex-shrink: 0; text-align: center; }
        .war-top h1 { font-family: 'Press Start 2P'; font-size: clamp(1rem,3.5vw,2rem); color: var(--retro-yellow); text-shadow: 3px 3px 0 var(--retro-magenta); margin: 0; }
        .war-sub { font-family: 'VT323'; font-size: clamp(0.8rem,2.2vw,1.1rem); color: var(--text-secondary); }

        .war-stats {
          display: flex; justify-content: center; gap: clamp(6px,1.5vw,16px);
          margin: clamp(4px,1vh,10px) 0; flex-shrink: 0;
        }
        .war-stat { background: var(--bg-secondary); border: 3px solid var(--retro-cyan); padding: 10px 20px; box-shadow: 4px 4px 0 rgba(0,0,0,0.5); text-align: center; }
        .war-stat-lbl { font-family: 'Press Start 2P'; font-size: clamp(0.5rem,1.2vw,0.65rem); color: var(--text-secondary); display: block; }
        .war-stat-val { font-family: 'Press Start 2P'; font-size: clamp(1.05rem,2.8vw,1.4rem); color: var(--retro-green); }

        .war-table {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: clamp(10px,2.5vh,22px); min-height: 0;
        }

        .war-hands {
          display: flex; justify-content: center; align-items: flex-start;
          gap: clamp(20px,6vw,60px); width: 100%; max-width: 700px;
          padding: clamp(12px,2.5vh,22px) clamp(14px,3vw,26px);
          background: linear-gradient(180deg, rgba(16,28,52,0.88), rgba(10,18,36,0.92));
          border: 3px solid var(--retro-cyan);
          box-shadow: 8px 8px 0 rgba(0,255,247,0.12), inset 0 0 20px rgba(0,0,0,0.5);
        }
        .war-side { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .war-side.w { filter: drop-shadow(0 0 12px rgba(0,255,0,0.4)); }
        .war-slabel { font-family: 'Press Start 2P'; font-size: clamp(0.62rem,1.5vw,0.88rem); color: var(--retro-cyan); }
        .war-slabel.wt { color: var(--retro-green); }
        .war-vs { font-family: 'Press Start 2P'; font-size: clamp(0.88rem,2.2vw,1.3rem); color: var(--retro-magenta); align-self: center; }

        /* Cards — reuse global card-front / card-back / card-corner etc. */
        .war-card {
          width: clamp(80px,16vw,132px); height: clamp(112px,22vw,185px);
          position: relative;
          animation: warSlide 0.3s ease-out;
        }
        @keyframes warSlide { from { opacity:0; transform:translateY(-16px) scale(0.92); } to { opacity:1; transform:translateY(0) scale(1); } }
        .war-card .card-front,
        .war-card .card-back {
          width: 100%; height: 100%; position: absolute; top: 0; left: 0;
        }
        .war-card .card-front {
          background-color: var(--card-white);
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 6px; border: 4px solid var(--card-black);
          box-shadow: 4px 4px 0px rgba(0,0,0,0.5); z-index: 2;
        }
        .war-card .card-front::before {
          content: ''; position: absolute; top: 3px; left: 3px; right: 3px; bottom: 3px;
          border: 2px solid rgba(0,0,0,0.15); pointer-events: none;
        }
        .war-card .card-back {
          background: var(--bg-card);
          border: 4px solid var(--retro-purple);
          box-shadow: 4px 4px 0px rgba(153,102,255,0.4);
          display: flex; align-items: center; justify-content: center; overflow: hidden; z-index: 1;
        }
        .war-card .card-back::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-conic-gradient(var(--retro-purple) 0deg 90deg, var(--bg-card) 90deg 180deg);
          background-size: 16px 16px; opacity: 0.3;
        }
        .war-card .card-back::after {
          content: ''; width: 30px; height: 30px;
          border: 4px solid var(--retro-magenta); position: relative; z-index: 1;
        }
        .war-card-slot {
          width: clamp(80px,16vw,132px); height: clamp(112px,22vw,185px);
          border: 3px dashed var(--retro-purple); opacity: 0.35;
          position: relative; overflow: hidden;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.3);
        }
        .war-card-slot .card-back {
          width: 100%; height: 100%; position: absolute; top: 0; left: 0;
          background: var(--bg-card);
          border: none;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .war-card-slot .card-back::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-conic-gradient(var(--retro-purple) 0deg 90deg, var(--bg-card) 90deg 180deg);
          background-size: 12px 12px; opacity: 0.15;
        }
        .war-card-slot .card-back::after {
          content: ''; width: 20px; height: 20px;
          border: 3px solid var(--retro-magenta); position: relative; z-index: 1; opacity: 0.4;
        }

        /* War cards row */
        .war-extra { display: flex; gap: 4px; margin-top: 6px; }
        .war-extra .war-card {
          width: clamp(52px,10vw,76px); height: clamp(72px,14vw,106px);
        }

        .war-msg {
          font-family: 'Press Start 2P'; font-size: clamp(0.7rem,1.7vw,0.95rem);
          padding: 12px 22px; border: 3px solid; box-shadow: 4px 4px 0 rgba(0,0,0,0.4);
          background: rgba(10,16,32,0.85); text-align: center;
        }
        .war-msg.win { color: var(--retro-green); border-color: var(--retro-green); }
        .war-msg.lose { color: var(--retro-red); border-color: var(--retro-red); }
        .war-msg.neutral { color: var(--retro-yellow); border-color: var(--retro-yellow); }

        /* War/Surrender buttons */
        .war-choice { display: flex; gap: 12px; }
        .war-choice-btn {
          font-family: 'Press Start 2P'; font-size: clamp(0.62rem,1.5vw,0.88rem);
          padding: 14px 28px; border: 3px solid; background: var(--bg-secondary);
          cursor: pointer; box-shadow: 4px 4px 0 rgba(0,0,0,0.5); transition: transform 0.1s;
        }
        .war-choice-btn:hover { transform: translate(-2px,-2px); }
        .war-choice-btn.go-war { border-color: var(--retro-red); color: var(--retro-red); }
        .war-choice-btn.go-war:hover { background: var(--retro-red); color: white; }
        .war-choice-btn.surr { border-color: #888; color: #aaa; }

        /* Chips & controls */
        .war-controls {
          flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
          gap: clamp(5px,1vh,10px); padding: clamp(6px,1.2vh,12px) 0;
        }
        .war-chips { display: flex; gap: clamp(8px,1.6vw,16px); flex-wrap: wrap; justify-content: center; }
        .wch {
          width: clamp(44px,7vw,76px); height: clamp(44px,7vw,76px);
          border-radius: 50%; border: 4px dashed rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Press Start 2P'; font-size: clamp(0.45rem,1.4vw,0.6rem);
          color: white; cursor: pointer; box-shadow: 0 6px 0 rgba(0,0,0,0.5);
          transition: transform 0.1s; user-select: none; text-shadow: 1px 1px 0 #000;
          position: relative;
        }
        .wch::before { content:''; position:absolute; top:5px;left:5px;right:5px;bottom:5px; border-radius:50%; border:2px solid rgba(255,255,255,0.2); }
        .wch:hover { transform: translateY(-5px); }
        .wch:active { transform: translateY(0); box-shadow: 0 2px 0 rgba(0,0,0,0.5); }
        .wch.off { filter: grayscale(1) brightness(0.5); pointer-events: none; }
        .wch.v1 { background: #666; border-color: #999; } .wch.v5 { background: var(--retro-blue); border-color: #88ccff; }
        .wch.v10 { background: var(--retro-green); border-color: #88ff88; } .wch.v25 { background: var(--retro-red); border-color: #ff8888; }
        .wch.v100 { background: var(--retro-purple); border-color: #dcb3ff; } .wch.v500 { background: #cc6600; border-color: #ff9933; }
        .wch.vmax { background: var(--retro-yellow); color: black; text-shadow: none; border-color: #ffffaa; }

        .war-bet-row { display: flex; align-items: center; gap: 10px; }
        .war-bet-amt { font-family: 'Press Start 2P'; font-size: clamp(1.05rem,2.8vw,1.5rem); color: var(--retro-yellow); text-shadow: 2px 2px 0 #000; }
        .war-btn {
          font-family: 'Press Start 2P'; border: 3px solid; background: var(--bg-secondary);
          cursor: pointer; box-shadow: 4px 4px 0 rgba(0,0,0,0.5); transition: transform 0.1s;
          padding: clamp(8px,1.3vh,14px) clamp(16px,2.5vw,24px); font-size: clamp(0.58rem,1.3vw,0.78rem);
        }
        .war-btn.clr { border-color: #888; color: #aaa; }
        .war-btn.deal { border-color: var(--retro-green); color: var(--retro-green); padding: 14px 38px; font-size: clamp(0.72rem,1.7vw,1rem); }
        .war-btn.deal:hover:not(:disabled) { background: var(--retro-green); color: black; }
        .war-btn.next { border-color: var(--retro-cyan); color: var(--retro-cyan); }
        .war-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .war-hist { display: flex; gap: 2px; justify-content: center; flex-wrap: wrap; flex-shrink: 0; padding: 3px 0; }
        .war-hdot {
          width: clamp(22px,3.2vw,30px); height: clamp(22px,3.2vw,30px); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Press Start 2P'; font-size: clamp(0.34rem,0.85vw,0.46rem); color: white;
          text-shadow: 1px 1px 0 #000;
        }
        .war-hdot.W { background: var(--retro-green); }
        .war-hdot.L { background: var(--retro-red); }
        .war-hdot.T { background: var(--retro-yellow); }
      `}</style>

      <div className="war-top">
        <h1>⚔️ WAR ⚔️</h1>
        <div className="war-sub">Higher card wins</div>
      </div>

      <div className="war-stats">
        <div className="war-stat">
          <span className="war-stat-lbl">Wallet</span>
          <span className="war-stat-val">
            $
            {(wallet ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="war-stat">
          <span className="war-stat-lbl">Deck</span>
          <span className="war-stat-val">{deck.length}</span>
        </div>
        {stagedBet > 0 && (
          <div className="war-stat">
            <span className="war-stat-lbl">Bet</span>
            <span className="war-stat-val">${stagedBet}</span>
          </div>
        )}
      </div>

      <div className="war-table">
        <div className="war-hands">
          <div
            className={`war-side ${resultType === "lose" && phase === "result" ? "w" : ""}`}
          >
            <div
              className={`war-slabel ${resultType === "lose" && phase === "result" ? "wt" : ""}`}
            >
              DEALER
            </div>
            {dealerCard ? <WarCard card={dealerCard} /> : <CardSlot />}
            {warDealerCards.length > 0 && (
              <div className="war-extra">
                {warDealerCards.map((c, i) => (
                  <WarCard key={`wd${i}`} card={c} />
                ))}
              </div>
            )}
          </div>
          <div className="war-vs">VS</div>
          <div
            className={`war-side ${resultType === "win" && phase === "result" ? "w" : ""}`}
          >
            <div
              className={`war-slabel ${resultType === "win" && phase === "result" ? "wt" : ""}`}
            >
              YOU
            </div>
            {playerCard ? <WarCard card={playerCard} /> : <CardSlot />}
            {warPlayerCards.length > 0 && (
              <div className="war-extra">
                {warPlayerCards.map((c, i) => (
                  <WarCard key={`wp${i}`} card={c} />
                ))}
              </div>
            )}
          </div>
        </div>

        {message && <div className={`war-msg ${resultType}`}>{message}</div>}

        {phase === "dealt" && (
          <div className="war-choice">
            <button className="war-choice-btn go-war" onClick={goToWar}>
              ⚔️ GO TO WAR
            </button>
            <button className="war-choice-btn surr" onClick={surrender}>
              🏳️ SURRENDER
            </button>
          </div>
        )}
      </div>

      {phase === "betting" && (
        <div className="war-controls">
          <div className="war-chips">
            {CHIP_VALUES.map((v) => (
              <div
                key={v}
                className={`wch v${v} ${availBet < v ? "off" : ""}`}
                onClick={() => addChip(v)}
              >
                ${v}
              </div>
            ))}
            <div
              className={`wch vmax ${availBet <= 0 ? "off" : ""}`}
              onClick={() => {
                if (phase === "betting") setStagedBet(wallet ?? 0);
              }}
            >
              ALL
            </div>
          </div>
          <div className="war-bet-row">
            <span className="war-bet-amt">${stagedBet}</span>
            <button className="war-btn clr" onClick={clearBet}>
              CLEAR
            </button>
            <button
              className="war-btn deal"
              onClick={deal}
              disabled={stagedBet <= 0}
            >
              DEAL
            </button>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="war-controls">
          <button className="war-btn next" onClick={newRound}>
            NEW ROUND
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="war-hist">
          {history.slice(-30).map((r, i) => (
            <div key={i} className={`war-hdot ${r}`}>
              {r}
            </div>
          ))}
        </div>
      )}

      <HowToPlay />
    </div>
  );
}

function HowToPlay() {
  const [visible, setVisible] = useState(false);
  return (
    <div className="instructions">
      <button className="instructions-toggle" onClick={() => setVisible(!visible)}>
        How to Play
      </button>
      <div className={`instructions-content ${visible ? "visible" : ""}`}>
        <h3>Rules</h3>
        <ol>
          <li>Place your bet and press <strong>DEAL</strong></li>
          <li>You and the dealer each get one card</li>
          <li>Higher card wins! You get 2x your bet</li>
          <li>On a <strong>tie</strong>, you can <strong>Go to War</strong> (double your bet) or <strong>Surrender</strong> (lose half)</li>
          <li>In War, three cards are burned, then another card each — higher wins 3x</li>
        </ol>
        <p className="note">
          Card ranks: 2 (low) through Ace (high). Suit doesn't matter.
        </p>
      </div>
    </div>
  );
}
