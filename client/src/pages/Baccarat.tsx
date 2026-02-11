import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useAuth } from "../hooks/useAuth";
import { useSound } from "../hooks/useSound";
import { useConfetti } from "../hooks/useConfetti";
import { useAchievements } from "../hooks/useAchievements";
import { useSessionStats } from "../hooks/useSessionStats";

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
          <li>
            Bet on <strong>Player</strong> (1:1), <strong>Banker</strong> (1:1 -
            5% commission), or <strong>Tie</strong> (8:1)
          </li>
          <li>Two cards dealt to Player and Banker hands</li>
          <li>Closest to 9 wins - only last digit counts (15 = 5)</li>
          <li>8 or 9 on first two cards = Natural (game ends immediately)</li>
          <li>Third cards may be drawn based on specific rules</li>
        </ol>
        <p className="note">
          Note: 10s, J, Q, K = 0 | A = 1 | Others = face value. Banker wins
          slightly more often!
        </p>
      </div>
    </div>
  );
}

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

// Card suits and values
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

// Create a shoe with 6 decks (standard for Baccarat)
function createShoe(): Card[] {
  const shoe: Card[] = [];
  // 6 decks
  for (let deck = 0; deck < 6; deck++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        let numericValue: number;
        if (value === "A") {
          numericValue = 1;
        } else if (["10", "J", "Q", "K"].includes(value)) {
          numericValue = 0;
        } else {
          numericValue = parseInt(value);
        }

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

// Fisher-Yates shuffle
function shuffleShoe(shoe: Card[]): Card[] {
  const shuffled = [...shoe];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Calculate Baccarat score (last digit of sum)
function calculateScore(hand: Card[]): number {
  const sum = hand.reduce((acc, card) => acc + card.numericValue, 0);
  return sum % 10;
}

// Deal a card from the shoe
function dealCard(shoe: Card[]): { card: Card; newShoe: Card[] } {
  const card = shoe[0];
  const newShoe = shoe.slice(1);
  return { card, newShoe };
}

// Check if shoe needs reshuffling (75% empty)
function shouldReshuffle(shoe: Card[]): boolean {
  return shoe.length < 78; // 6 decks * 52 cards = 312, 25% = 78
}

export default function Baccarat() {
  const navigate = useNavigate();
  const { wallet, placeBet: placeBetMutation, addWinnings } = useWallet();
  const { user } = useAuth();

  // Fun feature hooks
  const { playSound } = useSound();
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

  // Game state
  const [shoe, setShoe] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [bankerHand, setBankerHand] = useState<Card[]>([]);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("betting");
  const [winner, setWinner] = useState<"player" | "banker" | "tie" | null>(
    null,
  );
  const [, setWinnings] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [isDealing, setIsDealing] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

  // Initialize shoe on mount
  useEffect(() => {
    setShoe(createShoe());
  }, []);

  // Handle reshuffle if needed
  const checkReshuffle = useCallback((currentShoe: Card[]) => {
    if (shouldReshuffle(currentShoe)) {
      setMessage("Reshuffling shoe...");
      return createShoe();
    }
    return currentShoe;
  }, []);

  // Place bet and start game
  const handlePlaceBet = async () => {
    if (!selectedBet || betAmount <= 0 || betAmount > (wallet ?? 0)) {
      setMessage("Please select a bet type and valid amount");
      return;
    }

    try {
      await placeBetMutation(betAmount, "Baccarat");
      setGamePhase("dealing");
      setIsDealing(true);
      setMessage("");

      // Play sound and check achievement
      playSound("chip");
      if (betAmount >= 100) {
        unlockAchievement("high_roller");
      }

      // Check for reshuffle
      let currentShoe = checkReshuffle(shoe);

      // Deal initial cards with animation delay
      setTimeout(() => {
        playSound("deal");
        dealInitialCards(currentShoe);
      }, 500);
    } catch (error) {
      setMessage("Failed to place bet");
    }
  };

  // Deal initial 2 cards to each hand
  const dealInitialCards = (currentShoe: Card[]) => {
    let newShoe = [...currentShoe];

    // Deal alternately: Player, Banker, Player, Banker
    const { card: p1, newShoe: s1 } = dealCard(newShoe);
    const { card: b1, newShoe: s2 } = dealCard(s1);
    const { card: p2, newShoe: s3 } = dealCard(s2);
    const { card: b2, newShoe: s4 } = dealCard(s3);

    setPlayerHand([p1, p2]);
    setBankerHand([b1, b2]);
    setShoe(s4);

    // Check for naturals after a delay
    setTimeout(() => checkNaturals([p1, p2], [b1, b2], s4), 1000);
  };

  // Check for naturals (8 or 9)
  const checkNaturals = (pHand: Card[], bHand: Card[], currentShoe: Card[]) => {
    const playerScore = calculateScore(pHand);
    const bankerScore = calculateScore(bHand);

    if (playerScore >= 8 || bankerScore >= 8) {
      // Natural - game ends
      setMessage("Natural!");
      setTimeout(() => determineWinner(pHand, bHand, currentShoe), 1000);
    } else {
      // No natural - proceed to third card rules
      setGamePhase("playerThird");
      setTimeout(() => handlePlayerThirdCard(pHand, bHand, currentShoe), 1000);
    }
  };

  // Player third card rule
  const handlePlayerThirdCard = (
    pHand: Card[],
    bHand: Card[],
    currentShoe: Card[],
  ) => {
    const playerScore = calculateScore(pHand);

    if (playerScore <= 5) {
      // Player draws
      const { card: newCard, newShoe } = dealCard(currentShoe);
      const newPlayerHand = [...pHand, newCard];
      setPlayerHand(newPlayerHand);
      setShoe(newShoe);

      // Now handle banker third card
      setGamePhase("bankerThird");
      setTimeout(
        () =>
          handleBankerThirdCard(
            newPlayerHand,
            bHand,
            newShoe,
            newCard.numericValue,
          ),
        1000,
      );
    } else {
      // Player stands (6 or 7)
      // Banker draws if 5 or less
      setGamePhase("bankerThird");
      setTimeout(
        () => handleBankerThirdCard(pHand, bHand, currentShoe, null),
        1000,
      );
    }
  };

  // Banker third card rule (complex)
  const handleBankerThirdCard = (
    pHand: Card[],
    bHand: Card[],
    currentShoe: Card[],
    playerThirdCard: number | null,
  ) => {
    const bankerScore = calculateScore(bHand);
    let shouldDraw = false;

    if (playerThirdCard === null) {
      // Player stood - Banker draws on 0-5, stands on 6-7
      shouldDraw = bankerScore <= 5;
    } else {
      // Player drew - complex rules based on player's third card
      if (bankerScore <= 2) {
        shouldDraw = true;
      } else if (bankerScore === 3) {
        shouldDraw = playerThirdCard !== 8;
      } else if (bankerScore === 4) {
        shouldDraw = playerThirdCard >= 2 && playerThirdCard <= 7;
      } else if (bankerScore === 5) {
        shouldDraw = playerThirdCard >= 4 && playerThirdCard <= 7;
      } else if (bankerScore === 6) {
        shouldDraw = playerThirdCard === 6 || playerThirdCard === 7;
      }
      // Banker score 7 always stands
    }

    if (shouldDraw) {
      const { card: newCard, newShoe } = dealCard(currentShoe);
      const newBankerHand = [...bHand, newCard];
      setBankerHand(newBankerHand);
      setShoe(newShoe);
      setTimeout(() => determineWinner(pHand, newBankerHand, newShoe), 1000);
    } else {
      setTimeout(() => determineWinner(pHand, bHand, currentShoe), 1000);
    }
  };

  // Determine winner and handle payouts
  const determineWinner = async (
    pHand: Card[],
    bHand: Card[],
    currentShoe: Card[],
  ) => {
    const playerScore = calculateScore(pHand);
    const bankerScore = calculateScore(bHand);

    let gameWinner: "player" | "banker" | "tie";
    let winAmount = 0;

    if (playerScore > bankerScore) {
      gameWinner = "player";
    } else if (bankerScore > playerScore) {
      gameWinner = "banker";
    } else {
      gameWinner = "tie";
    }

    setWinner(gameWinner);
    setGamePhase("complete");

    // Calculate payout
    if (selectedBet === gameWinner) {
      if (gameWinner === "player") {
        // Player bet pays 1:1
        winAmount = betAmount * 2; // Original bet + winnings
        setMessage(`Player wins! You won $${betAmount.toFixed(2)}`);
      } else if (gameWinner === "banker") {
        // Banker bet pays 1:1 minus 5% commission
        const commission = betAmount * 0.05;
        winAmount = betAmount * 2 - commission; // Original bet + winnings minus commission
        setMessage(
          `Banker wins! You won $${(betAmount - commission).toFixed(2)} (5% commission)`,
        );
        incrementBankerWins();
      } else {
        // Tie pays 8:1
        winAmount = betAmount * 9; // Original bet + 8x winnings
        setMessage(`Tie! You won $${(betAmount * 8).toFixed(2)} (8:1 payout)`);
        incrementTieWins();
      }

      setWinnings(winAmount);

      // Fun features on win
      playSound("win");
      const intensity = gameWinner === "tie" ? "high" : "medium";
      triggerConfetti({ intensity });
      incrementWinStreak();
      incrementSessionWins();
      recordBet("baccarat", betAmount, "win");

      try {
        await addWinnings(winAmount, "Baccarat");
      } catch (error) {
        console.error("Failed to add winnings:", error);
      }
    } else {
      setMessage(
        `${gameWinner.charAt(0).toUpperCase() + gameWinner.slice(1)} wins. You lost $${betAmount.toFixed(2)}`,
      );
      setWinnings(0);

      // Fun features on loss
      playSound("lose");
      resetWinStreak();
      recordBet("baccarat", betAmount, "loss");
    }

    setIsDealing(false);

    // Check if reshuffle needed
    if (shouldReshuffle(currentShoe)) {
      setTimeout(() => {
        setShoe(createShoe());
        setMessage("Shoe reshuffled");
      }, 2000);
    }
  };

  // Reset game for next round
  const handleNextRound = () => {
    setPlayerHand([]);
    setBankerHand([]);
    setSelectedBet(null);
    setGamePhase("betting");
    setWinner(null);
    setWinnings(0);
    setMessage("");
  };

  // Format card for display
  const formatCard = (card: Card) => {
    return (
      <div className={`baccarat-card ${card.isRed ? "red" : "black"}`}>
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
    );
  };

  const playerScore = calculateScore(playerHand);
  const bankerScore = calculateScore(bankerHand);

  return (
    <div className="game-container baccarat-game">
      <div className="bg-decoration" />
      <button className="home-btn" onClick={() => navigate("/")}>
        🏠 HOME
      </button>

      {/* Header */}
      <header className="game-header">
        <h1>Baccarat</h1>
        <p className="subtitle">Bet on Player, Banker, or Tie</p>
      </header>

      {/* Stats */}
      <div className="game-stats">
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
          <span className="stat-label">Shoe</span>
          <span className="stat-value">{shoe.length}</span>
        </div>
      </div>

      {/* Hands side by side */}
      <div className="baccarat-hands-row">
        <section
          className={`baccarat-hand ${winner === "banker" ? "winner" : ""}`}
        >
          <h2 className="baccarat-hand-label">Banker</h2>
          <div className="baccarat-cards-row">
            {bankerHand.length === 0 ? (
              <>
                <div className="baccarat-card-placeholder" />
                <div className="baccarat-card-placeholder" />
              </>
            ) : (
              bankerHand.map((card, i) => (
                <div key={`banker-${i}`} className="baccarat-card-wrap">
                  {formatCard(card)}
                </div>
              ))
            )}
          </div>
          {bankerHand.length > 0 && (
            <div className="baccarat-score">{bankerScore}</div>
          )}
        </section>

        <div className="baccarat-vs">VS</div>

        <section
          className={`baccarat-hand ${winner === "player" ? "winner" : ""}`}
        >
          <h2 className="baccarat-hand-label">Player</h2>
          <div className="baccarat-cards-row">
            {playerHand.length === 0 ? (
              <>
                <div className="baccarat-card-placeholder" />
                <div className="baccarat-card-placeholder" />
              </>
            ) : (
              playerHand.map((card, i) => (
                <div key={`player-${i}`} className="baccarat-card-wrap">
                  {formatCard(card)}
                </div>
              ))
            )}
          </div>
          {playerHand.length > 0 && (
            <div className="baccarat-score">{playerScore}</div>
          )}
        </section>
      </div>

      {/* Center message / dealing / next round */}
      {message && <div className="baccarat-message">{message}</div>}
      {isDealing && <div className="baccarat-dealing">Dealing…</div>}
      {gamePhase === "complete" && (
        <button
          type="button"
          className="baccarat-next-btn"
          onClick={handleNextRound}
        >
          Next Round
        </button>
      )}

      {/* Betting controls */}
      {gamePhase === "betting" && (
        <div className="baccarat-bet-controls">
          <div className="baccarat-bet-types">
            <button
              className={`baccarat-bet-btn player ${selectedBet === "player" ? "selected" : ""}`}
              onClick={() => setSelectedBet("player")}
            >
              <span className="baccarat-bet-name">Player</span>
              <span className="baccarat-bet-odds">1:1</span>
            </button>
            <button
              className={`baccarat-bet-btn tie ${selectedBet === "tie" ? "selected" : ""}`}
              onClick={() => setSelectedBet("tie")}
            >
              <span className="baccarat-bet-name">Tie</span>
              <span className="baccarat-bet-odds">8:1</span>
            </button>
            <button
              className={`baccarat-bet-btn banker ${selectedBet === "banker" ? "selected" : ""}`}
              onClick={() => setSelectedBet("banker")}
            >
              <span className="baccarat-bet-name">Banker</span>
              <span className="baccarat-bet-odds">1:1 (-5%)</span>
            </button>
          </div>
          <div className="baccarat-amount-row">
            <input
              type="range"
              min="1"
              max={Math.max(1, wallet ?? 100)}
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value) || 1)}
              className="baccarat-slider"
            />
            <span className="baccarat-amount-display">${betAmount}</span>
          </div>
          <div className="baccarat-quick-bets">
            <button type="button" onClick={() => setBetAmount(10)}>
              $10
            </button>
            <button type="button" onClick={() => setBetAmount(50)}>
              $50
            </button>
            <button type="button" onClick={() => setBetAmount(100)}>
              $100
            </button>
            <button type="button" onClick={() => setBetAmount(wallet ?? 0)}>
              MAX
            </button>
          </div>
          <button
            className="baccarat-deal-btn"
            onClick={handlePlaceBet}
            disabled={
              !selectedBet || betAmount <= 0 || betAmount > (wallet ?? 0)
            }
          >
            DEAL
          </button>
        </div>
      )}

      <Instructions />

      {/* Dev Tools - Only visible for admins */}
      {user?.isAdmin && (
        <>
          <button
            className="dev-tools-toggle"
            onClick={() => setShowDevPanel(!showDevPanel)}
          >
            DEV
          </button>

          {showDevPanel && (
            <div className="dev-tools-panel">
              <div className="dev-info">
                <p>Player Score: {playerScore}</p>
                <p>Banker Score: {bankerScore}</p>
                <p>Cards in Shoe: {shoe.length}</p>
                <p>Game Phase: {gamePhase}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
