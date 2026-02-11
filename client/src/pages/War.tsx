import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useSound } from "../hooks/useSound";
import { useConfetti } from "../hooks/useConfetti";
import { useAchievements } from "../hooks/useAchievements";
import { useSessionStats } from "../hooks/useSessionStats";

interface Card { suit: string; value: string; rank: number; isRed: boolean; }
type Phase = "betting" | "dealt" | "war" | "result";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const CHIP_VALUES = [1, 5, 10, 25, 100, 500];

function createDeck(): Card[] {
  const d: Card[] = [];
  for (const suit of SUITS) {
    for (let i = 0; i < VALUES.length; i++) {
      d.push({ suit, value: VALUES[i], rank: i + 2, isRed: suit === "♥" || suit === "♦" });
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
    <div className={`war-card ${card.isRed ? "red" : "black"}`}>
      <div className="wc-corner top">
        <span className="wc-rank">{card.value}</span>
        <span className="wc-suit-sm">{card.suit}</span>
      </div>
      <div className="wc-center">{card.suit}</div>
      <div className="wc-corner bottom">
        <span className="wc-rank">{card.value}</span>
        <span className="wc-suit-sm">{card.suit}</span>
      </div>
    </div>
  );
}

function CardSlot() {
  return <div className="war-card-slot" />;
}

export default function War() {
  const navigate = useNavigate();
  const { wallet, placeBet: placeBetMutation, addWinnings } = useWallet();
  const { playSound } = useSound();
  const { triggerConfetti } = useConfetti();
  const { incrementWinStreak, resetWinStreak, incrementSessionWins } = useAchievements();
  const { recordBet } = useSessionStats();

  const [deck, setDeck] = useState<Card[]>(createDeck);
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [dealerCard, setDealerCard] = useState<Card | null>(null);
  const [warPlayerCards, setWarPlayerCards] = useState<Card[]>([]);
  const [warDealerCards, setWarDealerCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>("betting");
  const [stagedBet, setStagedBet] = useState(0);
  const [message, setMessage] = useState("");
  const [resultType, setResultType] = useState<"win" | "lose" | "neutral">("neutral");
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
    if (avail >= val) setStagedBet(p => p + val);
  };
  const clearBet = () => { if (phase === "betting") setStagedBet(0); };

  const deal = async () => {
    if (stagedBet <= 0 || stagedBet > (wallet ?? 0)) return;
    try { await placeBetMutation(stagedBet, "War"); } catch { setMessage("Failed to place bet"); return; }

    playSound("deal");
    const d = ensureDeck();
    const pc = d[0], dc = d[1];
    setPlayerCard(pc); setDealerCard(dc);
    setDeck(d.slice(2));
    setWarPlayerCards([]); setWarDealerCards([]);

    if (pc.rank > dc.rank) {
      setTimeout(() => win(`Your ${pc.value}${pc.suit} beats ${dc.value}${dc.suit}!`), 600);
    } else if (pc.rank < dc.rank) {
      setTimeout(() => lose(`Dealer's ${dc.value}${dc.suit} beats your ${pc.value}${pc.suit}.`), 600);
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
    try { await placeBetMutation(warCost, "War - War Bet"); } catch { surrender(); return; }

    playSound("deal");
    setPhase("war");
    const d = ensureDeck();
    // Burn 3 cards each, then deal 1 each
    const burned = d.slice(0, 6);
    const wpc = d[6], wdc = d[7];
    setWarPlayerCards([...burned.slice(0, 3), wpc]);
    setWarDealerCards([...burned.slice(3, 6), wdc]);
    setDeck(d.slice(8));

    setTimeout(() => {
      if (wpc.rank >= wdc.rank) {
        // Player wins war — gets original bet + war bet back + original bet winnings
        const winAmt = stagedBet * 4; // 2x original + 2x war
        winWar(`War won! ${wpc.value}${wpc.suit} vs ${wdc.value}${wdc.suit}!`, winAmt);
      } else {
        loseWar(`War lost. ${wdc.value}${wdc.suit} beats ${wpc.value}${wpc.suit}.`);
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
    setHistory(h => [...h, "L"]);
    setPhase("result");
    if (refund > 0) addWinnings(refund, "War - Surrender Refund").catch(() => {});
  };

  const win = async (msg: string) => {
    setMessage(msg + ` +$${stagedBet}`);
    setResultType("win"); playSound("win");
    triggerConfetti({ intensity: "medium" });
    incrementWinStreak(); incrementSessionWins();
    recordBet("war", stagedBet, "win");
    setHistory(h => [...h, "W"]);
    setPhase("result");
    try { await addWinnings(stagedBet * 2, "War"); } catch {}
  };

  const winWar = async (msg: string, amount: number) => {
    setMessage(msg + ` +$${amount - stagedBet * 2}`);
    setResultType("win"); playSound("win");
    triggerConfetti({ intensity: "high" });
    incrementWinStreak(); incrementSessionWins();
    recordBet("war", stagedBet * 2, "win");
    setHistory(h => [...h, "W"]);
    setPhase("result");
    try { await addWinnings(amount, "War"); } catch {}
  };

  const lose = (msg: string) => {
    setMessage(msg + ` -$${stagedBet}`);
    setResultType("lose"); playSound("lose");
    resetWinStreak(); recordBet("war", stagedBet, "loss");
    setHistory(h => [...h, "L"]);
    setPhase("result");
  };

  const loseWar = (msg: string) => {
    setMessage(msg + ` -$${stagedBet * 2}`);
    setResultType("lose"); playSound("lose");
    resetWinStreak(); recordBet("war", stagedBet * 2, "loss");
    setHistory(h => [...h, "L"]);
    setPhase("result");
  };

  const newRound = () => {
    setPlayerCard(null); setDealerCard(null);
    setWarPlayerCards([]); setWarDealerCards([]);
    setPhase("betting"); setMessage(""); setStagedBet(0);
  };

  const availBet = (wallet ?? 0) - stagedBet;

  return (
    <div className="war-page">
      <button className="home-btn" onClick={() => navigate("/")}>🏠 HOME</button>

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
        .war-stat { background: var(--bg-secondary); border: 3px solid var(--retro-cyan); padding: 5px 14px; box-shadow: 4px 4px 0 rgba(0,0,0,0.5); text-align: center; }
        .war-stat-lbl { font-family: 'Press Start 2P'; font-size: clamp(0.25rem,0.7vw,0.35rem); color: var(--text-secondary); display: block; }
        .war-stat-val { font-family: 'Press Start 2P'; font-size: clamp(0.65rem,1.8vw,1rem); color: var(--retro-green); }

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
        .war-slabel { font-family: 'Press Start 2P'; font-size: clamp(0.4rem,1.1vw,0.65rem); color: var(--retro-cyan); }
        .war-slabel.wt { color: var(--retro-green); }
        .war-vs { font-family: 'Press Start 2P'; font-size: clamp(0.6rem,1.5vw,1rem); color: var(--retro-magenta); align-self: center; }

        /* Cards */
        .war-card {
          width: clamp(64px,13vw,110px); height: clamp(90px,18vw,154px);
          background: var(--card-white); border: 3px solid var(--text-secondary);
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 4px; position: relative; box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
          animation: warSlide 0.3s ease-out;
        }
        @keyframes warSlide { from { opacity:0; transform:translateY(-16px) scale(0.92); } to { opacity:1; transform:translateY(0) scale(1); } }
        .war-card.red { color: var(--card-red); border-color: var(--retro-red); }
        .war-card.black { color: var(--card-black); }
        .wc-corner { display: flex; flex-direction: column; align-items: center; line-height: 1.1; }
        .wc-corner.bottom { transform: rotate(180deg); }
        .wc-rank { font-family: 'Press Start 2P'; font-size: clamp(0.4rem,1.1vw,0.6rem); }
        .wc-suit-sm { font-size: clamp(0.4rem,1vw,0.55rem); }
        .wc-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: clamp(1.2rem,3.5vw,2.2rem); }
        .war-card-slot {
          width: clamp(64px,13vw,110px); height: clamp(90px,18vw,154px);
          border: 3px dashed var(--retro-purple); opacity: 0.35;
          background: repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(153,102,255,0.06) 6px,rgba(153,102,255,0.06) 12px);
          box-shadow: 3px 3px 0 rgba(0,0,0,0.3);
        }

        /* War cards row */
        .war-extra { display: flex; gap: 4px; margin-top: 6px; }
        .war-extra .war-card {
          width: clamp(40px,8vw,60px); height: clamp(56px,11vw,84px);
        }
        .war-extra .war-card .wc-rank { font-size: clamp(0.3rem,0.8vw,0.4rem); }
        .war-extra .war-card .wc-center { font-size: clamp(0.9rem,2.5vw,1.4rem); }

        .war-msg {
          font-family: 'Press Start 2P'; font-size: clamp(0.45rem,1.2vw,0.7rem);
          padding: 6px 16px; border: 3px solid; box-shadow: 4px 4px 0 rgba(0,0,0,0.4);
          background: rgba(10,16,32,0.85); text-align: center;
        }
        .war-msg.win { color: var(--retro-green); border-color: var(--retro-green); }
        .war-msg.lose { color: var(--retro-red); border-color: var(--retro-red); }
        .war-msg.neutral { color: var(--retro-yellow); border-color: var(--retro-yellow); }

        /* War/Surrender buttons */
        .war-choice { display: flex; gap: 12px; }
        .war-choice-btn {
          font-family: 'Press Start 2P'; font-size: clamp(0.4rem,1.1vw,0.6rem);
          padding: 8px 20px; border: 3px solid; background: var(--bg-secondary);
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
        .war-chips { display: flex; gap: clamp(4px,0.8vw,8px); flex-wrap: wrap; justify-content: center; }
        .wch {
          width: clamp(36px,6vw,52px); height: clamp(36px,6vw,52px);
          border-radius: 50%; border: 3px dashed rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Press Start 2P'; font-size: clamp(0.25rem,0.75vw,0.4rem);
          color: white; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,0.5);
          transition: transform 0.1s; user-select: none; text-shadow: 1px 1px 0 #000;
        }
        .wch:hover { transform: translateY(-3px); }
        .wch.off { filter: grayscale(1) brightness(0.5); pointer-events: none; }
        .wch.v1 { background: #666; } .wch.v5 { background: var(--retro-blue); }
        .wch.v10 { background: var(--retro-green); } .wch.v25 { background: var(--retro-red); }
        .wch.v100 { background: var(--retro-purple); } .wch.v500 { background: #cc6600; }
        .wch.vmax { background: var(--retro-yellow); color: black; text-shadow: none; }

        .war-bet-row { display: flex; align-items: center; gap: 10px; }
        .war-bet-amt { font-family: 'Press Start 2P'; font-size: clamp(0.75rem,2vw,1.1rem); color: var(--retro-yellow); text-shadow: 2px 2px 0 #000; }
        .war-btn {
          font-family: 'Press Start 2P'; border: 3px solid; background: var(--bg-secondary);
          cursor: pointer; box-shadow: 4px 4px 0 rgba(0,0,0,0.5); transition: transform 0.1s;
          padding: clamp(5px,0.9vh,8px) clamp(10px,1.8vw,16px); font-size: clamp(0.35rem,0.9vw,0.5rem);
        }
        .war-btn.clr { border-color: #888; color: #aaa; }
        .war-btn.deal { border-color: var(--retro-green); color: var(--retro-green); padding: 8px 24px; font-size: clamp(0.45rem,1.2vw,0.65rem); }
        .war-btn.deal:hover:not(:disabled) { background: var(--retro-green); color: black; }
        .war-btn.next { border-color: var(--retro-cyan); color: var(--retro-cyan); }
        .war-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .war-hist { display: flex; gap: 2px; justify-content: center; flex-wrap: wrap; flex-shrink: 0; padding: 3px 0; }
        .war-hdot {
          width: clamp(14px,2.2vw,20px); height: clamp(14px,2.2vw,20px); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Press Start 2P'; font-size: clamp(0.15rem,0.5vw,0.25rem); color: white;
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
        <div className="war-stat"><span className="war-stat-lbl">Wallet</span><span className="war-stat-val">${(wallet ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        <div className="war-stat"><span className="war-stat-lbl">Deck</span><span className="war-stat-val">{deck.length}</span></div>
        {stagedBet > 0 && <div className="war-stat"><span className="war-stat-lbl">Bet</span><span className="war-stat-val">${stagedBet}</span></div>}
      </div>

      <div className="war-table">
        <div className="war-hands">
          <div className={`war-side ${resultType === "lose" && phase === "result" ? "w" : ""}`}>
            <div className={`war-slabel ${resultType === "lose" && phase === "result" ? "wt" : ""}`}>DEALER</div>
            {dealerCard ? <WarCard card={dealerCard} /> : <CardSlot />}
            {warDealerCards.length > 0 && (
              <div className="war-extra">{warDealerCards.map((c, i) => <WarCard key={`wd${i}`} card={c} />)}</div>
            )}
          </div>
          <div className="war-vs">VS</div>
          <div className={`war-side ${resultType === "win" && phase === "result" ? "w" : ""}`}>
            <div className={`war-slabel ${resultType === "win" && phase === "result" ? "wt" : ""}`}>YOU</div>
            {playerCard ? <WarCard card={playerCard} /> : <CardSlot />}
            {warPlayerCards.length > 0 && (
              <div className="war-extra">{warPlayerCards.map((c, i) => <WarCard key={`wp${i}`} card={c} />)}</div>
            )}
          </div>
        </div>

        {message && <div className={`war-msg ${resultType}`}>{message}</div>}

        {phase === "dealt" && (
          <div className="war-choice">
            <button className="war-choice-btn go-war" onClick={goToWar}>⚔️ GO TO WAR</button>
            <button className="war-choice-btn surr" onClick={surrender}>🏳️ SURRENDER</button>
          </div>
        )}
      </div>

      {phase === "betting" && (
        <div className="war-controls">
          <div className="war-chips">
            {CHIP_VALUES.map(v => (
              <div key={v} className={`wch v${v} ${availBet < v ? "off" : ""}`} onClick={() => addChip(v)}>${v}</div>
            ))}
            <div className={`wch vmax ${availBet <= 0 ? "off" : ""}`} onClick={() => { if (phase === "betting") setStagedBet(wallet ?? 0); }}>ALL</div>
          </div>
          <div className="war-bet-row">
            <span className="war-bet-amt">${stagedBet}</span>
            <button className="war-btn clr" onClick={clearBet}>CLEAR</button>
            <button className="war-btn deal" onClick={deal} disabled={stagedBet <= 0}>DEAL</button>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="war-controls">
          <button className="war-btn next" onClick={newRound}>NEW ROUND</button>
        </div>
      )}

      {history.length > 0 && (
        <div className="war-hist">
          {history.slice(-30).map((r, i) => <div key={i} className={`war-hdot ${r}`}>{r}</div>)}
        </div>
      )}
    </div>
  );
}
