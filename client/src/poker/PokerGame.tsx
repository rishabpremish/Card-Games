import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { PokerGameState, PokerPlayer, PokerCard } from "./usePoker";

// ─── Helpers ─────────────────────────────────────────────

function suitSymbol(s: string) {
  const m: Record<string, string> = { "♠": "♠", "♥": "♥", "♦": "♦", "♣": "♣" };
  return m[s] ?? s;
}

function suitColor(s: string) {
  return s === "♥" || s === "♦" ? "red" : "black";
}

function formatAction(entry: {
  type: string;
  player?: string;
  amount?: number;
  hand?: string;
  street?: string;
}) {
  switch (entry.type) {
    case "blind":
      return `${entry.player} posts $${entry.amount}`;
    case "fold":
      return `${entry.player} folds`;
    case "check":
      return `${entry.player} checks`;
    case "call":
      return `${entry.player} calls $${entry.amount}`;
    case "raise":
      return `${entry.player} raises to $${entry.amount}`;
    case "allin":
      return `${entry.player} ALL-IN $${entry.amount}`;
    case "win":
      return `${entry.player} wins $${entry.amount}${entry.hand ? ` (${entry.hand})` : ""}`;
    case "rake":
      return `House rake: $${entry.amount ?? 0}`;
    case "street":
      return `── ${entry.street} ──`;
    case "timeout":
      return `${entry.player} timed out (auto-fold)`;
    case "insurance":
      return `${entry.player} insurance payout $${entry.amount}`;
    case "run_it_twice_fee":
      return `Run It Twice fee: $${entry.amount}`;
    case "run_it_twice_board":
      return `Run It Twice board ${entry.amount}`;
    default:
      return "";
  }
}

// Seat positions around an oval table (0=bottom-center, clockwise)
const SEAT_POSITIONS: Record<number, { top: string; left: string }> = {
  0: { top: "82%", left: "50%" },
  1: { top: "72%", left: "15%" },
  2: { top: "40%", left: "5%" },
  3: { top: "12%", left: "15%" },
  4: { top: "5%", left: "50%" },
  5: { top: "12%", left: "85%" },
  6: { top: "40%", left: "95%" },
  7: { top: "72%", left: "85%" },
};

// ─── Sub-Components ──────────────────────────────────────

function PokerCardEl({
  card,
  hidden = false,
  small = false,
}: {
  card: PokerCard | null;
  hidden?: boolean;
  small?: boolean;
}) {
  const w = small ? 48 : 64;
  const h = small ? 68 : 90;

  if (!card || hidden) {
    return (
      <div className="pk-card pk-card-back" style={{ width: w, height: h }}>
        <div className="pk-card-back-pattern" />
      </div>
    );
  }

  const color = suitColor(card.suit);
  return (
    <div
      className={`pk-card pk-card-front ${color}`}
      style={{ width: w, height: h }}
    >
      <div className="pk-card-tl">
        <span className="pk-card-val">{card.value}</span>
        <span className="pk-card-suit">{suitSymbol(card.suit)}</span>
      </div>
      <div className="pk-card-center">{suitSymbol(card.suit)}</div>
    </div>
  );
}

function PlayerSeat({
  player,
  isYou,
  isDealer,
  position,
  isActive,
}: {
  player: PokerPlayer;
  isYou: boolean;
  isDealer: boolean;
  position: { top: string; left: string };
  isActive: boolean;
}) {
  return (
    <div
      className={`pk-seat ${isActive ? "pk-seat-active" : ""} ${player.folded ? "pk-seat-folded" : ""} ${!player.isConnected ? "pk-seat-dc" : ""}`}
      style={{ top: position.top, left: position.left }}
    >
      {/* Dealer chip */}
      {isDealer && <div className="pk-dealer-chip">D</div>}

      {/* Cards */}
      <div className="pk-seat-cards">
        {player.cards.map((c, i) => (
          <PokerCardEl key={i} card={c} hidden={!c} small />
        ))}
      </div>

      {/* Name plate */}
      <div className={`pk-nameplate ${isYou ? "pk-nameplate-you" : ""}`}>
        <div className="pk-name">
          {player.name}
          {isYou ? " (You)" : ""}
        </div>
        <div className="pk-chips">${player.chips}</div>
      </div>

      {/* Bet */}
      {player.bet > 0 && (
        <div className="pk-bet-bubble">
          <span className="pk-bet-amount">${player.bet}</span>
        </div>
      )}

      {/* Status */}
      {player.folded && <div className="pk-status-tag fold-tag">FOLD</div>}
      {player.isAllIn && !player.folded && (
        <div className="pk-status-tag allin-tag">ALL-IN</div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

interface Props {
  gameState: PokerGameState;
  playerId: string;
  onAction: (action: string, amount?: number) => void;
  onSetOptions: (opts: {
    autoInsurance?: boolean;
    runItTwiceOptIn?: boolean;
  }) => void;
  onNewHand: () => void;
  onLeave: () => void;
}

export default function PokerGame({
  gameState,
  playerId,
  onAction,
  onSetOptions,
  onNewHand,
  onLeave,
}: Props) {
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const me = gameState.players.find((p) => p.id === playerId);
  const isHost = gameState.hostId === playerId;
  const isSpectator = !!gameState.isSpectator;
  const isMyTurn = me?.isCurrentPlayer && !me.folded && !me.isAllIn;
  const isShowdown = gameState.gameState === "showdown";
  const isWaiting = gameState.gameState === "waiting";

  // Seat assignment: put "me" at position 0, others clockwise
  const seatOrder = useMemo(() => {
    const myIdx = gameState.players.findIndex((p) => p.id === playerId);
    const n = gameState.players.length;
    const order: { player: PokerPlayer; pos: number }[] = [];
    for (let i = 0; i < n; i++) {
      const actualIdx = (myIdx + i) % n;
      // Distribute seats evenly
      const seatSlot = Math.round((i / n) * 8) % 8;
      order.push({ player: gameState.players[actualIdx], pos: seatSlot });
    }
    return order;
  }, [gameState.players, playerId]);

  // Min raise
  const minRaiseTotal = gameState.currentBet + gameState.minRaise;
  const callAmount = me ? Math.min(gameState.currentBet - me.bet, me.chips) : 0;
  const canCheck = me ? gameState.currentBet <= me.bet : false;

  // Reset raise slider when turn changes
  useEffect(() => {
    if (isMyTurn && me) {
      setRaiseAmount(Math.min(minRaiseTotal, me.chips + me.bet));
    }
  }, [isMyTurn, minRaiseTotal, me?.chips, me?.bet]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);
  // Auto-scroll action log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gameState.actionLog.length]);

  const handleRaise = useCallback(() => {
    onAction("raise", raiseAmount);
  }, [onAction, raiseAmount]);

  const handleAllIn = useCallback(() => {
    onAction("allin");
  }, [onAction]);

  // Community cards with animation class based on street
  const communitySlots = useMemo(() => {
    const cards: (PokerCard | null)[] = [...gameState.communityCards];
    while (cards.length < 5) cards.push(null);
    return cards;
  }, [gameState.communityCards]);

  const streetLabel =
    gameState.gameState === "preflop"
      ? "PRE-FLOP"
      : gameState.gameState === "flop"
        ? "FLOP"
        : gameState.gameState === "turn"
          ? "TURN"
          : gameState.gameState === "river"
            ? "RIVER"
            : gameState.gameState === "showdown"
              ? "SHOWDOWN"
              : "";

  return (
    <div className="pk-container">
      {/* Top bar */}
      <div className="pk-topbar">
        <button className="pk-topbar-btn" onClick={onLeave}>
          ✕ Leave
        </button>
        <div className="pk-topbar-info">
          <span className="pk-room-code">{gameState.roomCode}</span>
          <span className="pk-street-label">{streetLabel}</span>
          <span className="pk-hand-num">Hand #{gameState.handNumber}</span>
        </div>
        <button className="pk-topbar-btn" onClick={() => setShowLog(!showLog)}>
          {showLog ? "✕ Log" : "📜 Log"}
        </button>
      </div>

      {/* Table */}
      <div className="pk-table-wrapper">
        <div className="pk-table">
          <div className="pk-felt" />

          {/* Players */}
          {seatOrder.map(({ player, pos }) => (
            <PlayerSeat
              key={player.id}
              player={player}
              isYou={player.id === playerId}
              isDealer={
                gameState.players.indexOf(player) === gameState.dealerIndex
              }
              position={SEAT_POSITIONS[pos]}
              isActive={player.isCurrentPlayer}
            />
          ))}

          {/* Community cards */}
          <div className="pk-community">
            {communitySlots.map((card, i) => (
              <div
                key={i}
                className={`pk-community-card ${card ? "pk-card-dealt" : ""}`}
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                {card ? (
                  <PokerCardEl card={card} />
                ) : (
                  <div className="pk-card-placeholder" />
                )}
              </div>
            ))}
          </div>

          {/* Pot */}
          <div className="pk-pot">
            <div className="pk-pot-label">POT</div>
            <div className="pk-pot-amount">${gameState.pot}</div>
            {gameState.turnDeadline && !isShowdown && (
              <div
                style={{ fontSize: "0.45rem", color: "var(--text-secondary)" }}
              >
                Turn ends in{" "}
                {Math.max(
                  0,
                    Math.ceil((gameState.turnDeadline - nowMs) / 1000),
                )}
                s
              </div>
            )}
          </div>

          {/* Winners */}
          {isShowdown && gameState.winners && (
            <div className="pk-winners-overlay">
              {gameState.winners.map((w, i) => (
                <div key={i} className="pk-winner-tag">
                  🏆 {w.name} wins ${w.amount}
                  {w.hand && (
                    <span className="pk-winner-hand"> — {w.hand.name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action log sidebar */}
      {showLog && (
        <div className="pk-log-panel">
          <div className="pk-log-title">Action Log</div>
          <div className="pk-log-entries">
            {gameState.actionLog.map((entry, i) => (
              <div key={i} className={`pk-log-entry pk-log-${entry.type}`}>
                {formatAction(entry)}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="pk-controls">
        {/* My cards (larger) */}
        {me && me.cards.length > 0 && !me.folded && (
          <div className="pk-my-cards">
            {me.cards.map((c, i) => (
              <PokerCardEl key={i} card={c} hidden={!c} />
            ))}
          </div>
        )}

        {isSpectator && (
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: "0.55rem",
              color: "var(--retro-cyan)",
            }}
          >
            Spectating with delay • Hole cards hidden • Viewers{" "}
            {gameState.spectatorCount ?? 0}
          </div>
        )}

        {!isSpectator && me && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="pk-btn pk-btn-check"
              style={{ fontSize: "0.45rem", padding: "8px 10px" }}
              onClick={() => onSetOptions({ autoInsurance: !me.autoInsurance })}
            >
              Insurance {me.autoInsurance ? "ON" : "OFF"}
            </button>
            <button
              className="pk-btn pk-btn-check"
              style={{ fontSize: "0.45rem", padding: "8px 10px" }}
              onClick={() =>
                onSetOptions({ runItTwiceOptIn: !me.runItTwiceOptIn })
              }
            >
              Run It Twice {me.runItTwiceOptIn ? "YES" : "NO"}
            </button>
          </div>
        )}

        {/* Action buttons */}
        {isMyTurn && !isShowdown && !isWaiting && !isSpectator && (
          <div className="pk-action-bar">
            <button
              className="pk-btn pk-btn-fold"
              onClick={() => onAction("fold")}
            >
              FOLD
            </button>

            {canCheck ? (
              <button
                className="pk-btn pk-btn-check"
                onClick={() => onAction("check")}
              >
                CHECK
              </button>
            ) : (
              <button
                className="pk-btn pk-btn-call"
                onClick={() => onAction("call")}
                disabled={callAmount <= 0}
              >
                CALL ${callAmount}
              </button>
            )}

            {me && me.chips > 0 && (
              <>
                <div className="pk-raise-group">
                  <input
                    type="range"
                    className="pk-raise-slider"
                    min={Math.min(minRaiseTotal, (me.chips || 0) + me.bet)}
                    max={(me.chips || 0) + me.bet}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(+e.target.value)}
                  />
                  <button className="pk-btn pk-btn-raise" onClick={handleRaise}>
                    RAISE ${raiseAmount}
                  </button>
                </div>
                <button className="pk-btn pk-btn-allin" onClick={handleAllIn}>
                  ALL-IN
                </button>
              </>
            )}
          </div>
        )}

        {/* Showdown / New Hand */}
        {isShowdown && (
          <div className="pk-action-bar">
            {isHost ? (
              <button
                className="pk-btn pk-btn-check"
                onClick={onNewHand}
                style={{ fontSize: "0.8rem", padding: "14px 30px" }}
              >
                DEAL NEXT HAND
              </button>
            ) : (
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: "0.6rem",
                  color: "var(--retro-yellow)",
                }}
              >
                Waiting for host to deal...
              </div>
            )}
          </div>
        )}

        {/* Waiting */}
        {isWaiting && (
          <div className="pk-action-bar">
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: "0.6rem",
                color: "var(--text-secondary)",
              }}
            >
              Waiting for players...
            </div>
          </div>
        )}

        {/* Not your turn indicator */}
        {!isMyTurn && !isShowdown && !isWaiting && me && !me.folded && (
          <div className="pk-action-bar">
            <div className="pk-waiting-turn">
              Waiting for{" "}
              {gameState.players[gameState.currentPlayerIndex]?.name || "..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
