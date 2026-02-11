import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useSound } from "../hooks/useSound";
import { useConfetti } from "../hooks/useConfetti";
import { useAchievements } from "../hooks/useAchievements";
import { useSessionStats } from "../hooks/useSessionStats";

type BetKind =
  | "red"
  | "black"
  | "green"
  | "odd"
  | "even"
  | "1-18"
  | "19-36"
  | "1st12"
  | "2nd12"
  | "3rd12"
  | "number";
interface PlacedBet {
  kind: BetKind;
  amount: number;
  number?: number;
}

const CHIP_VALUES = [1, 5, 10, 25, 100, 500];

const NUMBERS: { n: number; color: "red" | "black" | "green" }[] = [
  { n: 0, color: "green" },
  { n: 1, color: "red" },
  { n: 2, color: "black" },
  { n: 3, color: "red" },
  { n: 4, color: "black" },
  { n: 5, color: "red" },
  { n: 6, color: "black" },
  { n: 7, color: "red" },
  { n: 8, color: "black" },
  { n: 9, color: "red" },
  { n: 10, color: "black" },
  { n: 11, color: "black" },
  { n: 12, color: "red" },
  { n: 13, color: "black" },
  { n: 14, color: "red" },
  { n: 15, color: "black" },
  { n: 16, color: "red" },
  { n: 17, color: "black" },
  { n: 18, color: "red" },
  { n: 19, color: "red" },
  { n: 20, color: "black" },
  { n: 21, color: "red" },
  { n: 22, color: "black" },
  { n: 23, color: "red" },
  { n: 24, color: "black" },
  { n: 25, color: "red" },
  { n: 26, color: "black" },
  { n: 27, color: "red" },
  { n: 28, color: "black" },
  { n: 29, color: "black" },
  { n: 30, color: "red" },
  { n: 31, color: "black" },
  { n: 32, color: "red" },
  { n: 33, color: "black" },
  { n: 34, color: "red" },
  { n: 35, color: "black" },
  { n: 36, color: "red" },
];

function getColor(n: number): "red" | "black" | "green" {
  return NUMBERS.find((x) => x.n === n)?.color ?? "green";
}

function evaluateBet(bet: PlacedBet, result: number): number {
  const color = getColor(result);
  switch (bet.kind) {
    case "red":
      return color === "red" ? bet.amount * 2 : 0;
    case "black":
      return color === "black" ? bet.amount * 2 : 0;
    case "green":
      return result === 0 ? bet.amount * 36 : 0;
    case "odd":
      return result > 0 && result % 2 === 1 ? bet.amount * 2 : 0;
    case "even":
      return result > 0 && result % 2 === 0 ? bet.amount * 2 : 0;
    case "1-18":
      return result >= 1 && result <= 18 ? bet.amount * 2 : 0;
    case "19-36":
      return result >= 19 && result <= 36 ? bet.amount * 2 : 0;
    case "1st12":
      return result >= 1 && result <= 12 ? bet.amount * 3 : 0;
    case "2nd12":
      return result >= 13 && result <= 24 ? bet.amount * 3 : 0;
    case "3rd12":
      return result >= 25 && result <= 36 ? bet.amount * 3 : 0;
    case "number":
      return bet.number === result ? bet.amount * 36 : 0;
    default:
      return 0;
  }
}

export default function Roulette() {
  const navigate = useNavigate();
  const { wallet, placeBet: placeBetMutation, addWinnings } = useWallet();
  const { playSound } = useSound();
  const { triggerConfetti } = useConfetti();
  const {
    unlockAchievement,
    incrementWinStreak,
    resetWinStreak,
    incrementSessionWins,
  } = useAchievements();
  const { recordBet } = useSessionStats();

  const [selectedChip, setSelectedChip] = useState(5);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [resultType, setResultType] = useState<"win" | "lose" | "neutral">(
    "neutral",
  );
  const [history, setHistory] = useState<number[]>([]);
  const [animNumber, setAnimNumber] = useState<number | null>(null);

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);
  const availBet = (wallet ?? 0) - totalBet;

  const addBet = (kind: BetKind, number?: number) => {
    if (spinning) return;
    if (selectedChip > availBet) return;
    const existing = bets.findIndex(
      (b) => b.kind === kind && b.number === number,
    );
    if (existing >= 0) {
      setBets((prev) =>
        prev.map((b, i) =>
          i === existing ? { ...b, amount: b.amount + selectedChip } : b,
        ),
      );
    } else {
      setBets((prev) => [...prev, { kind, amount: selectedChip, number }]);
    }
  };

  const clearBets = () => {
    if (!spinning) {
      setBets([]);
      setMessage("");
    }
  };

  const spinWheel = useCallback(async () => {
    if (spinning || bets.length === 0) return;

    try {
      await placeBetMutation(totalBet, "Roulette");
    } catch {
      setMessage("Failed to place bet");
      return;
    }

    setSpinning(true);
    setMessage("");
    setResult(null);
    playSound("chip");

    const finalResult = Math.floor(Math.random() * 37);

    // Animate spinning numbers
    let count = 0;
    const maxTicks = 30;
    const iv = setInterval(
      () => {
        setAnimNumber(Math.floor(Math.random() * 37));
        count++;
        if (count >= maxTicks) {
          clearInterval(iv);
          setAnimNumber(finalResult);
          setResult(finalResult);
          setHistory((prev) => [...prev, finalResult]);

          // Evaluate all bets
          let totalWin = 0;
          for (const bet of bets) totalWin += evaluateBet(bet, finalResult);

          const color = getColor(finalResult);
          const colorEmoji =
            color === "red" ? "🔴" : color === "black" ? "⚫" : "🟢";

          if (totalWin > 0) {
            const profit = totalWin - totalBet;
            setMessage(
              `${colorEmoji} ${finalResult}! Won $${totalWin.toFixed(2)} (+$${profit.toFixed(2)})`,
            );
            setResultType("win");
            playSound("win");
            triggerConfetti({
              intensity: totalWin >= totalBet * 10 ? "high" : "medium",
            });
            incrementWinStreak();
            incrementSessionWins();
            recordBet("roulette", totalBet, "win");
            if (finalResult === 0) unlockAchievement("green_zero");
            addWinnings(totalWin, "Roulette").catch(() => {});
          } else {
            setMessage(`${colorEmoji} ${finalResult}. Lost $${totalBet}`);
            setResultType("lose");
            playSound("lose");
            resetWinStreak();
            recordBet("roulette", totalBet, "loss");
          }

          setSpinning(false);
          setBets([]);
        }
      },
      60 + count * 3,
    );
  }, [spinning, bets, totalBet, wallet]);

  const boardRows = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  return (
    <div className="rou-page">
      <button className="home-btn" onClick={() => navigate("/")}>
        🏠 HOME
      </button>

      <style>{`
        .rou-page {
          height: 100vh; height: 100dvh;
          display: flex; flex-direction: column;
          max-width: 1250px; margin: 0 auto;
          padding: clamp(8px,1.5vh,16px) 16px;
          overflow: hidden; position: relative;
        }
        .rou-page .home-btn { position: fixed; top: 20px; left: 20px; z-index: 50; }

        .rou-top { flex-shrink: 0; text-align: center; }
        .rou-top h1 {
          font-family: 'Press Start 2P', cursive; font-size: clamp(1rem,3.5vw,2rem);
          color: var(--retro-yellow); text-shadow: 3px 3px 0 var(--retro-magenta); margin: 0;
        }

        .rou-stats {
          display: flex; justify-content: center; gap: clamp(6px,1.5vw,16px);
          margin: clamp(4px,0.8vh,8px) 0; flex-shrink: 0;
        }
        .rou-stat { background: var(--bg-secondary); border: 3px solid var(--retro-cyan); padding: 8px 18px; box-shadow: 4px 4px 0 rgba(0,0,0,0.5); text-align: center; }
        .rou-stat-lbl { font-family: 'Press Start 2P'; font-size: clamp(0.5rem,1.2vw,0.65rem); color: var(--text-secondary); display: block; }
        .rou-stat-val { font-family: 'Press Start 2P'; font-size: clamp(1rem,2.5vw,1.4rem); color: var(--retro-green); }

        /* Spinning result */
        .rou-result {
          text-align: center; margin: clamp(4px,1vh,10px) 0; flex-shrink: 0;
        }
        .rou-number {
          display: inline-block; font-family: 'Press Start 2P';
          font-size: clamp(1.8rem,6vw,3.5rem); padding: 8px 20px;
          border: 4px solid; box-shadow: 6px 6px 0 rgba(0,0,0,0.5);
          min-width: 80px; text-align: center;
        }
        .rou-number.rn-red { color: var(--retro-red); border-color: var(--retro-red); background: rgba(255,0,68,0.12); }
        .rou-number.rn-black { color: white; border-color: white; background: rgba(0,0,0,0.5); }
        .rou-number.rn-green { color: var(--retro-green); border-color: var(--retro-green); background: rgba(0,255,0,0.12); }
        .rou-spinning { animation: spinPulse 0.2s ease-in-out infinite alternate; }
        @keyframes spinPulse { 0% { transform:scale(1); } 100% { transform:scale(1.08); } }

        .rou-msg {
          font-family: 'Press Start 2P'; font-size: clamp(0.65rem,1.6vw,0.9rem);
          margin-top: 8px; text-align: center;
        }
        .rou-msg.win { color: var(--retro-green); }
        .rou-msg.lose { color: var(--retro-red); }

        /* Board */
        .rou-board-wrap {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          min-height: 0; overflow-x: auto; overflow-y: hidden;
        }
        .rou-board {
          display: flex; flex-direction: column; gap: 1px;
          background: rgba(0,0,0,0.4); border: 3px solid var(--retro-cyan);
          padding: 2px; box-shadow: 6px 6px 0 rgba(0,255,247,0.1);
        }
        .rou-zero-row { display: flex; }
        .rou-zero {
          width: 100%; padding: clamp(8px,1.2vh,14px);
          background: #006600; border: 2px solid #00cc00;
          font-family: 'Press Start 2P'; font-size: clamp(0.55rem,1.3vw,0.78rem);
          color: #00ff00; text-align: center; cursor: pointer;
          transition: filter 0.1s;
        }
        .rou-zero:hover { filter: brightness(1.3); }
        .rou-row { display: flex; gap: 1px; }
        .rou-cell {
          width: clamp(32px,5.5vw,52px); height: clamp(30px,4.5vh,44px);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Press Start 2P'; font-size: clamp(0.4rem,1vw,0.6rem);
          cursor: pointer; border: 1px solid rgba(255,255,255,0.15);
          transition: filter 0.1s, transform 0.1s; color: white;
        }
        .rou-cell:hover { filter: brightness(1.4); transform: scale(1.1); z-index: 2; }
        .rou-cell.rc-red { background: #cc0033; }
        .rou-cell.rc-black { background: #222; }
        .rou-cell.rc-hit { box-shadow: 0 0 8px rgba(255,255,0,0.8); border-color: var(--retro-yellow); }

        .rou-outside { display: flex; gap: 1px; margin-top: 1px; flex-wrap: wrap; justify-content: center; }
        .rou-obtn {
          padding: clamp(6px,1vh,12px) clamp(10px,1.8vw,18px);
          font-family: 'Press Start 2P'; font-size: clamp(0.42rem,1vw,0.6rem);
          cursor: pointer; border: 2px solid; background: var(--bg-secondary);
          transition: transform 0.1s; box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
          color: white;
        }
        .rou-obtn:hover { transform: translate(-1px,-1px); }
        .rou-obtn.ob-red { border-color: var(--retro-red); color: var(--retro-red); }
        .rou-obtn.ob-black { border-color: #888; }
        .rou-obtn.ob-green { border-color: var(--retro-green); color: var(--retro-green); }

        /* History */
        .rou-hist { display: flex; gap: 2px; justify-content: center; flex-wrap: wrap; flex-shrink: 0; padding: 3px 0; }
        .rou-hdot {
          width: clamp(22px,3.2vw,30px); height: clamp(22px,3.2vw,30px);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-family: 'Press Start 2P'; font-size: clamp(0.32rem,0.8vw,0.42rem); color: white;
          text-shadow: 1px 1px 0 #000;
        }
        .rou-hdot.h-red { background: #cc0033; }
        .rou-hdot.h-black { background: #333; border: 1px solid #666; }
        .rou-hdot.h-green { background: #006600; }

        /* Chips & controls */
        .rou-controls {
          flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
          gap: clamp(4px,0.8vh,8px); padding: clamp(6px,1vh,10px) 0;
        }
        .rou-chips { display: flex; gap: clamp(8px,1.6vw,16px); flex-wrap: wrap; justify-content: center; }
        .rc {
          width: clamp(44px,7vw,76px); height: clamp(44px,7vw,76px);
          border-radius: 50%; border: 4px dashed rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Press Start 2P'; font-size: clamp(0.45rem,1.4vw,0.6rem);
          color: white; cursor: pointer; box-shadow: 0 6px 0 rgba(0,0,0,0.5);
          transition: transform 0.1s; user-select: none; text-shadow: 1px 1px 0 #000;
          position: relative;
        }
        .rc::before { content:''; position:absolute; top:5px;left:5px;right:5px;bottom:5px; border-radius:50%; border:2px solid rgba(255,255,255,0.2); }
        .rc:hover { transform: translateY(-5px); }
        .rc:active { transform: translateY(0); box-shadow: 0 2px 0 rgba(0,0,0,0.5); }
        .rc.sel { box-shadow: 0 0 10px rgba(255,255,0,0.7); transform: translateY(-4px) scale(1.1); }
        .rc.v1 { background: #666; border-color: #999; } .rc.v5 { background: var(--retro-blue); border-color: #88ccff; }
        .rc.v10 { background: var(--retro-green); border-color: #88ff88; } .rc.v25 { background: var(--retro-red); border-color: #ff8888; }
        .rc.v100 { background: var(--retro-purple); border-color: #dcb3ff; } .rc.v500 { background: #cc6600; border-color: #ff9933; }

        .rou-action-row { display: flex; gap: 8px; align-items: center; }
        .rou-btn {
          font-family: 'Press Start 2P'; border: 3px solid; background: var(--bg-secondary);
          cursor: pointer; box-shadow: 4px 4px 0 rgba(0,0,0,0.5); transition: transform 0.1s;
          padding: clamp(10px,1.4vh,16px) clamp(18px,3vw,32px); font-size: clamp(0.6rem,1.4vw,0.85rem);
        }
        .rou-btn.spin { border-color: var(--retro-green); color: var(--retro-green); }
        .rou-btn.spin:hover:not(:disabled) { background: var(--retro-green); color: black; }
        .rou-btn.clr { border-color: #888; color: #aaa; }
        .rou-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 600px) {
          .rou-board { transform: scale(0.85); transform-origin: center; }
        }
      `}</style>

      <div className="rou-top">
        <h1>ROULETTE</h1>
      </div>

      <div className="rou-stats">
        <div className="rou-stat">
          <span className="rou-stat-lbl">Wallet</span>
          <span className="rou-stat-val">
            $
            {(wallet ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="rou-stat">
          <span className="rou-stat-lbl">Chip</span>
          <span className="rou-stat-val">${selectedChip}</span>
        </div>
        {totalBet > 0 && (
          <div className="rou-stat">
            <span className="rou-stat-lbl">Total Bet</span>
            <span className="rou-stat-val">${totalBet}</span>
          </div>
        )}
      </div>

      <div className="rou-result">
        {(spinning || result !== null) && (
          <div
            className={`rou-number rn-${getColor(animNumber ?? result ?? 0)} ${spinning ? "rou-spinning" : ""}`}
          >
            {animNumber ?? result ?? "—"}
          </div>
        )}
        {message && <div className={`rou-msg ${resultType}`}>{message}</div>}
      </div>

      <div className="rou-board-wrap">
        <div className="rou-board">
          <div className="rou-zero-row">
            <div className="rou-zero" onClick={() => addBet("number", 0)}>
              0
            </div>
          </div>
          {boardRows.map((row, ri) => (
            <div className="rou-row" key={ri}>
              {row.map((n) => (
                <div
                  key={n}
                  className={`rou-cell rc-${getColor(n)} ${result === n ? "rc-hit" : ""}`}
                  onClick={() => addBet("number", n)}
                >
                  {n}
                </div>
              ))}
            </div>
          ))}
          <div className="rou-outside">
            <div className="rou-obtn ob-red" onClick={() => addBet("red")}>
              RED
            </div>
            <div className="rou-obtn ob-black" onClick={() => addBet("black")}>
              BLK
            </div>
            <div className="rou-obtn ob-green" onClick={() => addBet("green")}>
              0
            </div>
            <div className="rou-obtn" onClick={() => addBet("odd")}>
              ODD
            </div>
            <div className="rou-obtn" onClick={() => addBet("even")}>
              EVEN
            </div>
            <div className="rou-obtn" onClick={() => addBet("1-18")}>
              1-18
            </div>
            <div className="rou-obtn" onClick={() => addBet("19-36")}>
              19-36
            </div>
            <div className="rou-obtn" onClick={() => addBet("1st12")}>
              1st12
            </div>
            <div className="rou-obtn" onClick={() => addBet("2nd12")}>
              2nd12
            </div>
            <div className="rou-obtn" onClick={() => addBet("3rd12")}>
              3rd12
            </div>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="rou-hist">
          {history.slice(-20).map((n, i) => (
            <div key={i} className={`rou-hdot h-${getColor(n)}`}>
              {n}
            </div>
          ))}
        </div>
      )}

      <div className="rou-controls">
        <div className="rou-chips">
          {CHIP_VALUES.map((v) => (
            <div
              key={v}
              className={`rc v${v} ${selectedChip === v ? "sel" : ""}`}
              onClick={() => setSelectedChip(v)}
            >
              ${v}
            </div>
          ))}
        </div>
        <div className="rou-action-row">
          <button
            className="rou-btn clr"
            onClick={clearBets}
            disabled={spinning}
          >
            CLEAR
          </button>
          <button
            className="rou-btn spin"
            onClick={spinWheel}
            disabled={spinning || bets.length === 0}
          >
            {spinning ? "SPINNING…" : "SPIN"}
          </button>
        </div>
      </div>
    </div>
  );
}
