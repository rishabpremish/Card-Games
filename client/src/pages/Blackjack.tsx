import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useSound } from "../hooks/useSound";
import { useConfetti } from "../hooks/useConfetti";
import { useScreenShake } from "../hooks/useScreenShake";
import { useAchievements } from "../hooks/useAchievements";
import { useSessionStats } from "../hooks/useSessionStats";

// ─── Types ───────────────────────────────────────────────

interface Card {
  suit: string;
  rank: string;
  value: number;
}

interface PlayerHand {
  cards: Card[];
  bet: number;
  status: "playing" | "stood" | "bust" | "blackjack";
}

type GameState = "BETTING" | "PLAYING" | "DEALER_TURN" | "GAME_OVER";
type MsgType = "win" | "bad" | "neutral";

// ─── Constants ───────────────────────────────────────────

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = [
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
const CHIP_VALUES = [1, 5, 10, 25, 100, 500, 1000];

// ─── Pure Helpers ────────────────────────────────────────

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value = parseInt(rank);
      if (["J", "Q", "K"].includes(rank)) value = 10;
      if (rank === "A") value = 11;
      deck.push({ suit, rank, value });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function calculateScore(cards: Card[]): number {
  let score = 0;
  let aces = 0;
  for (const c of cards) {
    score += c.value;
    if (c.rank === "A") aces++;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function suitSymbol(suit: string): string {
  const m: Record<string, string> = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };
  return m[suit] ?? "";
}

function freshDeck(): Card[] {
  return shuffleDeck(createDeck());
}

// ─── Sub-Components ──────────────────────────────────────

function BJCard({ card, hidden = false }: { card: Card; hidden?: boolean }) {
  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <div className={`bj-card ${hidden ? "hidden" : ""}`}>
      <div className={`card-front ${isRed ? "red" : "black"}`}>
        <div className="card-corner top">
          <span className="card-value">{card.rank}</span>
          <span className="card-suit-small">{suitSymbol(card.suit)}</span>
        </div>
        <div className="card-center">{suitSymbol(card.suit)}</div>
        <div className="card-corner bottom">
          <span className="card-value">{card.rank}</span>
          <span className="card-suit-small">{suitSymbol(card.suit)}</span>
        </div>
      </div>
      <div className="card-back" />
    </div>
  );
}

function Chip({
  value,
  onClick,
  disabled,
}: {
  value: number | string;
  onClick: () => void;
  disabled: boolean;
}) {
  const cls = value === "ALL" ? "c-max" : `c-${value}`;
  return (
    <div
      className={`chip ${cls} ${disabled ? "disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
    >
      {value === "ALL" ? "ALL" : `$${value}`}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function Blackjack() {
  const navigate = useNavigate();
  const {
    wallet,
    placeBet: walletPlaceBet,
    addWinnings: walletAddWinnings,
    isLoading: walletLoading,
  } = useWallet();

  // Fun feature hooks
  const { playSound } = useSound();
  const { triggerConfetti } = useConfetti();
  const { triggerShake } = useScreenShake();
  const {
    unlockAchievement,
    incrementWinStreak,
    resetWinStreak,
    incrementSessionWins,
  } = useAchievements();
  const { recordBet } = useSessionStats();

  // Game state
  const [deck, setDeck] = useState<Card[]>(freshDeck);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [playerHands, setPlayerHands] = useState<PlayerHand[]>([]);
  const [currentHandIndex, setCurrentHandIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>("BETTING");
  const [stagedBet, setStagedBet] = useState(0);
  const [msg, setMsg] = useState({ text: "", type: "neutral" as MsgType });
  const [showMsg, setShowMsg] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);

  // Refs to avoid stale closures during dealer play timeouts
  const dealerRef = useRef(dealerHand);
  const deckRef = useRef(deck);
  const handsRef = useRef(playerHands);

  useEffect(() => {
    dealerRef.current = dealerHand;
  }, [dealerHand]);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);
  useEffect(() => {
    handsRef.current = playerHands;
  }, [playerHands]);

  // ─── Reset ─────────────────────────────────────────────

  const resetHand = useCallback(() => {
    setGameState("BETTING");
    setDealerHand([]);
    setPlayerHands([]);
    setCurrentHandIndex(0);
    setStagedBet(0);
    setShowMsg(false);
    setShowModal(false);
    setBusy(false);
    setDeck(freshDeck());
  }, []);

  // ─── Flash message helper ─────────────────────────────

  const flash = useCallback((text: string, type: MsgType, duration = 1200) => {
    setMsg({ text, type });
    setShowMsg(true);
    setTimeout(() => setShowMsg(false), duration);
  }, []);

  // ─── Settle round ─────────────────────────────────────

  const settleRound = useCallback(
    async (dHand: Card[], pHands: PlayerHand[]) => {
      const dScore = calculateScore(dHand);
      const dealerBJ = dScore === 21 && dHand.length === 2;

      let totalReturn = 0;
      let winCount = 0;
      let pushCount = 0;
      let lossCount = 0;
      let hasBlackjack = false;

      for (const hand of pHands) {
        const pScore = calculateScore(hand.cards);

        if (hand.status === "bust") {
          lossCount++;
          continue;
        }

        if (hand.status === "blackjack") {
          hasBlackjack = true;
          if (dealerBJ) {
            totalReturn += hand.bet; // push
            pushCount++;
          } else {
            totalReturn += hand.bet + Math.floor(hand.bet * 1.5); // 3:2
            winCount++;
          }
          continue;
        }

        if (dScore > 21) {
          totalReturn += hand.bet * 2;
          winCount++;
        } else if (pScore > dScore) {
          totalReturn += hand.bet * 2;
          winCount++;
        } else if (pScore === dScore) {
          totalReturn += hand.bet;
          pushCount++;
        } else {
          lossCount++;
        }
      }

      const totalBets = pHands.reduce((s, h) => s + h.bet, 0);

      // Pay out via Convex
      if (totalReturn > 0) {
        try {
          await walletAddWinnings(totalReturn, "Blackjack");
        } catch (e) {
          console.error("Failed to add winnings:", e);
        }
      }

      // Delay showing result by 2 seconds
      setTimeout(() => {
        if (winCount > 0) {
          const profit = totalReturn - totalBets;
          setMsg({
            text: profit > 0 ? `YOU WIN +$${profit}` : "YOU WIN!",
            type: "win",
          });

          // Fun features on win
          playSound("win");
          triggerConfetti({ intensity: winCount >= 2 ? "high" : "medium" });
          incrementWinStreak();
          incrementSessionWins();
          recordBet("blackjack", totalBets, "win");

          // Check for blackjack achievement
          if (hasBlackjack) {
            unlockAchievement("first_blackjack");
          }
        } else if (pushCount > 0 && lossCount === 0) {
          setMsg({ text: "PUSH", type: "neutral" });
          playSound("button");
        } else {
          setMsg({ text: "DEALER WINS", type: "bad" });

          // Fun features on loss
          playSound("lose");
          triggerShake("medium");
          resetWinStreak();
          recordBet("blackjack", totalBets, "loss");
        }

        setGameState("GAME_OVER");
        setShowModal(true);
      }, 2000);
    },
    [
      walletAddWinnings,
      playSound,
      triggerConfetti,
      triggerShake,
      unlockAchievement,
      incrementWinStreak,
      resetWinStreak,
      incrementSessionWins,
      recordBet,
    ],
  );

  // ─── Dealer play (iterative via setTimeout) ───────────

  const dealerPlay = useCallback(() => {
    const allBusted = handsRef.current.every((h) => h.status === "bust");
    if (allBusted) {
      settleRound(dealerRef.current, handsRef.current);
      return;
    }

    const score = calculateScore(dealerRef.current);
    const curDeck = deckRef.current;

    if (score < 17 && curDeck.length > 0) {
      const card = curDeck[curDeck.length - 1];
      const newHand = [...dealerRef.current, card];
      const newDeck = curDeck.slice(0, -1);

      setDealerHand(newHand);
      setDeck(newDeck);
      dealerRef.current = newHand;
      deckRef.current = newDeck;

      if (calculateScore(newHand) < 17) {
        setTimeout(dealerPlay, 700);
      } else {
        setTimeout(() => settleRound(newHand, handsRef.current), 700);
      }
    } else {
      settleRound(dealerRef.current, handsRef.current);
    }
  }, [settleRound]);

  // ─── Advance to next hand or dealer ───────────────────

  const advanceHand = useCallback(
    (updatedHands?: PlayerHand[], idx?: number) => {
      const hands = updatedHands ?? handsRef.current;
      const i = idx ?? currentHandIndex;

      if (i < hands.length - 1) {
        setCurrentHandIndex(i + 1);
      } else {
        setGameState("DEALER_TURN");
        setTimeout(dealerPlay, 700);
      }
    },
    [currentHandIndex, dealerPlay],
  );

  // ─── Betting ──────────────────────────────────────────

  const stageBetAmount = useCallback(
    (amount: number) => {
      if (gameState !== "BETTING") return;
      const available = (wallet ?? 0) - stagedBet;
      if (available >= amount) setStagedBet((p) => p + amount);
    },
    [gameState, wallet, stagedBet],
  );

  const clearBet = useCallback(() => {
    if (gameState === "BETTING") setStagedBet(0);
  }, [gameState]);

  // ─── Deal ─────────────────────────────────────────────

  const deal = useCallback(async () => {
    if (stagedBet === 0 || busy) return;
    setBusy(true);

    try {
      await walletPlaceBet(stagedBet, "Blackjack");
    } catch (e) {
      console.error("Failed to place bet:", e);
      setBusy(false);
      return;
    }

    // Play sounds and check achievements
    playSound("chip");
    if (stagedBet >= 100) {
      unlockAchievement("high_roller");
    }

    const d = freshDeck();
    const pCard1 = d.pop()!;
    const dCard1 = d.pop()!;
    const pCard2 = d.pop()!;
    const dCard2 = d.pop()!;

    const pHand: PlayerHand = {
      cards: [pCard1, pCard2],
      bet: stagedBet,
      status: "playing",
    };
    const dHand = [dCard1, dCard2];

    setDeck(d);
    deckRef.current = d;
    setDealerHand(dHand);
    dealerRef.current = dHand;
    setCurrentHandIndex(0);
    setBusy(false);

    const pScore = calculateScore(pHand.cards);
    const dScore = calculateScore(dHand);

    // Play deal sound
    setTimeout(() => playSound("deal"), 200);

    // Natural blackjack
    if (pScore === 21) {
      const bjHand: PlayerHand = { ...pHand, status: "blackjack" };
      setPlayerHands([bjHand]);
      handsRef.current = [bjHand];
      setGameState("GAME_OVER");
      settleRound(dHand, [bjHand]);
      return;
    }

    // Dealer natural blackjack
    if (dScore === 21) {
      const stood: PlayerHand = { ...pHand, status: "stood" };
      setPlayerHands([stood]);
      handsRef.current = [stood];
      setGameState("GAME_OVER");
      settleRound(dHand, [stood]);
      return;
    }

    setPlayerHands([pHand]);
    handsRef.current = [pHand];
    setGameState("PLAYING");
  }, [
    stagedBet,
    busy,
    walletPlaceBet,
    settleRound,
    playSound,
    unlockAchievement,
  ]);

  // ─── Hit ──────────────────────────────────────────────

  const hit = useCallback(() => {
    if (gameState !== "PLAYING" || busy) return;
    const hand = playerHands[currentHandIndex];
    if (!hand || hand.status !== "playing") return;

    playSound("deal");

    const card = deck[deck.length - 1];
    const newDeck = deck.slice(0, -1);
    const newCards = [...hand.cards, card];
    const score = calculateScore(newCards);

    setDeck(newDeck);
    deckRef.current = newDeck;

    const updated = [...playerHands];
    if (score > 21) {
      updated[currentHandIndex] = { ...hand, cards: newCards, status: "bust" };
      setPlayerHands(updated);
      handsRef.current = updated;
      flash("BUST!", "bad");
      triggerShake("light");
      playSound("lose");
      advanceHand(updated, currentHandIndex);
    } else if (score === 21) {
      updated[currentHandIndex] = { ...hand, cards: newCards, status: "stood" };
      setPlayerHands(updated);
      handsRef.current = updated;
      playSound("button");
      advanceHand(updated, currentHandIndex);
    } else {
      updated[currentHandIndex] = { ...hand, cards: newCards };
      setPlayerHands(updated);
      handsRef.current = updated;
    }
  }, [
    gameState,
    busy,
    playerHands,
    currentHandIndex,
    deck,
    flash,
    advanceHand,
    playSound,
    triggerShake,
  ]);

  // ─── Stand ────────────────────────────────────────────

  const stand = useCallback(() => {
    if (gameState !== "PLAYING") return;
    const hand = playerHands[currentHandIndex];
    if (!hand || hand.status !== "playing") return;

    const updated = [...playerHands];
    updated[currentHandIndex] = { ...hand, status: "stood" };
    setPlayerHands(updated);
    handsRef.current = updated;
    advanceHand(updated, currentHandIndex);
  }, [gameState, playerHands, currentHandIndex, advanceHand]);

  // ─── Double Down ──────────────────────────────────────

  const doubleDown = useCallback(async () => {
    if (gameState !== "PLAYING" || busy) return;
    const hand = playerHands[currentHandIndex];
    if (!hand || hand.cards.length !== 2) return;
    if ((wallet ?? 0) < hand.bet) return;

    setBusy(true);
    try {
      await walletPlaceBet(hand.bet, "Blackjack");
    } catch (e) {
      console.error("Failed to double:", e);
      setBusy(false);
      return;
    }

    const card = deck[deck.length - 1];
    const newDeck = deck.slice(0, -1);
    const newCards = [...hand.cards, card];
    const score = calculateScore(newCards);

    setDeck(newDeck);
    deckRef.current = newDeck;

    const status: PlayerHand["status"] = score > 21 ? "bust" : "stood";
    const updated = [...playerHands];
    updated[currentHandIndex] = {
      ...hand,
      cards: newCards,
      bet: hand.bet * 2,
      status,
    };
    setPlayerHands(updated);
    handsRef.current = updated;

    if (score > 21) flash("BUST!", "bad");
    setBusy(false);
    advanceHand(updated, currentHandIndex);
  }, [
    gameState,
    busy,
    playerHands,
    currentHandIndex,
    deck,
    wallet,
    walletPlaceBet,
    flash,
    advanceHand,
  ]);

  // ─── Split ────────────────────────────────────────────

  const split = useCallback(async () => {
    if (gameState !== "PLAYING" || busy) return;
    if (playerHands.length >= 4) return;

    const hand = playerHands[currentHandIndex];
    if (!hand || hand.cards.length !== 2) return;

    const [c1, c2] = hand.cards;
    const canSplitCards =
      c1.rank === c2.rank || (c1.value === 10 && c2.value === 10);
    if (!canSplitCards) return;
    if ((wallet ?? 0) < hand.bet) return;

    setBusy(true);
    try {
      await walletPlaceBet(hand.bet, "Blackjack");
    } catch (e) {
      console.error("Failed to split:", e);
      setBusy(false);
      return;
    }

    const card1 = deck[deck.length - 1];
    const card2 = deck[deck.length - 2];
    const newDeck = deck.slice(0, -2);

    const h1: PlayerHand = {
      cards: [c1, card1],
      bet: hand.bet,
      status: "playing",
    };
    const h2: PlayerHand = {
      cards: [c2, card2],
      bet: hand.bet,
      status: "playing",
    };

    setDeck(newDeck);
    deckRef.current = newDeck;

    const updated = [...playerHands];
    updated.splice(currentHandIndex, 1, h1, h2);
    setPlayerHands(updated);
    handsRef.current = updated;
    setBusy(false);
  }, [
    gameState,
    busy,
    playerHands,
    currentHandIndex,
    deck,
    wallet,
    walletPlaceBet,
  ]);

  // ─── Derived state ────────────────────────────────────

  const currentHand = playerHands[currentHandIndex];

  const canSplitCheck =
    gameState === "PLAYING" &&
    playerHands.length < 4 &&
    currentHand?.cards.length === 2 &&
    currentHand?.status === "playing" &&
    (currentHand.cards[0].rank === currentHand.cards[1].rank ||
      (currentHand.cards[0].value === 10 &&
        currentHand.cards[1].value === 10)) &&
    (wallet ?? 0) >= currentHand.bet;

  const canDoubleCheck =
    gameState === "PLAYING" &&
    !busy &&
    currentHand?.cards.length === 2 &&
    currentHand?.status === "playing" &&
    (wallet ?? 0) >= (currentHand?.bet ?? 0);

  const dealerDisplayScore =
    gameState === "PLAYING"
      ? dealerHand.length > 0
        ? dealerHand[0].value
        : 0
      : calculateScore(dealerHand);

  const playerScore = currentHand ? calculateScore(currentHand.cards) : 0;
  const totalBetInPlay = playerHands.reduce((s, h) => s + h.bet, 0);
  const displayBet = gameState === "BETTING" ? stagedBet : totalBetInPlay;
  const availableForBet = (wallet ?? 0) - stagedBet;

  // ─── Render ───────────────────────────────────────────

  if (walletLoading) {
    return (
      <div
        className="game-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            color: "var(--retro-cyan)",
            fontSize: "1rem",
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="game-container blackjack-game">
      {/* Home Button */}
      <button className="home-btn bj-home-btn" onClick={() => navigate("/")}>
        🏠 HOME
      </button>
      <div className="bg-decoration" />

      {/* Header */}
      <header className="game-header bj-header">
        <h1>BLACKJACK</h1>
        <p className="subtitle">Pixel Casino</p>
      </header>

      {/* Stats */}
      <div className="game-stats bj-stats">
        <div className="stat-item wallet-stat">
          <span className="stat-label">Wallet</span>
          <span className="stat-value">
            $
            {(wallet ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Current Bet</span>
          <span className="stat-value">${displayBet}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="bj-game-area">
        {/* Dealer */}
        <div className="dealer-area">
          <div className="hand-label">Dealer</div>
          <div className="hand-score">
            {dealerHand.length === 0 ? "--" : dealerDisplayScore}
          </div>
          <div className="hand-container">
            {dealerHand.map((card, i) => (
              <BJCard
                key={`d-${i}`}
                card={card}
                hidden={gameState === "PLAYING" && i === 1}
              />
            ))}
          </div>
        </div>

        {/* Center */}
        <div className="table-center">
          <div
            className={`message-overlay ${showMsg ? "visible" : ""}`}
            style={{ opacity: showMsg ? 1 : 0 }}
          >
            <div
              className="big-text"
              style={{
                color:
                  msg.type === "win"
                    ? "var(--retro-green)"
                    : msg.type === "bad"
                      ? "var(--retro-red)"
                      : "var(--retro-yellow)",
              }}
            >
              {msg.text}
            </div>
          </div>
          <div className="deck-shoe" title="Deck Shoe" />
        </div>

        {/* Player */}
        <div className="player-area">
          {/* Cards */}
          {playerHands.length === 0 ? (
            <div className="hand-container" />
          ) : playerHands.length === 1 ? (
            <div className="hand-container">
              {playerHands[0].cards.map((card, i) => (
                <BJCard key={`p-${i}`} card={card} />
              ))}
            </div>
          ) : (
            <div className="split-wrapper">
              {playerHands.map((hand, idx) => (
                <div
                  key={`h-${idx}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    className={`hand-container ${idx === currentHandIndex && gameState === "PLAYING" ? "active-hand" : "inactive-hand"}`}
                  >
                    {hand.cards.map((card, i) => (
                      <BJCard key={`s-${idx}-${i}`} card={card} />
                    ))}
                  </div>
                  <div className="hand-score">
                    {calculateScore(hand.cards)}
                    {hand.status === "bust" && " 💥"}
                  </div>
                  <div
                    className="hand-label"
                    style={{ fontSize: "0.5rem", marginTop: "2px" }}
                  >
                    ${hand.bet}
                  </div>
                </div>
              ))}
            </div>
          )}

          {playerHands.length === 1 && currentHand && (
            <div className="hand-score">
              {playerScore}
              {currentHand.status === "bust" && " 💥"}
              {currentHand.status === "blackjack" && " ⭐"}
            </div>
          )}
          <div className="hand-label">Player</div>

          {/* Controls */}
          <div
            className="control-panel bj-control-panel"
            style={{ marginTop: "8px" }}
          >
            {/* BETTING */}
            {gameState === "BETTING" && (
              <div
                className="bj-betting-controls"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div className="chip-rack">
                  {CHIP_VALUES.map((v) => (
                    <Chip
                      key={v}
                      value={v}
                      onClick={() => stageBetAmount(v)}
                      disabled={availableForBet < v}
                    />
                  ))}
                  <Chip
                    value="ALL"
                    onClick={() => stageBetAmount(availableForBet)}
                    disabled={availableForBet <= 0}
                  />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="bj-action-btn"
                    onClick={clearBet}
                    style={{ borderColor: "#888", color: "#aaa" }}
                  >
                    Clear
                  </button>
                  <button
                    className="bj-action-btn btn-hit"
                    onClick={deal}
                    disabled={stagedBet === 0 || busy}
                  >
                    DEAL
                  </button>
                </div>
              </div>
            )}

            {/* PLAYING */}
            {gameState === "PLAYING" && (
              <div className="bj-action-controls">
                <button
                  className="bj-action-btn btn-hit"
                  onClick={hit}
                  disabled={busy}
                >
                  HIT
                </button>
                <button
                  className="bj-action-btn btn-stand"
                  onClick={stand}
                  disabled={busy}
                >
                  STAND
                </button>
                <button
                  className="bj-action-btn btn-double"
                  onClick={doubleDown}
                  disabled={!canDoubleCheck}
                >
                  DOUBLE
                </button>
                {canSplitCheck && (
                  <button
                    className="bj-action-btn btn-split"
                    onClick={split}
                    disabled={busy}
                  >
                    SPLIT
                  </button>
                )}
              </div>
            )}

            {/* DEALER_TURN */}
            {gameState === "DEALER_TURN" && (
              <div className="bj-action-controls">
                <div
                  style={{
                    fontFamily: "'Press Start 2P'",
                    fontSize: "0.85rem",
                    color: "var(--retro-yellow)",
                    animation: "pulse 1s steps(2) infinite",
                  }}
                >
                  Dealer playing...
                </div>
              </div>
            )}

            {/* GAME_OVER */}
            {gameState === "GAME_OVER" && (
              <div className="bj-action-controls">
                <button className="bj-action-btn btn-hit" onClick={resetHand}>
                  NEW HAND
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      <div
        className={`bj-modal-overlay ${gameState === "GAME_OVER" && showModal ? "visible" : ""}`}
      >
        <div className="bj-result-modal">
          <div className="modal-icon">
            {msg.type === "win" ? "🎉" : msg.type === "bad" ? "😔" : "🤝"}
          </div>
          <h2 className={`result-title ${msg.type}`}>{msg.text}</h2>

          {/* Hand Summary */}
          <div className="hand-summary">
            {/* Dealer Hand */}
            <div className="summary-section dealer-summary">
              <div className="summary-label">Dealer</div>
              <div className="summary-cards">
                {dealerHand.map((card, i) => (
                  <BJCard key={`modal-d-${i}`} card={card} />
                ))}
              </div>
              <div className="summary-score">
                Score: {calculateScore(dealerHand)}
              </div>
            </div>

            {/* VS Divider */}
            <div className="vs-divider">VS</div>

            {/* Player Hand(s) */}
            <div className="summary-section player-summary">
              <div className="summary-label">Player</div>
              {playerHands.length === 1 ? (
                <>
                  <div className="summary-cards">
                    {playerHands[0].cards.map((card, i) => (
                      <BJCard key={`modal-p-${i}`} card={card} />
                    ))}
                  </div>
                  <div className="summary-score">
                    Score: {calculateScore(playerHands[0].cards)}
                    {playerHands[0].status === "blackjack" && " ⭐ Blackjack!"}
                    {playerHands[0].status === "bust" && " 💥 Bust"}
                  </div>
                </>
              ) : (
                <div className="split-hands-summary">
                  {playerHands.map((hand, idx) => (
                    <div key={`modal-split-${idx}`} className="split-hand">
                      <div className="split-label">Hand {idx + 1}</div>
                      <div className="summary-cards split-cards">
                        {hand.cards.map((card, i) => (
                          <BJCard key={`modal-s-${idx}-${i}`} card={card} />
                        ))}
                      </div>
                      <div className="summary-score">
                        {calculateScore(hand.cards)}
                        {hand.status === "blackjack" && " ⭐"}
                        {hand.status === "bust" && " 💥"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-buttons">
            <button className="play-again-btn" onClick={resetHand}>
              New Hand
            </button>
          </div>
        </div>
      </div>
      {/* Blackjack Styles */}
      <style>{`
        .blackjack-game {
          --bj-card-w: clamp(68px, 11vw, 130px);
          --bj-card-h: clamp(96px, 15.5vw, 182px);
          --bj-card-overlap: clamp(-48px, -6vw, -26px);
          --bj-chip: clamp(44px, 7vw, 76px);
          max-width: 1250px;
          margin: 0 auto;
          padding: clamp(8px, 1.5vh, 16px) 20px;
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        .bj-game-area {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          position: relative;
          padding: clamp(4px, 1vh, 10px) 0;
          gap: clamp(4px, 1vh, 8px);
          min-height: 0;
          overflow: hidden;
        }

        .dealer-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex-shrink: 1;
          min-height: 0;
        }

        .player-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex-shrink: 1;
          min-height: 0;
          justify-content: flex-end;
        }

        .table-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: clamp(6px, 1.4vh, 12px);
          min-height: 0;
        }

        .hand-container {
          display: flex;
          justify-content: center;
          margin: clamp(2px, 0.6vh, 6px) 0;
          min-width: min(200px, 80vw);
          transition: all 0.3s;
        }

        .hand-container.active-hand {
          filter: drop-shadow(0 0 5px var(--retro-yellow));
          transform: scale(1.05);
        }

        .hand-container.inactive-hand {
          opacity: 0.6;
          filter: grayscale(0.5);
          transform: scale(0.95);
        }

        .split-wrapper {
          display: flex;
          gap: clamp(10px, 2.6vw, 20px);
          justify-content: center;
          width: 100%;
          flex-wrap: wrap;
        }

        .hand-score {
          background: var(--bg-secondary);
          border: 4px solid var(--retro-cyan);
          color: var(--retro-yellow);
          font-family: 'Press Start 2P';
          font-size: clamp(0.7rem, 2.2vw, 1.2rem);
          padding: clamp(4px, 1vw, 8px) clamp(8px, 2vw, 16px);
          margin-top: clamp(4px, 1vh, 6px);
          text-shadow: 2px 2px 0 #000;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
          z-index: 10;
        }

        .hand-label {
          font-family: 'Press Start 2P';
          color: var(--text-secondary);
          font-size: clamp(0.6rem, 1.8vw, 1rem);
          margin-top: clamp(6px, 1.8vh, 14px);
          margin-bottom: clamp(4px, 1vh, 6px);
          text-transform: uppercase;
        }

        .bj-card {
          width: var(--bj-card-w);
          height: var(--bj-card-h);
          position: relative;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          margin-left: var(--bj-card-overlap);
          transform-origin: center bottom;
        }

        .bj-card .card-front {
          width: 100%;
          height: 100%;
          background-color: var(--card-white);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 8px;
          position: absolute;
          backface-visibility: hidden;
          border: 4px solid var(--card-black);
          box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.5);
          z-index: 2;
        }

        .bj-card .card-back {
          width: 100%;
          height: 100%;
          background: var(--bg-card);
          position: absolute;
          backface-visibility: hidden;
          transform: rotateY(180deg);
          border: 4px solid var(--retro-purple);
          box-shadow: 4px 4px 0px rgba(153, 102, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 1;
        }

        .bj-card .card-back::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-conic-gradient(
            var(--retro-purple) 0deg 90deg,
            var(--bg-card) 90deg 180deg
          );
          background-size: 16px 16px;
          opacity: 0.3;
        }

        .bj-card .card-back::after {
          content: '';
          width: 40px;
          height: 40px;
          border: 4px solid var(--retro-magenta);
          position: relative;
          z-index: 1;
        }

        .bj-card:first-child { margin-left: 0; }

        .bj-card:hover {
          transform: translateY(-10px) rotate(2deg);
          z-index: 50;
        }

        .bj-card.hidden .card-front { display: none; }
        .bj-card.hidden .card-back { transform: rotateY(0deg); }

        .chip-rack {
          display: flex;
          gap: clamp(8px, 1.6vw, 16px);
          margin-bottom: clamp(8px, 1.6vh, 16px);
          perspective: 500px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .chip {
          width: var(--bj-chip);
          height: var(--bj-chip);
          border-radius: 50%;
          border: 4px dashed rgba(255,255,255,0.4);
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: 'Press Start 2P';
          font-size: clamp(0.45rem, 1.4vw, 0.6rem);
          color: white;
          cursor: pointer;
          box-shadow: 0 6px 0 rgba(0,0,0,0.5);
          transition: transform 0.1s, margin-top 0.1s;
          user-select: none;
          text-shadow: 1px 1px 0 #000;
          position: relative;
        }

        .chip.c-1 { background: #666; border-color: #999; }
        .chip.c-5 { background: var(--retro-blue); border-color: #88ccff; }
        .chip.c-10 { background: var(--retro-green); border-color: #88ff88; }
        .chip.c-25 { background: var(--retro-red); border-color: #ff8888; }
        .chip.c-100 { background: var(--retro-purple); border-color: #dcb3ff; }
        .chip.c-500 { background: #cc6600; border-color: #ff9933; }
        .chip.c-1000 { background: #cc0066; border-color: #ff3399; }
        .chip.c-max { background: var(--retro-yellow); color: black; text-shadow: none; border-color: #ffffaa; }

        .chip::before {
          content: '';
          position: absolute;
          top: 5px; left: 5px; right: 5px; bottom: 5px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.2);
        }

        .chip:hover { transform: translateY(-5px); }
        .chip:active { transform: translateY(0); box-shadow: 0 2px 0 rgba(0,0,0,0.5); }
        .chip.disabled { filter: grayscale(1) brightness(0.5); cursor: not-allowed; pointer-events: none; }

        .bj-action-controls {
          display: flex;
          gap: clamp(10px, 2.2vw, 20px);
          margin-top: clamp(10px, 2vh, 18px);
          flex-wrap: wrap;
          justify-content: center;
        }

        .bj-action-btn {
          font-family: 'Press Start 2P';
          font-size: clamp(0.6rem, 1.6vw, 0.95rem);
          padding: clamp(10px, 1.8vw, 18px) clamp(16px, 3vw, 30px);
          border: 4px solid;
          background: var(--bg-secondary);
          color: white;
          cursor: pointer;
          text-transform: uppercase;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
          transition: transform 0.1s;
        }

        .bj-action-btn:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 rgba(0,0,0,0.5); }
        .bj-action-btn:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 rgba(0,0,0,0.5); }
        .bj-action-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(0.5); }

        .bj-action-btn.btn-hit { border-color: var(--retro-green); color: var(--retro-green); }
        .bj-action-btn.btn-hit:hover:not(:disabled) { background: var(--retro-green); color: black; }

        .bj-action-btn.btn-stand { border-color: var(--retro-red); color: var(--retro-red); }
        .bj-action-btn.btn-stand:hover:not(:disabled) { background: var(--retro-red); color: white; }

        .bj-action-btn.btn-double { border-color: var(--retro-yellow); color: var(--retro-yellow); }
        .bj-action-btn.btn-double:hover:not(:disabled) { background: var(--retro-yellow); color: black; }

        .bj-action-btn.btn-split { border-color: var(--retro-cyan); color: var(--retro-cyan); }
        .bj-action-btn.btn-split:hover:not(:disabled) { background: var(--retro-cyan); color: black; }

        .message-overlay {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
          z-index: 100;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .message-overlay.visible { opacity: 1; }

        .big-text {
          font-family: 'Press Start 2P';
          font-size: clamp(1.6rem, 6vw, 3.5rem);
          text-shadow: 4px 4px 0 #000, -2px -2px 0 var(--retro-magenta);
          white-space: normal;
          max-width: 90vw;
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes popIn {
          0% { transform: scale(0); }
          80% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .deck-shoe {
          width: var(--bj-card-w);
          height: var(--bj-card-h);
          background: var(--bg-card);
          border: 4px solid var(--retro-purple);
          position: relative;
          box-shadow: 6px 6px 0 rgba(0,0,0,0.5);
        }

        .deck-shoe::before {
          content: '';
          position: absolute;
          top: 5px; left: 5px; right: 5px; bottom: 5px;
          border: 2px dashed var(--retro-purple);
          opacity: 0.5;
        }

        @media (max-width: 720px) {
          .bj-header h1 { font-size: clamp(1.2rem, 6.6vw, 2.2rem) !important; }
          .bj-header .subtitle { font-size: clamp(0.65rem, 3.8vw, 1.1rem) !important; }
          .bj-stats { gap: 10px; flex-wrap: wrap; }
          .bj-stats .stat-item { padding: 10px 14px !important; }
          .bj-stats .stat-label { font-size: 0.45rem !important; }
          .bj-stats .stat-value { font-size: clamp(0.9rem, 4.2vw, 1.4rem) !important; }
          .hand-container { min-width: 0; }
        }

        /* Scaled wrapper adjustments */
        .scaled-game-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .bj-home-btn {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 50;
        }

        /* Popup-style Modal (not full screen) */
        .bj-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 15, 35, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50000;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.2s steps(4);
          padding: 20px;
        }

        .bj-modal-overlay.visible {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .bj-result-modal {
          background: var(--bg-secondary);
          padding: 25px 30px;
          text-align: center;
          border: var(--pixel-border) var(--retro-cyan);
          box-shadow:
            8px 8px 0px var(--retro-magenta),
            0 0 50px rgba(0, 255, 247, 0.3);
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          transform: scale(0.8);
          transition: transform 0.2s steps(4);
        }

        .bj-modal-overlay.visible .bj-result-modal {
          transform: scale(1);
        }

        .bj-result-modal .modal-icon {
          font-size: 2.5rem;
          margin-bottom: 10px;
          animation: bounce 0.5s steps(4) infinite alternate;
        }

        .bj-result-modal .result-title {
          font-family: "Press Start 2P", cursive;
          font-size: 1rem;
          margin-bottom: 20px;
          text-shadow: 3px 3px 0px var(--retro-magenta);
        }

        .bj-result-modal .result-title.win {
          color: var(--retro-green);
        }

        .bj-result-modal .result-title.bad {
          color: var(--retro-red);
        }

        .bj-result-modal .result-title.neutral {
          color: var(--retro-yellow);
        }

        /* Hand Summary Styles */
        .hand-summary {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 20px;
          padding: 15px;
          background: rgba(0, 0, 0, 0.3);
          border: 2px solid var(--retro-purple);
        }

        .summary-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .summary-label {
          font-family: "Press Start 2P", cursive;
          font-size: 0.6rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .summary-cards {
          display: flex;
          justify-content: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .summary-cards .bj-card {
          width: clamp(56px, 9vw, 85px);
          height: clamp(78px, 12.5vw, 119px);
          margin-left: clamp(-34px, -4vw, -18px);
        }

        .summary-cards .bj-card:first-child {
          margin-left: 0;
        }

        /* Match game card styling */
        .summary-cards .bj-card .card-front {
          padding: 6px;
          border-width: 4px;
          box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.5);
        }

        .summary-cards .bj-card .card-value {
          font-size: 0.75rem;
        }

        .summary-cards .bj-card .card-suit-small {
          font-size: 1.05rem;
          margin-top: 2px;
        }

        .summary-cards .bj-card .card-center {
          font-size: 2.75rem;
        }

        .summary-score {
          font-family: "Press Start 2P", cursive;
          font-size: 0.6rem;
          color: var(--retro-yellow);
          padding: 5px 10px;
          background: var(--bg-primary);
          border: 2px solid var(--retro-cyan);
        }

        .vs-divider {
          font-family: "Press Start 2P", cursive;
          font-size: 0.7rem;
          color: var(--retro-magenta);
          padding: 5px 0;
          border-top: 2px dashed var(--text-secondary);
          border-bottom: 2px dashed var(--text-secondary);
        }

        .split-hands-summary {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .split-hand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--text-secondary);
        }

        .split-label {
          font-family: "Press Start 2P", cursive;
          font-size: 0.45rem;
          color: var(--retro-cyan);
        }

        .split-cards .bj-card {
          width: clamp(48px, 7.5vw, 60px);
          height: clamp(68px, 10.5vw, 84px);
          margin-left: clamp(-18px, -3.2vw, -12px);
        }

        /* Match game card styling for split hands */
        .split-cards .bj-card .card-front {
          padding: 4px;
          border-width: 3px;
          box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.5);
        }

        .split-cards .bj-card .card-value {
          font-size: 0.6rem;
        }

        .split-cards .bj-card .card-suit-small {
          font-size: 0.85rem;
          margin-top: 1px;
        }

        .split-cards .bj-card .card-center {
          font-size: 2rem;
        }

        .bj-result-modal .modal-buttons {
          margin-top: 15px;
        }

        .bj-result-modal .play-again-btn {
          padding: 12px 30px;
          font-size: 0.65rem;
        }

        @keyframes bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-10px); }
        }

        .bj-header {
          margin-bottom: clamp(4px, 1.4vh, 12px) !important;
          flex-shrink: 0;
        }

        .bj-header h1 {
          font-size: clamp(1.2rem, 5vw, 2.6rem) !important;
          margin: 0;
        }

        .bj-header .subtitle {
          font-size: clamp(0.7rem, 3vw, 1.4rem) !important;
          margin-top: clamp(2px, 0.8vh, 10px) !important;
        }

        .bj-stats {
          margin-bottom: clamp(6px, 1.2vh, 12px) !important;
          gap: clamp(8px, 2vw, 20px);
          flex-shrink: 0;
        }

        .bj-stats .stat-item {
          padding: clamp(8px, 1.6vh, 16px) clamp(12px, 2.4vw, 22px) !important;
        }

        .bj-stats .stat-label {
          font-size: clamp(0.45rem, 1.2vw, 0.6rem) !important;
          margin-bottom: 2px;
        }

        .bj-stats .stat-value {
          font-size: clamp(1rem, 3vw, 1.9rem) !important;
        }

        .control-panel {
          margin-top: clamp(6px, 1.6vh, 12px) !important;
          flex-shrink: 0;
        }

        .bj-control-panel {
          position: relative;
          z-index: 2;
        }

        .scaled-game-wrapper {
          display: contents;
        }
      `}</style>
    </div>
  );
}
