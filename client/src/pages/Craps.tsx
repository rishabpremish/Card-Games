import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useSound } from "../hooks/useSound";
import { useConfetti } from "../hooks/useConfetti";
import { useAchievements } from "../hooks/useAchievements";
import { useSessionStats } from "../hooks/useSessionStats";

type Phase = "betting" | "rolling" | "point" | "result";
type BetType = "pass" | "dontpass" | "field";

const CHIP_VALUES = [1, 5, 10, 25, 100, 500];

const DIE_FACES: Record<number, string> = {
  1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅",
};

function rollDie(): number { return Math.floor(Math.random() * 6) + 1; }

export default function Craps() {
  const navigate = useNavigate();
  const { wallet, placeBet: placeBetMutation, addWinnings } = useWallet();
  const { playSound } = useSound();
  const { triggerConfetti } = useConfetti();
  const { incrementWinStreak, resetWinStreak, incrementSessionWins } = useAchievements();
  const { recordBet } = useSessionStats();

  const [phase, setPhase] = useState<Phase>("betting");
  const [betType, setBetType] = useState<BetType>("pass");
  const [stagedBet, setStagedBet] = useState(0);
  const [die1, setDie1] = useState(0);
  const [die2, setDie2] = useState(0);
  const [point, setPoint] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [resultType, setResultType] = useState<"win" | "lose" | "neutral">("neutral");
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<{ total: number; outcome: string }[]>([]);

  const addChip = (val: number) => {
    if (phase !== "betting") return;
    const avail = (wallet ?? 0) - stagedBet;
    if (avail >= val) setStagedBet(p => p + val);
  };
  const clearBet = () => { if (phase === "betting") setStagedBet(0); };

  const roll = useCallback(async () => {
    if (rolling) return;

    // On come-out roll, place bet
    if (phase === "betting") {
      if (stagedBet <= 0 || stagedBet > (wallet ?? 0)) return;
      try { await placeBetMutation(stagedBet, "Craps"); } catch { setMessage("Failed to place bet"); return; }
    }

    setRolling(true);
    setMessage("");
    playSound("chip");

    // Animate dice
    let ticks = 0;
    const iv = setInterval(() => {
      setDie1(rollDie());
      setDie2(rollDie());
      ticks++;
      if (ticks >= 12) {
        clearInterval(iv);
        const d1 = rollDie(), d2 = rollDie();
        setDie1(d1); setDie2(d2);
        const total = d1 + d2;
        handleResult(total);
        setRolling(false);
      }
    }, 80);
  }, [rolling, phase, stagedBet, wallet, point, betType]);

  const handleResult = (total: number) => {
    if (phase === "betting" || phase === "result") {
      // Come-out roll
      if (betType === "pass") {
        if (total === 7 || total === 11) {
          win(total, `Natural ${total}! You win!`);
        } else if (total === 2 || total === 3 || total === 12) {
          lose(total, `Craps ${total}! You lose.`);
        } else {
          setPoint(total);
          setPhase("point");
          setMessage(`Point is ${total}. Roll again!`);
          setResultType("neutral");
          setHistory(h => [...h, { total, outcome: `Point: ${total}` }]);
        }
      } else if (betType === "dontpass") {
        if (total === 2 || total === 3) {
          win(total, `Craps ${total}! Don't Pass wins!`);
        } else if (total === 7 || total === 11) {
          lose(total, `Natural ${total}! Don't Pass loses.`);
        } else if (total === 12) {
          push(total, `12 is a push.`);
        } else {
          setPoint(total);
          setPhase("point");
          setMessage(`Point is ${total}. Roll again!`);
          setResultType("neutral");
          setHistory(h => [...h, { total, outcome: `Point: ${total}` }]);
        }
      } else if (betType === "field") {
        if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
          const mult = total === 2 ? 3 : total === 12 ? 3 : 2;
          winField(total, mult);
        } else {
          lose(total, `Field loses on ${total}.`);
        }
      }
    } else if (phase === "point") {
      // Point phase
      if (betType === "pass") {
        if (total === point) {
          win(total, `Hit the point ${total}! You win!`);
        } else if (total === 7) {
          lose(total, `Seven out! You lose.`);
        } else {
          setMessage(`Rolled ${total}. Point is still ${point}. Roll again!`);
          setResultType("neutral");
          setHistory(h => [...h, { total, outcome: `Roll: ${total}` }]);
        }
      } else if (betType === "dontpass") {
        if (total === 7) {
          win(total, `Seven! Don't Pass wins!`);
        } else if (total === point) {
          lose(total, `Hit point ${total}. Don't Pass loses.`);
        } else {
          setMessage(`Rolled ${total}. Point is still ${point}. Roll again!`);
          setResultType("neutral");
          setHistory(h => [...h, { total, outcome: `Roll: ${total}` }]);
        }
      }
    }
  };

  const win = async (total: number, msg: string) => {
    const winAmt = betType === "field" ? stagedBet * 2 : stagedBet * 2;
    setMessage(msg + ` +$${stagedBet}`);
    setResultType("win"); playSound("win");
    triggerConfetti({ intensity: "medium" });
    incrementWinStreak(); incrementSessionWins();
    recordBet("craps", stagedBet, "win");
    setHistory(h => [...h, { total, outcome: "WIN" }]);
    setPhase("result"); setPoint(null);
    try { await addWinnings(winAmt, "Craps"); } catch {}
  };

  const winField = async (total: number, mult: number) => {
    const winAmt = stagedBet * mult;
    setMessage(`Field ${total}! +$${winAmt - stagedBet} (${mult - 1}:1)`);
    setResultType("win"); playSound("win");
    triggerConfetti({ intensity: mult >= 3 ? "high" : "medium" });
    incrementWinStreak(); incrementSessionWins();
    recordBet("craps", stagedBet, "win");
    setHistory(h => [...h, { total, outcome: "WIN" }]);
    setPhase("result"); setPoint(null);
    try { await addWinnings(winAmt, "Craps"); } catch {}
  };

  const lose = (total: number, msg: string) => {
    setMessage(msg + ` -$${stagedBet}`);
    setResultType("lose"); playSound("lose");
    resetWinStreak(); recordBet("craps", stagedBet, "loss");
    setHistory(h => [...h, { total, outcome: "LOSE" }]);
    setPhase("result"); setPoint(null);
  };

  const push = async (total: number, msg: string) => {
    setMessage(msg);
    setResultType("neutral");
    setHistory(h => [...h, { total, outcome: "PUSH" }]);
    setPhase("result"); setPoint(null);
    try { await addWinnings(stagedBet, "Craps"); } catch {}
  };

  const newRound = () => {
    setPhase("betting"); setMessage(""); setStagedBet(0);
    setDie1(0); setDie2(0); setPoint(null);
  };

  const availBet = (wallet ?? 0) - stagedBet;

  return (
    <div className="craps-page">
      <button className="home-btn" onClick={() => navigate("/")}>🏠 HOME</button>

      <style>{`
        .craps-page {
          height: 100vh; height: 100dvh;
          display: flex; flex-direction: column;
          max-width: 1250px; margin: 0 auto;
          padding: clamp(10px,2vh,18px) 20px;
          overflow: hidden; position: relative;
        }
        .craps-page .home-btn { position: fixed; top: 20px; left: 20px; z-index: 50; }

        .craps-top { flex-shrink: 0; text-align: center; }
        .craps-top h1 { font-family: 'Press Start 2P'; font-size: clamp(1rem,3.5vw,2rem); color: var(--retro-yellow); text-shadow: 3px 3px 0 var(--retro-magenta); margin: 0; }

        .craps-stats {
          display: flex; justify-content: center; gap: clamp(6px,1.5vw,16px);
          margin: clamp(4px,1vh,10px) 0; flex-shrink: 0;
        }
        .craps-stat { background: var(--bg-secondary); border: 3px solid var(--retro-cyan); padding: 5px 14px; box-shadow: 4px 4px 0 rgba(0,0,0,0.5); text-align: center; }
        .craps-stat-lbl { font-family: 'Press Start 2P'; font-size: clamp(0.25rem,0.7vw,0.35rem); color: var(--text-secondary); display: block; }
        .craps-stat-val { font-family: 'Press Start 2P'; font-size: clamp(0.65rem,1.8vw,1rem); color: var(--retro-green); }

        .craps-table {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: clamp(8px,2vh,18px); min-height: 0;
        }

        .craps-dice {
          display: flex; gap: clamp(10px,3vw,24px); align-items: center;
        }
        .craps-die {
          font-size: clamp(3rem,10vw,6rem);
          filter: drop-shadow(4px 4px 0 rgba(0,0,0,0.6));
          transition: transform 0.1s;
        }
        .craps-die.roll-anim { animation: diceShake 0.1s ease-in-out infinite; }
        @keyframes diceShake {
          0% { transform: rotate(-8deg) scale(1.05); }
          50% { transform: rotate(8deg) scale(0.95); }
          100% { transform: rotate(-8deg) scale(1.05); }
        }
        .craps-total {
          font-family: 'Press Start 2P'; font-size: clamp(1.2rem,4vw,2.2rem);
          color: var(--retro-yellow); text-shadow: 3px 3px 0 #000;
        }

        .craps-point-badge {
          font-family: 'Press Start 2P'; font-size: clamp(0.5rem,1.4vw,0.8rem);
          color: var(--retro-cyan); border: 3px solid var(--retro-cyan);
          padding: 6px 14px; background: rgba(0,255,247,0.08);
          box-shadow: 4px 4px 0 rgba(0,255,247,0.2);
        }

        .craps-msg {
          font-family: 'Press Start 2P'; font-size: clamp(0.45rem,1.2vw,0.7rem);
          padding: 6px 16px; border: 3px solid; box-shadow: 4px 4px 0 rgba(0,0,0,0.4);
          background: rgba(10,16,32,0.85);
        }
        .craps-msg.win { color: var(--retro-green); border-color: var(--retro-green); }
        .craps-msg.lose { color: var(--retro-red); border-color: var(--retro-red); }
        .craps-msg.neutral { color: var(--retro-yellow); border-color: var(--retro-yellow); }

        /* Bet type selector */
        .craps-bet-types { display: flex; gap: clamp(6px,1.5vw,12px); }
        .craps-btbtn {
          padding: clamp(6px,1vh,10px) clamp(10px,2vw,18px);
          font-family: 'Press Start 2P'; font-size: clamp(0.3rem,0.9vw,0.45rem);
          background: var(--bg-secondary); border: 3px solid; cursor: pointer;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.5); transition: transform 0.1s;
          display: flex; flex-direction: column; align-items: center; gap: 2px;
        }
        .craps-btbtn:hover { transform: translate(-2px,-2px); }
        .craps-btbtn.pass { border-color: var(--retro-green); color: var(--retro-green); }
        .craps-btbtn.pass.on { background: var(--retro-green); color: black; }
        .craps-btbtn.dontpass { border-color: var(--retro-red); color: var(--retro-red); }
        .craps-btbtn.dontpass.on { background: var(--retro-red); color: white; }
        .craps-btbtn.field { border-color: var(--retro-purple); color: var(--retro-purple); }
        .craps-btbtn.field.on { background: var(--retro-purple); color: white; }
        .craps-btodds { font-family: 'VT323'; font-size: clamp(0.5rem,1.2vw,0.7rem); opacity: 0.8; }

        /* Chips & controls */
        .craps-controls {
          flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
          gap: clamp(5px,1vh,10px); padding: clamp(6px,1.2vh,12px) 0;
        }
        .craps-chips { display: flex; gap: clamp(4px,0.8vw,8px); flex-wrap: wrap; justify-content: center; }
        .cc {
          width: clamp(36px,6vw,52px); height: clamp(36px,6vw,52px);
          border-radius: 50%; border: 3px dashed rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Press Start 2P'; font-size: clamp(0.25rem,0.75vw,0.4rem);
          color: white; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,0.5);
          transition: transform 0.1s; user-select: none; text-shadow: 1px 1px 0 #000;
        }
        .cc:hover { transform: translateY(-3px); }
        .cc.off { filter: grayscale(1) brightness(0.5); pointer-events: none; }
        .cc.v1 { background: #666; } .cc.v5 { background: var(--retro-blue); }
        .cc.v10 { background: var(--retro-green); } .cc.v25 { background: var(--retro-red); }
        .cc.v100 { background: var(--retro-purple); } .cc.v500 { background: #cc6600; }
        .cc.vmax { background: var(--retro-yellow); color: black; text-shadow: none; }

        .craps-bet-row { display: flex; align-items: center; gap: 10px; }
        .craps-bet-amt { font-family: 'Press Start 2P'; font-size: clamp(0.75rem,2vw,1.1rem); color: var(--retro-yellow); text-shadow: 2px 2px 0 #000; }
        .craps-btn {
          font-family: 'Press Start 2P'; border: 3px solid; background: var(--bg-secondary);
          cursor: pointer; box-shadow: 4px 4px 0 rgba(0,0,0,0.5); transition: transform 0.1s;
          padding: clamp(5px,0.9vh,8px) clamp(10px,1.8vw,16px); font-size: clamp(0.35rem,0.9vw,0.5rem);
        }
        .craps-btn.clr { border-color: #888; color: #aaa; }
        .craps-btn.roll { border-color: var(--retro-green); color: var(--retro-green); padding: 8px 24px; font-size: clamp(0.45rem,1.2vw,0.65rem); }
        .craps-btn.roll:hover:not(:disabled) { background: var(--retro-green); color: black; }
        .craps-btn.next { border-color: var(--retro-cyan); color: var(--retro-cyan); }
        .craps-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .craps-hist { display: flex; gap: 3px; justify-content: center; flex-wrap: wrap; flex-shrink: 0; padding: 2px 0; }
        .craps-hitem {
          font-family: 'VT323'; font-size: clamp(0.6rem,1.2vw,0.8rem);
          padding: 1px 6px; border: 1px solid rgba(255,255,255,0.2);
          background: rgba(0,0,0,0.3);
        }
        .craps-hitem.hw { color: var(--retro-green); }
        .craps-hitem.hl { color: var(--retro-red); }
        .craps-hitem.hn { color: var(--text-secondary); }
      `}</style>

      <div className="craps-top"><h1>🎲 CRAPS 🎲</h1></div>

      <div className="craps-stats">
        <div className="craps-stat"><span className="craps-stat-lbl">Wallet</span><span className="craps-stat-val">${(wallet ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        {stagedBet > 0 && <div className="craps-stat"><span className="craps-stat-lbl">Bet</span><span className="craps-stat-val">${stagedBet}</span></div>}
        {point !== null && <div className="craps-stat"><span className="craps-stat-lbl">Point</span><span className="craps-stat-val" style={{ color: 'var(--retro-cyan)' }}>{point}</span></div>}
      </div>

      <div className="craps-table">
        <div className="craps-dice">
          {die1 > 0 && <span className={`craps-die ${rolling ? "roll-anim" : ""}`}>{DIE_FACES[die1]}</span>}
          {die2 > 0 && <span className={`craps-die ${rolling ? "roll-anim" : ""}`}>{DIE_FACES[die2]}</span>}
        </div>
        {die1 > 0 && die2 > 0 && !rolling && <div className="craps-total">{die1 + die2}</div>}
        {point !== null && phase === "point" && <div className="craps-point-badge">POINT: {point}</div>}
        {message && <div className={`craps-msg ${resultType}`}>{message}</div>}
      </div>

      {phase === "betting" && (
        <div className="craps-controls">
          <div className="craps-bet-types">
            <button className={`craps-btbtn pass ${betType === "pass" ? "on" : ""}`} onClick={() => setBetType("pass")}>
              <span>PASS</span><span className="craps-btodds">1:1</span>
            </button>
            <button className={`craps-btbtn dontpass ${betType === "dontpass" ? "on" : ""}`} onClick={() => setBetType("dontpass")}>
              <span>DON'T PASS</span><span className="craps-btodds">1:1</span>
            </button>
            <button className={`craps-btbtn field ${betType === "field" ? "on" : ""}`} onClick={() => setBetType("field")}>
              <span>FIELD</span><span className="craps-btodds">1:1 / 2:1</span>
            </button>
          </div>
          <div className="craps-chips">
            {CHIP_VALUES.map(v => (
              <div key={v} className={`cc v${v} ${availBet < v ? "off" : ""}`} onClick={() => addChip(v)}>${v}</div>
            ))}
            <div className={`cc vmax ${availBet <= 0 ? "off" : ""}`} onClick={() => { if (phase === "betting") setStagedBet(wallet ?? 0); }}>ALL</div>
          </div>
          <div className="craps-bet-row">
            <span className="craps-bet-amt">${stagedBet}</span>
            <button className="craps-btn clr" onClick={clearBet}>CLEAR</button>
            <button className="craps-btn roll" onClick={roll} disabled={stagedBet <= 0 || rolling}>ROLL</button>
          </div>
        </div>
      )}

      {phase === "point" && (
        <div className="craps-controls">
          <button className="craps-btn roll" onClick={roll} disabled={rolling}>
            {rolling ? "ROLLING…" : "ROLL AGAIN"}
          </button>
        </div>
      )}

      {phase === "result" && (
        <div className="craps-controls">
          <button className="craps-btn next" onClick={newRound}>NEW ROUND</button>
        </div>
      )}

      {history.length > 0 && (
        <div className="craps-hist">
          {history.slice(-15).map((h, i) => (
            <span key={i} className={`craps-hitem ${h.outcome === "WIN" ? "hw" : h.outcome === "LOSE" ? "hl" : "hn"}`}>
              {h.total} {h.outcome === "WIN" ? "✓" : h.outcome === "LOSE" ? "✗" : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
