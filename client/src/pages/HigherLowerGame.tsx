import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  initializeGame,
  isActive,
  getMultiplier,
  processResult,
  cashOut,
  resetGame,
} from "../utils/gamblingLogic";
import { useWallet } from "../hooks/useWallet";
import { useAuth } from "../hooks/useAuth";

// Types
interface Card {
  suit: string;
  suitName: string;
  value: string;
  numericValue: number;
  isRed: boolean;
}

interface Stack {
  cards: Card[];
  locked: boolean;
}

// Card suits and values
const SUITS = ["♠", "♥", "♦", "♣"];
const SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"];
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

// Create a standard 52-card deck
function createDeck(aceValue: number = 1): Card[] {
  const deck: Card[] = [];
  for (let suitIndex = 0; suitIndex < SUITS.length; suitIndex++) {
    for (let valueIndex = 0; valueIndex < VALUES.length; valueIndex++) {
      let numericValue = valueIndex + 1;
      if (valueIndex === 0 && aceValue === 14) {
        numericValue = 14;
      }
      deck.push({
        suit: SUITS[suitIndex],
        suitName: SUIT_NAMES[suitIndex],
        value: VALUES[valueIndex],
        numericValue,
        isRed: suitIndex === 1 || suitIndex === 2,
      });
    }
  }
  return deck;
}

// Fisher-Yates shuffle
function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Card component
function CardComponent({
  card,
  isLocked = false,
  isTopCard = true,
  onHigher,
  onLower,
  dealing = false,
  dealDelay = 0,
}: {
  card: Card;
  isLocked?: boolean;
  isTopCard?: boolean;
  onHigher?: () => void;
  onLower?: () => void;
  dealing?: boolean;
  dealDelay?: number;
}) {
  const cardClasses = ["card"];
  if (isLocked) cardClasses.push("flipped", "locked");
  if (dealing) cardClasses.push("dealing");

  return (
    <div
      className={cardClasses.join(" ")}
      style={dealing ? { animationDelay: `${dealDelay}s` } : undefined}
    >
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
      <div className="card-back"></div>

      {/* Hover zones for top card */}
      {isTopCard && !isLocked && onHigher && onLower && (
        <div className="card-hover-zones">
          <div
            className="hover-zone-higher"
            onClick={(e) => {
              e.stopPropagation();
              onHigher();
            }}
          >
            <span>▲ HIGHER</span>
          </div>
          <div
            className="hover-zone-lower"
            onClick={(e) => {
              e.stopPropagation();
              onLower();
            }}
          >
            <span>▼ LOWER</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Card Stack component
function CardStack({
  stack,
  index,
  onHigher,
  onLower,
  onHover,
  onLeave,
  dealing = false,
  shaking = false,
  disabled = false,
}: {
  stack: Stack;
  index: number;
  onHigher: () => void;
  onLower: () => void;
  onHover?: () => void;
  onLeave?: () => void;
  dealing?: boolean;
  shaking?: boolean;
  disabled?: boolean;
}) {
  const cardsToShow = Math.min(stack.cards.length, 3);
  const stackClasses = ["card-stack"];
  if (shaking) stackClasses.push("shake");

  return (
    <div
      className={stackClasses.join(" ")}
      data-index={index}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {Array.from({ length: cardsToShow }).map((_, i) => {
        const card =
          stack.cards[stack.cards.length - 1 - (cardsToShow - 1 - i)];
        const isTopCard = i === cardsToShow - 1;
        return (
          <CardComponent
            key={`${card.suit}-${card.value}-${i}`}
            card={card}
            isLocked={stack.locked}
            isTopCard={isTopCard}
            onHigher={!stack.locked && !disabled ? onHigher : undefined}
            onLower={!stack.locked && !disabled ? onLower : undefined}
            dealing={dealing && isTopCard}
            dealDelay={index * 0.1}
          />
        );
      })}
    </div>
  );
}

// Flying Card component for animation
function FlyingCard({
  card,
  startPos,
  endPos,
  onComplete,
}: {
  card: Card;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  onComplete: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  // Use a ref for onComplete to avoid restarting the animation when the
  // parent re-renders and produces a new callback identity.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!cardRef.current) return;

    // Reset completion flag on mount
    completedRef.current = false;

    const speedSetting = localStorage.getItem("cardSpeed") || "normal";
    const duration =
      speedSetting === "fast" ? 150 : speedSetting === "slow" ? 600 : 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentX = startPos.x + (endPos.x - startPos.x) * easeOut;
      const currentY = startPos.y + (endPos.y - startPos.y) * easeOut;

      if (cardRef.current) {
        cardRef.current.style.left = `${currentX}px`;
        cardRef.current.style.top = `${currentY}px`;
        cardRef.current.style.transform = `rotate(${(1 - progress) * 10}deg)`;
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup function to cancel animation if component unmounts
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // Only restart animation when positions change, NOT when onComplete changes
  }, [startPos, endPos]);

  return (
    <div
      ref={cardRef}
      className="flying-card"
      style={{ left: startPos.x, top: startPos.y }}
    >
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
    </div>
  );
}

// Instructions component
function Instructions() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="instructions">
      <button
        className="instructions-toggle"
        onClick={() => setVisible(!visible)}
      >
        How to Play
      </button>
      <div className={`instructions-content ${visible ? "visible" : ""}`}>
        <h3>Rules</h3>
        <ol>
          <li>Hover over any face-up card in the grid</li>
          <li>
            Click <strong>Higher</strong> or <strong>Lower</strong> to guess the
            next card
          </li>
          <li>
            If correct, the new card is placed on that stack - keep going!
          </li>
          <li>If wrong, the stack is locked (turned face-down)</li>
          <li>
            Win by placing all 52 cards before running out of active stacks
          </li>
        </ol>
        <p className="note">
          Note: Aces are low (1), Kings are high (13). Equal values count as
          correct (pushed)!
        </p>
      </div>
    </div>
  );
}

// Game Over Modal component
function GameOverModal({
  isWin,
  cardsPlaced,
  cardsGone,
  onPlayAgain,
  onClose,
  onReveal,
  visible,
}: {
  isWin: boolean;
  cardsPlaced: number;
  cardsGone: number;
  onPlayAgain: () => void;
  onClose: () => void;
  onReveal: () => void;
  visible: boolean;
}) {
  const percentage = Math.round((cardsGone / 43) * 100);

  const progressColor =
    percentage >= 100
      ? "var(--retro-green)"
      : percentage >= 50
        ? "var(--retro-yellow)"
        : "var(--retro-red)";

  return (
    <div className={`modal-overlay ${visible ? "visible" : ""}`}>
      <div className="modal">
        <div className="modal-icon">{isWin ? "🎉" : "😔"}</div>
        <h2>{isWin ? "Congratulations!" : "Game Over"}</h2>
        <p>
          {isWin
            ? "You've made it through the entire deck!"
            : "All stacks are locked. You keep 35% of your stake!"}
        </p>

        <div className="modal-stats">
          <div className="modal-stat">
            <span className="modal-stat-value">{cardsPlaced}</span>
            <span className="modal-stat-label">Cards Placed</span>
          </div>
        </div>

        <div className="modal-progress-container">
          <div className="modal-progress-bar">
            <div
              className="modal-progress-fill"
              style={{
                width: visible ? `${percentage}%` : "0%",
                background: progressColor,
              }}
            />
            <span className="modal-progress-text">
              DECK PROGRESS: {cardsGone} / 43
            </span>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="play-again-btn" onClick={onPlayAgain}>
            Play Again
          </button>
          {!isWin && (
            <button className="reveal-btn" onClick={onReveal}>
              Reveal Deck
            </button>
          )}
          {isWin && (
            <button className="close-modal-btn" onClick={onClose}>
              View Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Forfeit Confirm Modal component
function ForfeitConfirmModal({
  stake,
  onConfirm,
  onCancel,
  visible,
}: {
  stake: number;
  onConfirm: () => void;
  onCancel: () => void;
  visible: boolean;
}) {
  return (
    <div className={`modal-overlay ${visible ? "visible" : ""}`}>
      <div className="modal forfeit-modal">
        <div className="modal-icon">⚠️</div>
        <h2>Forfeit Game?</h2>
        <p>
          You have an active bet! Starting a new game will forfeit your current
          stake of <strong>${stake.toFixed(2)}</strong>.
        </p>
        <p style={{ color: "var(--retro-yellow)", marginTop: "10px" }}>
          Are you sure?
        </p>
        <div className="modal-buttons">
          <button
            className="play-again-btn forfeit-confirm-yes"
            onClick={onConfirm}
          >
            YES, FORFEIT
          </button>
          <button
            className="close-modal-btn forfeit-confirm-no"
            onClick={onCancel}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

// Betting Modal component
function BettingModal({
  wallet,
  onPlaceBet,
  onClose,
  visible,
}: {
  wallet: number | undefined | null;
  onPlaceBet: (amount: number) => void;
  onClose: () => void;
  visible: boolean;
}) {
  const safeWallet = wallet ?? 0;
  const [betAmount, setBetAmount] = useState(Math.min(10, safeWallet));
  const [inputDisplay, setInputDisplay] = useState(String(Math.min(10, safeWallet)));

  useEffect(() => {
    if (visible) {
      const initial = Math.min(10, safeWallet);
      setBetAmount(initial);
      setInputDisplay(String(initial));
    }
  }, [visible, safeWallet]);

  const handleBetChange = (value: number) => {
    const clamped = Math.max(1, Math.min(safeWallet, value));
    setBetAmount(clamped);
    setInputDisplay(String(clamped));
  };

  const handleInputChange = (raw: string) => {
    // Allow the field to be empty while typing
    if (raw === "" || raw === "0") {
      setInputDisplay(raw);
      setBetAmount(0);
      return;
    }
    const parsed = parseInt(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.min(safeWallet, parsed);
      setInputDisplay(String(clamped));
      setBetAmount(clamped);
    }
  };

  const handleInputBlur = () => {
    // On blur, enforce minimum of 1
    if (betAmount < 1) {
      setBetAmount(1);
      setInputDisplay("1");
    }
  };

  return (
    <div
      className={`modal-overlay ${visible ? "visible" : ""}`}
      onClick={onClose}
    >
      <div className="modal betting-modal" onClick={(e) => e.stopPropagation()}>
        <button className="settings-close" onClick={onClose} type="button">
          ✕
        </button>
        <div className="modal-icon">🎰</div>
        <h2>Place Your Bet</h2>
        <div className="betting-controls">
          <div className="current-balance">
            Balance: <span>${safeWallet}</span>
          </div>

          <div className="bet-input-wrapper">
            <div className="bet-input-container">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                className="bet-input"
                min="1"
                max={safeWallet}
                value={inputDisplay}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
              />
            </div>
            <div className="bet-slider-container">
              <input
                type="range"
                className="bet-slider"
                min="1"
                max={safeWallet}
                value={betAmount}
                onChange={(e) => handleBetChange(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
        <div className="modal-buttons">
          <button
            className="bet-btn"
            onClick={() => {
              setBetAmount(safeWallet);
              setInputDisplay(String(safeWallet));
              onPlaceBet(safeWallet);
            }}
            type="button"
            disabled={safeWallet < 1}
          >
            ALL IN!
          </button>
          <button
            className="play-btn"
            onClick={() => onPlaceBet(Math.max(1, betAmount))}
            type="button"
            disabled={safeWallet < 1 || betAmount < 1}
          >
            DEAL CARDS
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Game component
export default function HigherLowerGame() {
  const navigate = useNavigate();
  const deckRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);
  const lastDrawTimeRef = useRef(0);

  // Restore saved game state from sessionStorage if available
  const savedState = useRef(() => {
    try {
      const saved = sessionStorage.getItem("hlGameState");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const restored = savedState.current();

  // Game state
  const [deck, setDeck] = useState<Card[]>(restored?.deck ?? []);
  const [grid, setGrid] = useState<Stack[]>(restored?.grid ?? []);
  const [cardsPlaced, setCardsPlaced] = useState<number>(
    restored?.cardsPlaced ?? 0,
  );
  const [gameOver, setGameOver] = useState(restored?.gameOver ?? false);
  const [isWin, setIsWin] = useState(restored?.isWin ?? false);
  const [, setIsProcessing] = useState(false);
  const [dealing, setDealing] = useState(false);
  const [shakingStack, setShakingStack] = useState<number | null>(null);
  const [revealMode, setRevealMode] = useState(restored?.revealMode ?? false);

  // Convex wallet hook
  const {
    wallet,
    placeBet: placeBetMutation,
    addWinnings,
    cashOut: cashOutMutation,
    updateWallet,
  } = useWallet();
  const { user } = useAuth();
  const [currentBet, setCurrentBet] = useState(restored?.currentBet ?? 0);

  // Gambling state
  const [gamblingStake, setGamblingStake] = useState(
    restored?.gamblingStake ?? 0,
  );
  const [multipliers, setMultipliers] = useState<{
    higher: number | null;
    lower: number | null;
  }>({ higher: null, lower: null });
  const [hoveredStack, setHoveredStack] = useState<number | null>(null);
  const [showCashOut, setShowCashOut] = useState(
    restored?.showCashOut ?? false,
  );
  const [hasCashedOut, setHasCashedOut] = useState(
    restored?.hasCashedOut ?? false,
  );
  const [hasLostBet, setHasLostBet] = useState(false);

  // Level progression state - cards required before cashout
  const [currentLevel, setCurrentLevel] = useState(restored?.currentLevel ?? 1);
  const [cardsPlayedThisLevel, setCardsPlayedThisLevel] = useState(
    restored?.cardsPlayedThisLevel ?? 0,
  );
  // Level 1: 4 cards, Level 2: 3 cards, Level 3: 2 cards, Level 4+: 0 (can cash out anytime)
  const cardsRequiredForCashout = currentLevel === 1 ? 4 : currentLevel === 2 ? 3 : currentLevel === 3 ? 2 : 0;

  // Modal states
  const [showGameOverModal, setShowGameOverModal] = useState(
    restored?.showGameOverModal ?? false,
  );
  const [showBettingModal, setShowBettingModal] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

  // Flying card animation
  const flightIdRef = useRef(0);
  const processedFlightIdRef = useRef<number | null>(null);
  const flyingCardRef = useRef<boolean>(false);

  const [flyingCard, setFlyingCard] = useState<{
    card: Card;
    startPos: { x: number; y: number };
    endPos: { x: number; y: number };
    stackIndex: number;
    choice: "higher" | "lower";
    isCorrect: boolean;
    flightId: number;
    multiplier: number;
    currentCardValue: number;
  } | null>(null);

  // Save game state to sessionStorage on changes
  useEffect(() => {
    if (deck.length > 0 || grid.length > 0) {
      const state = {
        deck,
        grid,
        cardsPlaced,
        gameOver,
        isWin,
        revealMode,
        currentBet,
        gamblingStake,
        showCashOut,
        hasCashedOut,
        showGameOverModal,
        currentLevel,
        cardsPlayedThisLevel,
      };
      sessionStorage.setItem("hlGameState", JSON.stringify(state));
    }
  }, [
    deck,
    grid,
    cardsPlaced,
    gameOver,
    isWin,
    revealMode,
    currentBet,
    gamblingStake,
    showCashOut,
    hasCashedOut,
    showGameOverModal,
    currentLevel,
    cardsPlayedThisLevel,
  ]);

  // Initialize game
  const initGame = useCallback(() => {
    const aceValue = parseInt(localStorage.getItem("aceValue") || "1");
    const newDeck = shuffleDeck(createDeck(aceValue));
    const initialGrid: Stack[] = [];

    // Deal 9 cards to the grid
    for (let i = 0; i < 9; i++) {
      const card = newDeck.pop()!;
      initialGrid.push({ cards: [card], locked: false });
    }

    setDeck(newDeck);
    setGrid(initialGrid);
    setCardsPlaced(9);
    setGameOver(false);
    setIsWin(false);
    setDealing(true);
    setRevealMode(false);
    setShowGameOverModal(false);
    setHasCashedOut(false);
    setHasLostBet(false);

    setTimeout(() => setDealing(false), 1000);
  }, []);

  // Start game on mount — only if no saved state; restore gambling state if needed
  useEffect(() => {
    if (!restored) {
      initGame();
    } else if (restored.showCashOut && restored.gamblingStake > 0) {
      // Re-initialize the gambling module so cashOut/isActive work after reload
      initializeGame(restored.gamblingStake);
    }
  }, [initGame]);

  // Check game over conditions
  const checkGameOver = useCallback(
    (currentDeck: Card[], currentGrid: Stack[]) => {
      const activeStacks = currentGrid.filter((s) => !s.locked).length;

      // Lose: no active stacks but cards remain - Partial loss: keep 35%
      if (activeStacks === 0 && currentDeck.length > 0) {
        setGameOver(true);
        setIsWin(false);
        // Player keeps 35% of stake on soft loss (game over without wrong guess)
        if (isActive()) {
          const finalPayout = Math.floor(gamblingStake * 0.35 * 100) / 100;
          if (finalPayout > 0) {
            addWinnings(finalPayout, "Higher-Lower").catch((error) => {
              console.error("Failed to add partial winnings:", error);
            });
          }
          setGamblingStake(0);
          setShowCashOut(false);
          resetGame();
        }
        setShowGameOverModal(true);
        return;
      }

      // Win: deck empty and at least 1 stack still active
      if (currentDeck.length === 0 && activeStacks > 0) {
        setGameOver(true);
        setIsWin(true);
        // Full deck clear = 2x bonus on gambling winnings
        if (isActive()) {
          const basePayout = cashOut();
          const bonusPayout = Math.floor(basePayout * 2 * 100) / 100; // 2x for clearing the deck
          addWinnings(bonusPayout, "Higher-Lower").catch((error) => {
            console.error("Failed to add winnings:", error);
          });
          setGamblingStake(0);
          setShowCashOut(false);
        }
        setShowGameOverModal(true);
        return;
      }

      // Lose: deck empty and no active stacks - Partial loss: keep 35%
      if (currentDeck.length === 0 && activeStacks === 0) {
        setGameOver(true);
        setIsWin(false);
        // Player keeps 35% of stake on soft loss (game over without wrong guess)
        if (isActive()) {
          const finalPayout = Math.floor(gamblingStake * 0.35 * 100) / 100;
          if (finalPayout > 0) {
            addWinnings(finalPayout, "Higher-Lower").catch((error) => {
              console.error("Failed to add partial winnings:", error);
            });
          }
          setGamblingStake(0);
          setShowCashOut(false);
          resetGame();
        }
        setShowGameOverModal(true);
      }
    },
    [currentBet],
  );

  // Compute multipliers for a specific stack (used by hover + handleChoice)
  const computeMultipliersForStack = useCallback(
    (stackIndex: number): { higher: number | null; lower: number | null } => {
      if (!isActive() || grid[stackIndex].locked) {
        return { higher: null, lower: null };
      }

      const currentCard =
        grid[stackIndex].cards[grid[stackIndex].cards.length - 1];
      const remainingValues = deck.map((card) => card.numericValue);

      const higherMult = getMultiplier(
        "higher",
        currentCard.numericValue,
        remainingValues,
      );
      const lowerMult = getMultiplier(
        "lower",
        currentCard.numericValue,
        remainingValues,
      );

      return { higher: higherMult, lower: lowerMult };
    },
    [grid, deck],
  );

  const handleHoverStack = useCallback(
    (stackIndex: number) => {
      setHoveredStack(stackIndex);
      setMultipliers(computeMultipliersForStack(stackIndex));
    },
    [computeMultipliersForStack],
  );

  const handleLeaveStack = useCallback(() => {
    setHoveredStack(null);
    setMultipliers({ higher: null, lower: null });
  }, []);

  // Handle quick choice (higher/lower)
  const handleChoice = useCallback(
    (stackIndex: number, choice: "higher" | "lower") => {
      // ABSOLUTE FIRST CHECK: if already processing, abort immediately
      if (processingRef.current) return;

      // Set processing lock BEFORE any other checks to block concurrent calls
      processingRef.current = true;

      // Time throttle check
      const now = performance.now();
      if (now - lastDrawTimeRef.current < 500) {
        processingRef.current = false; // release if throttled
        return;
      }

      // Check flying card ref (synchronous, avoids stale closure)
      if (flyingCardRef.current) {
        processingRef.current = false;
        return;
      }

      // Validation checks
      if (gameOver || grid[stackIndex].locked || deck.length === 0) {
        processingRef.current = false; // release on invalid state
        return;
      }

      lastDrawTimeRef.current = now;
      setIsProcessing(true);

      const currentCard =
        grid[stackIndex].cards[grid[stackIndex].cards.length - 1];

      // Read the top card directly from the deck (deck is current via
      // useCallback deps). Do NOT try to capture it inside a setState
      // updater — React 18 defers updater execution to the render phase,
      // so the captured variable would still be null here.
      const drawnCard = deck[deck.length - 1];
      setDeck((prev) => prev.slice(0, -1));

      // Determine if correct (equal values count as correct - "pushed")
      const pushedAllowed = localStorage.getItem("pushed") !== "false";
      let isCorrect = false;
      if (choice === "higher") {
        isCorrect =
          drawnCard.numericValue > currentCard.numericValue ||
          (pushedAllowed &&
            drawnCard.numericValue === currentCard.numericValue);
      } else {
        isCorrect =
          drawnCard.numericValue < currentCard.numericValue ||
          (pushedAllowed &&
            drawnCard.numericValue === currentCard.numericValue);
      }

      // Get positions for animation
      const deckRect = deckRef.current?.getBoundingClientRect();
      const stackEl = gridRef.current?.children[stackIndex] as HTMLElement;
      const stackRect = stackEl?.getBoundingClientRect();

      if (deckRect && stackRect) {
        const flightId = ++flightIdRef.current;
        // Capture the multiplier at click time so it stays correct even if
        // the user hovers a different stack during the animation.
        const computedMultipliers = computeMultipliersForStack(stackIndex);
        const usedMultiplierRaw =
          choice === "higher"
            ? computedMultipliers.higher
            : computedMultipliers.lower;
        const usedMultiplier = usedMultiplierRaw ?? 1;
        // Keep display in sync with the stack being played
        setMultipliers(computedMultipliers);
        setHoveredStack(stackIndex);
        flyingCardRef.current = true;
        setFlyingCard({
          card: drawnCard,
          startPos: { x: deckRect.left, y: deckRect.top },
          endPos: { x: stackRect.left, y: stackRect.top },
          stackIndex,
          choice,
          isCorrect,
          flightId,
          multiplier: usedMultiplier,
          currentCardValue: currentCard.numericValue,
        });
        processedFlightIdRef.current = null;
      } else {
        // No animation possible — apply card placement immediately
        if (isCorrect) {
          setGrid((prev) => {
            const newGrid = [...prev];
            newGrid[stackIndex] = {
              ...newGrid[stackIndex],
              cards: [...newGrid[stackIndex].cards, drawnCard],
            };
            return newGrid;
          });
          setCardsPlaced((prev) => prev + 1);
        } else {
          setGrid((prev) => {
            const newGrid = [...prev];
            newGrid[stackIndex] = { ...newGrid[stackIndex], locked: true };
            return newGrid;
          });
        }
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [gameOver, grid, deck, computeMultipliersForStack],
  );

  // Handle flying card animation complete
  const handleFlyingCardComplete = useCallback(() => {
    if (!flyingCard) {
      processingRef.current = false;
      return;
    }

    const {
      stackIndex,
      isCorrect,
      card,
      choice,
      flightId,
      multiplier,
      currentCardValue,
    } = flyingCard;

    // Ignore duplicate completions for the same flight (can happen in StrictMode replays)
    if (processedFlightIdRef.current === flightId) {
      processingRef.current = false;
      return;
    }
    processedFlightIdRef.current = flightId;

    // Deck was already popped in handleChoice — do NOT pop again here

    // Process through gambling logic if active
    if (isActive() && currentBet > 0) {
      const pushedAllowed = localStorage.getItem("pushed") !== "false";

      const gamblingResult = processResult(
        choice,
        currentCardValue,
        card.numericValue,
        multiplier,
        pushedAllowed,
      );

      // Update stake display
      setGamblingStake(gamblingResult.newStake);

      // Partial loss system: only end game if stake is depleted
      if (gamblingResult.result === "loss" || gamblingResult.result === "tie") {
        if (gamblingResult.newStake < 0.01) {
          // Stake depleted - game over
          setShowCashOut(false);
          setCurrentBet(0);
          setHasLostBet(true);
        }
        // If stake remains, game continues - player can cash out reduced amount
      }
    }

    if (isCorrect) {
      setGrid((prev) => {
        const newGrid = [...prev];
        newGrid[stackIndex] = {
          ...newGrid[stackIndex],
          cards: [...newGrid[stackIndex].cards, card],
        };
        return newGrid;
      });
      setCardsPlaced((prev) => prev + 1);
      // Track cards played for level progression and auto-advance if threshold reached
      setCardsPlayedThisLevel((prev) => {
        const newCount = prev + 1;
        const required = currentLevel === 1 ? 4 : currentLevel === 2 ? 3 : currentLevel === 3 ? 2 : 0;
        if (required > 0 && newCount >= required) {
          // Auto-advance to next level silently
          setCurrentLevel((level) => level + 1);
          return 0;
        }
        return newCount;
      });
    } else {
      setGrid((prev) => {
        const newGrid = [...prev];
        newGrid[stackIndex] = { ...newGrid[stackIndex], locked: true };
        return newGrid;
      });
      setShakingStack(stackIndex);
      setTimeout(() => setShakingStack(null), 300);
    }

    flyingCardRef.current = false;
    setFlyingCard(null);
    setIsProcessing(false);
    processingRef.current = false;

    // If the card landed correctly, recalculate multipliers for the stack
    // so the display updates even if the mouse hasn't moved
    if (isCorrect && hoveredStack === stackIndex) {
      // Use setTimeout to let React commit the new grid state first
      setTimeout(() => {
        setGrid((currentGrid) => {
          setDeck((currentDeck) => {
            if (!currentGrid[stackIndex].locked) {
              const topCard =
                currentGrid[stackIndex].cards[
                  currentGrid[stackIndex].cards.length - 1
                ];
              const remainingValues = currentDeck.map((c) => c.numericValue);
              const higherMult = getMultiplier(
                "higher",
                topCard.numericValue,
                remainingValues,
              );
              const lowerMult = getMultiplier(
                "lower",
                topCard.numericValue,
                remainingValues,
              );
              setMultipliers({ higher: higherMult, lower: lowerMult });
            } else {
              setMultipliers({ higher: null, lower: null });
            }
            return currentDeck;
          });
          return currentGrid;
        });
      }, 60);
    }

    // Check game over after state updates - use functional updates to get latest state
    setTimeout(() => {
      setDeck((currentDeck) => {
        setGrid((currentGrid) => {
          checkGameOver(currentDeck, currentGrid);
          return currentGrid;
        });
        return currentDeck;
      });
    }, 50);
  }, [flyingCard, checkGameOver, currentBet, hoveredStack]);

  // Handle place bet
  const handlePlaceBet = async (amount: number) => {
    if (hasCashedOut || hasLostBet) {
      setShowBettingModal(false);
      return;
    }
    if (amount > 0 && amount <= (wallet ?? 0)) {
      try {
        await placeBetMutation(amount, "Higher-Lower");
        setCurrentBet(amount);
        setShowBettingModal(false);

        // Initialize gambling game with bet amount
        initializeGame(amount);
        setGamblingStake(amount);
        setShowCashOut(true);

        // Reset level progression for new bet
        setCurrentLevel(1);
        setCardsPlayedThisLevel(0);

        initGame();
      } catch (error) {
        console.error("Failed to place bet:", error);
      }
    }
  };

  // Handle cash out
  const handleCashOut = async () => {
    if (isActive()) {
      // Check if player has played enough cards for this level
      if (cardsPlayedThisLevel >= 1 && cardsPlayedThisLevel < cardsRequiredForCashout) {
        alert(`You must play ${cardsRequiredForCashout - cardsPlayedThisLevel} more card${cardsRequiredForCashout - cardsPlayedThisLevel === 1 ? '' : 's'} before you can cash out!`);
        return;
      }

      const payout = cashOut();
      try {
        await cashOutMutation(payout, "Higher-Lower");
        setGamblingStake(0);
        setShowCashOut(false);
        setCurrentBet(0);
        resetGame();
        setHasCashedOut(true);
        setShowBettingModal(false);
        // Advance to next level and reset cards played
        setCurrentLevel((prev) => prev + 1);
        setCardsPlayedThisLevel(0);
      } catch (error) {
        console.error("Failed to cash out:", error);
      }
    }
  };

  // Handle play again
  const handlePlayAgain = () => {
    setShowGameOverModal(false);
    setCurrentBet(0);
    setGamblingStake(0);
    setShowCashOut(false);
    setHasCashedOut(false);
    setHasLostBet(false);
    setCurrentLevel(1);
    setCardsPlayedThisLevel(0);
    resetGame();
    initGame();
  };

  // Handle reset wallet (dev tool)
  const handleResetWallet = async () => {
    try {
      await updateWallet(100, "Dev reset");
      console.log("Wallet reset to $100");
    } catch (error) {
      console.error("Failed to reset wallet:", error);
    }
  };

  // Handle reveal deck
  const handleReveal = () => {
    setShowGameOverModal(false);
    setRevealMode(true);
  };

  const handleRestartAfterCashOut = () => {
    setCurrentBet(0);
    setGamblingStake(0);
    setShowCashOut(false);
    setHasCashedOut(false);
    setHasLostBet(false);
    resetGame();
    initGame();
  };

  const handleForfeitAndRestart = () => {
    // Determine if we need to warn (if there is money at stake)
    const hasActiveBet = isActive() && gamblingStake > 0;

    if (hasActiveBet) {
      setShowForfeitConfirm(true);
      return;
    }

    // No active bet — just restart
    doForfeitRestart();
  };

  const doForfeitRestart = () => {
    setShowForfeitConfirm(false);

    // Reset game and betting state
    setCurrentBet(0);
    setGamblingStake(0);
    setShowCashOut(false);
    setHasCashedOut(false);
    setHasLostBet(false);
    setCurrentLevel(1);
    setCardsPlayedThisLevel(0);

    resetGame(); // Clears utils state
    initGame(); // Reshuffles and deals
  };

  // Calculate progress
  const cardsGone = 43 - deck.length;
  const progressPercentage = Math.round((cardsGone / 43) * 100);
  const progressColor =
    progressPercentage >= 80
      ? "var(--retro-green)"
      : progressPercentage >= 40
        ? "var(--retro-yellow)"
        : "var(--retro-cyan)";

  return (
    <div className="game-container">
      {/* Home Button */}
      <button className="home-btn" onClick={() => navigate("/")}>
        🏠 HOME
      </button>

      {/* Background decoration */}
      <div className="bg-decoration"></div>

      {/* Header */}
      <header className="game-header">
        <h1>Higher or Lower</h1>
        <p className="subtitle">Predict your way through the deck</p>
      </header>

      {/* Gambling Stake Display */}
      {showCashOut && (
        <div className="stake-display">
          <span>Current Stake: ${gamblingStake.toFixed(2)}</span>
          {cardsRequiredForCashout > 0 && (
            <div className="level-progress-container">
              <div className="level-progress-info">
                Level {currentLevel} — {cardsPlayedThisLevel}/{cardsRequiredForCashout}
              </div>
              <div className="level-progress-bar">
                <div
                  className="level-progress-fill"
                  style={{
                    width: `${(cardsPlayedThisLevel / cardsRequiredForCashout) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
          <button
            className="cash-out-btn"
            onClick={handleCashOut}
            disabled={cardsRequiredForCashout > 0 && cardsPlayedThisLevel >= 1 && cardsPlayedThisLevel < cardsRequiredForCashout}
          >
            CASH OUT
          </button>
        </div>
      )}

      {/* Multipliers Display */}
      {showCashOut && (
        <div className="multipliers-display">
          <span className="higher">
            Higher:{" "}
            {multipliers.higher == null
              ? "--"
              : `${multipliers.higher.toFixed(2)}x`}
          </span>
          <span className="lower">
            Lower:{" "}
            {multipliers.lower == null
              ? "--"
              : `${multipliers.lower.toFixed(2)}x`}
          </span>
        </div>
      )}

      {/* Game Stats */}
      <div className="game-stats">
        <div className="stat-item wallet-stat">
          <span className="stat-label">Wallet</span>
          <span className="stat-value">${wallet ?? 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Cards Remaining</span>
          <span className="stat-value">{deck.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Cards Placed</span>
          <span className="stat-value">{cardsPlaced}</span>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="game-area">
        {/* Deck Area */}
        <div className="deck-area">
          <div
            ref={deckRef}
            className={`deck ${deck.length === 0 ? "empty" : ""}`}
          >
            <div className="deck-cards"></div>
          </div>
          <span className="deck-label">Draw Pile</span>
        </div>

        {/* Card Grid or Reveal Mode */}
        {revealMode ? (
          <div
            className="card-grid"
            ref={gridRef}
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            }}
          >
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                color: "var(--retro-cyan)",
                fontFamily: "'Press Start 2P', cursive",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              REMAINING CARDS ({deck.length})
            </div>
            {deck.map((card, i) => (
              <div
                key={`reveal-${i}`}
                className="card-stack"
                style={{ cursor: "default" }}
              >
                <div
                  className="card"
                  style={{
                    opacity: 1,
                    transform: "none",
                    animation: `dealCard 0.3s steps(6) forwards`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-grid" ref={gridRef}>
            {grid.map((stack, index) => (
              <CardStack
                key={index}
                stack={stack}
                index={index}
                onHigher={() => handleChoice(index, "higher")}
                onLower={() => handleChoice(index, "lower")}
                onHover={() => handleHoverStack(index)}
                onLeave={handleLeaveStack}
                dealing={dealing}
                shaking={shakingStack === index}
                disabled={flyingCard !== null}
              />
            ))}
          </div>
        )}

        {/* Vertical Progress Bar */}
        <div className="main-progress-container">
          <div className="main-progress-bar">
            <div
              className="main-progress-fill"
              style={{
                height: `${progressPercentage}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Flying Card Animation */}
      {flyingCard && (
        <FlyingCard
          card={flyingCard.card}
          startPos={flyingCard.startPos}
          endPos={flyingCard.endPos}
          onComplete={handleFlyingCardComplete}
        />
      )}

      {/* Instructions */}
      <Instructions />

      {/* Forfeit / New Game Button - Only visible if game is in progress and not cashed out */}
      {!gameOver && !hasCashedOut && (
        <button className="forfeit-btn" onClick={handleForfeitAndRestart}>
          NEW GAME
        </button>
      )}

      {/* Place Bet / Restart Betting */}
      {!hasCashedOut && !hasLostBet ? (
        <button
          className={`place-bet-btn${showCashOut ? " disabled" : ""}`}
          onClick={() => !showCashOut && setShowBettingModal(true)}
          disabled={showCashOut}
        >
          {showCashOut ? "ACTIVE BET" : "PLACE BET"}
        </button>
      ) : (
        <button className="restart-bet-btn" onClick={handleRestartAfterCashOut}>
          START NEW GAME TO BET
        </button>
      )}

      {/* Dev Tools - Only visible for admins */}
      {user?.isAdmin && (
        <>
          <button
            className="dev-tools-toggle"
            onClick={() => setShowDevPanel(!showDevPanel)}
          >
            🛠️ DEV
          </button>

          {showDevPanel && (
            <div className="dev-tools-panel">
              <button className="dev-btn" onClick={handleResetWallet}>
                💰 Reset Balance ($100)
              </button>
            </div>
          )}
        </>
      )}

      {/* Betting Modal */}
      <BettingModal
        wallet={wallet}
        onPlaceBet={handlePlaceBet}
        onClose={() => setShowBettingModal(false)}
        visible={showBettingModal}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isWin={isWin}
        cardsPlaced={cardsPlaced}
        cardsGone={cardsGone}
        onPlayAgain={handlePlayAgain}
        onClose={() => setShowGameOverModal(false)}
        onReveal={handleReveal}
        visible={showGameOverModal}
      />

      {/* Forfeit Confirm Modal */}
      <ForfeitConfirmModal
        stake={gamblingStake}
        onConfirm={doForfeitRestart}
        onCancel={() => setShowForfeitConfirm(false)}
        visible={showForfeitConfirm}
      />
    </div>
  );
}
