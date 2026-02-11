import { useState } from "react";
import { useSessionStats } from "../hooks/useSessionStats";

export default function SessionStatsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    stats,
    totalWagered,
    totalWon,
    totalLost,
    netProfit,
    gamesPlayed,
    biggestWin,
  } = useSessionStats();

  const totalGames =
    gamesPlayed.higherLower + gamesPlayed.blackjack + gamesPlayed.baccarat;

  if (totalGames === 0) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background:
            netProfit >= 0 ? "rgba(0, 255, 0, 0.2)" : "rgba(255, 0, 0, 0.2)",
          border: `3px solid ${netProfit >= 0 ? "var(--retro-green)" : "var(--retro-red)"}`,
          color: netProfit >= 0 ? "var(--retro-green)" : "var(--retro-red)",
          padding: "10px 20px",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "0.5rem",
          cursor: "pointer",
          width: "100%",
          textAlign: "center",
        }}
      >
        📊 Session: {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(0)}
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "var(--bg-secondary)",
        border: "3px solid var(--retro-cyan)",
        padding: "20px",
        zIndex: 100,
        maxWidth: "350px",
        boxShadow: "4px 4px 0px var(--retro-magenta)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <span
          style={{
            fontFamily: "'Press Start 2P', cursive",
            fontSize: "0.7rem",
            color: "var(--retro-cyan)",
          }}
        >
          📊 This Session
        </span>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--retro-red)",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          ✕
        </button>
      </div>

      {/* Summary Stats */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          padding: "15px",
          marginBottom: "15px",
          borderLeft: `4px solid ${netProfit >= 0 ? "var(--retro-green)" : "var(--retro-red)"}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontFamily: "'VT323', monospace", fontSize: "1rem" }}>
            Total Wagered:
          </span>
          <span
            style={{
              fontFamily: "'Press Start 2P', cursive",
              fontSize: "0.6rem",
            }}
          >
            ${totalWagered.toFixed(0)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontFamily: "'VT323', monospace", fontSize: "1rem" }}>
            Total Won:
          </span>
          <span
            style={{
              fontFamily: "'Press Start 2P', cursive",
              fontSize: "0.6rem",
              color: "var(--retro-green)",
            }}
          >
            +${totalWon.toFixed(0)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontFamily: "'VT323', monospace", fontSize: "1rem" }}>
            Total Lost:
          </span>
          <span
            style={{
              fontFamily: "'Press Start 2P', cursive",
              fontSize: "0.6rem",
              color: "var(--retro-red)",
            }}
          >
            -${totalLost.toFixed(0)}
          </span>
        </div>
        <div
          style={{
            borderTop: "1px dashed var(--retro-cyan)",
            paddingTop: "8px",
            marginTop: "8px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{ fontFamily: "'VT323', monospace", fontSize: "1.1rem" }}
          >
            Net Profit:
          </span>
          <span
            style={{
              fontFamily: "'Press Start 2P', cursive",
              fontSize: "0.7rem",
              color: netProfit >= 0 ? "var(--retro-green)" : "var(--retro-red)",
            }}
          >
            {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Per-Game Breakdown */}
      <div style={{ marginBottom: "15px" }}>
        <div
          style={{
            fontFamily: "'Press Start 2P', cursive",
            fontSize: "0.5rem",
            color: "var(--text-secondary)",
            marginBottom: "10px",
          }}
        >
          BY GAME
        </div>
        {Object.entries(stats).map(([game, data]) => {
          const gameNet = data.won - data.lost;
          const gameName =
            game === "higherLower"
              ? "Higher/Lower"
              : game === "blackjack"
                ? "Blackjack"
                : "Baccarat";
          const gamesCount = gamesPlayed[game as keyof typeof gamesPlayed];

          if (gamesCount === 0) return null;

          return (
            <div
              key={game}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span
                style={{ fontFamily: "'VT323', monospace", fontSize: "1rem" }}
              >
                {gameName} ({gamesCount})
              </span>
              <span
                style={{
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.5rem",
                  color:
                    gameNet >= 0 ? "var(--retro-green)" : "var(--retro-red)",
                }}
              >
                {gameNet >= 0 ? "+" : ""}${gameNet.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Biggest Win */}
      {biggestWin > 0 && (
        <div
          style={{
            background: "rgba(255, 215, 0, 0.1)",
            padding: "10px",
            border: "1px solid var(--retro-yellow)",
            textAlign: "center",
          }}
        >
          <span
            style={{ fontFamily: "'VT323', monospace", fontSize: "0.9rem" }}
          >
            Biggest Win:{" "}
          </span>
          <span
            style={{
              fontFamily: "'Press Start 2P', cursive",
              fontSize: "0.7rem",
              color: "var(--retro-yellow)",
            }}
          >
            ${biggestWin.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  );
}
