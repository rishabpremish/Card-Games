import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Types
interface Card {
  suit: string;
  rank: string;
  value: number;
}

interface PlayerHand {
  cards: Card[];
  bet: number;
  status: 'playing' | 'stood' | 'bust' | 'blackjack';
}

// Constants
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Create deck
function createDeck(): Card[] {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      let value = parseInt(rank);
      if (['J', 'Q', 'K'].includes(rank)) value = 10;
      if (rank === 'A') value = 11;
      deck.push({ suit, rank, value });
    });
  });
  return deck;
}

// Shuffle deck
function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Calculate score
function calculateScore(cards: Card[]): number {
  let score = 0;
  let aces = 0;
  
  cards.forEach(card => {
    score += card.value;
    if (card.rank === 'A') aces++;
  });

  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

// Get suit symbol
function getSuitSymbol(suit: string): string {
  switch(suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    default: return '';
  }
}

// Card Component
function BJCard({ card, hidden = false }: { card: Card; hidden?: boolean }) {
  const isRed = ['hearts', 'diamonds'].includes(card.suit);
  
  return (
    <div className={`bj-card ${hidden ? 'hidden' : ''}`}>
      <div className={`card-front ${isRed ? 'red' : 'black'}`}>
        <div className="card-corner top">
          <span className="card-value">{card.rank}</span>
          <span className="card-suit-small">{getSuitSymbol(card.suit)}</span>
        </div>
        <div className="card-center">{getSuitSymbol(card.suit)}</div>
        <div className="card-corner bottom">
          <span className="card-value">{card.rank}</span>
          <span className="card-suit-small">{getSuitSymbol(card.suit)}</span>
        </div>
      </div>
      <div className="card-back"></div>
    </div>
  );
}

// Chip Component
function Chip({ value, onClick, disabled = false }: { value: number | string; onClick: () => void; disabled?: boolean }) {
  const valueClass = value === 'ALL' ? 'c-max' : `c-${value}`;
  return (
    <div 
      className={`chip ${valueClass} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      {value}
    </div>
  );
}

// Game Over Modal
function GameOverModal({ 
  message, 
  type, 
  onNewHand, 
  visible 
}: { 
  message: string; 
  type: 'win' | 'bad' | 'neutral';
  onNewHand: () => void;
  visible: boolean;
}) {
  const getColor = () => {
    switch(type) {
      case 'win': return 'var(--retro-green)';
      case 'bad': return 'var(--retro-red)';
      default: return 'var(--retro-yellow)';
    }
  };

  return (
    <div className={`modal-overlay ${visible ? 'visible' : ''}`}>
      <div className="modal">
        <div className="modal-icon">{type === 'win' ? '🎉' : type === 'bad' ? '😔' : '🤝'}</div>
        <h2 style={{ color: getColor() }}>{message}</h2>
        <div className="modal-buttons">
          <button className="play-again-btn" onClick={onNewHand}>New Hand</button>
        </div>
      </div>
    </div>
  );
}

// Main Game Component
export default function Blackjack() {
  const navigate = useNavigate();
  
  // Game state
  const [deck, setDeck] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [playerHands, setPlayerHands] = useState<PlayerHand[]>([]);
  const [currentHandIndex, setCurrentHandIndex] = useState(0);
  const [gameState, setGameState] = useState<'BETTING' | 'PLAYING' | 'DEALER_TURN' | 'GAME_OVER'>('BETTING');
  const [currentBet, setCurrentBet] = useState(0);
  const [baseBet, setBaseBet] = useState(0);
  const [betHistory, setBetHistory] = useState<number[]>([]); // Track individual bets for undo
  const [message, setMessage] = useState({ text: '', type: 'neutral' as 'win' | 'bad' | 'neutral' });
  const [showMessage, setShowMessage] = useState(false);
  
  // Wallet state
  const [wallet, setWallet] = useState(() => {
    const saved = localStorage.getItem('gameWallet');
    return saved ? parseInt(saved) : 1000;
  });

  // Save wallet to localStorage
  useEffect(() => {
    localStorage.setItem('gameWallet', wallet.toString());
  }, [wallet]);

  // Initialize new deck
  const initDeck = useCallback(() => {
    setDeck(shuffleDeck(createDeck()));
  }, []);

  // Start new hand
  const resetGame = useCallback(() => {
    setGameState('BETTING');
    setDealerHand([]);
    setPlayerHands([]);
    setCurrentHandIndex(0);
    setCurrentBet(0);
    setBaseBet(0);
    setBetHistory([]);
    setShowMessage(false);
    initDeck();
  }, [initDeck]);

  // Initialize on mount
  useEffect(() => {
    initDeck();
  }, [initDeck]);

  // Place bet
  const placeBet = useCallback((amount: number) => {
    if (gameState !== 'BETTING') return;
    if (wallet >= amount) {
      setWallet(prev => prev - amount);
      setCurrentBet(prev => prev + amount);
      setBaseBet(prev => prev + amount);
      setBetHistory(prev => [...prev, amount]);
    }
  }, [gameState, wallet]);

  // Clear bet
  const clearBet = useCallback(() => {
    if (gameState !== 'BETTING') return;
    setWallet(prev => prev + currentBet);
    setCurrentBet(0);
    setBaseBet(0);
    setBetHistory([]);
  }, [gameState, currentBet]);

  // Undo last bet
  const undoBet = useCallback(() => {
    if (gameState !== 'BETTING' || betHistory.length === 0) return;
    const lastBet = betHistory[betHistory.length - 1];
    setWallet(prev => prev + lastBet);
    setCurrentBet(prev => prev - lastBet);
    setBaseBet(prev => prev - lastBet);
    setBetHistory(prev => prev.slice(0, -1));
  }, [gameState, betHistory]);

  // Deal initial cards
  const dealInitial = useCallback(() => {
    if (currentBet === 0) return;
    
    const newDeck = shuffleDeck(createDeck());
    
    const hand: PlayerHand = {
      cards: [newDeck.pop()!, newDeck.pop()!],
      bet: baseBet || currentBet,
      status: 'playing'
    };
    
    const dHand = [newDeck.pop()!, newDeck.pop()!];
    
    setDeck(newDeck);
    setPlayerHands([hand]);
    setDealerHand(dHand);
    setGameState('PLAYING');
    setCurrentHandIndex(0);

    // Check for blackjack
    const pScore = calculateScore(hand.cards);
    if (pScore === 21) {
      setPlayerHands([{ ...hand, status: 'blackjack' }]);
      handleGameOver();
    }
  }, [currentBet, baseBet]);

  // Hit
  const hit = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    
    const currentHand = playerHands[currentHandIndex];
    if (!currentHand) return;

    const newCard = deck[deck.length - 1];
    const newDeck = deck.slice(0, -1);
    const newCards = [...currentHand.cards, newCard];
    const score = calculateScore(newCards);
    
    setDeck(newDeck);
    
    if (score > 21) {
      setPlayerHands(prev => {
        const updated = [...prev];
        updated[currentHandIndex] = { ...currentHand, cards: newCards, status: 'bust' };
        return updated;
      });
      setMessage({ text: 'BUST!', type: 'bad' });
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 1000);
      advanceHand();
    } else if (score === 21) {
      setPlayerHands(prev => {
        const updated = [...prev];
        updated[currentHandIndex] = { ...currentHand, cards: newCards, status: 'stood' };
        return updated;
      });
      stand();
    } else {
      setPlayerHands(prev => {
        const updated = [...prev];
        updated[currentHandIndex] = { ...currentHand, cards: newCards, status: 'playing' };
        return updated;
      });
    }
  }, [gameState, playerHands, currentHandIndex, deck]);

  // Stand
  const stand = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    
    const currentHand = playerHands[currentHandIndex];
    if (!currentHand || currentHand.status !== 'playing') return;

    setPlayerHands(prev => {
      const updated = [...prev];
      updated[currentHandIndex] = { ...currentHand, status: 'stood' };
      return updated;
    });
    
    advanceHand();
  }, [gameState, playerHands, currentHandIndex]);

  // Advance to next hand or dealer
  const advanceHand = useCallback(() => {
    if (currentHandIndex < playerHands.length - 1) {
      setCurrentHandIndex(prev => prev + 1);
    } else {
      setGameState('DEALER_TURN');
      setTimeout(() => dealerPlay(), 800);
    }
  }, [currentHandIndex, playerHands.length]);

  // Double down
  const doubleDown = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    
    const currentHand = playerHands[currentHandIndex];
    if (!currentHand || currentHand.cards.length !== 2) return;
    if (wallet < currentHand.bet) return;

    setWallet(prev => prev - currentHand.bet);
    setCurrentBet(prev => prev + currentHand.bet);
    
    const newCard = deck[deck.length - 1];
    const newDeck = deck.slice(0, -1);
    const newCards = [...currentHand.cards, newCard];
    const score = calculateScore(newCards);
    
    setDeck(newDeck);
    
    if (score > 21) {
      setPlayerHands(prev => {
        const updated = [...prev];
        updated[currentHandIndex] = { ...currentHand, cards: newCards, bet: currentHand.bet * 2, status: 'bust' };
        return updated;
      });
      setMessage({ text: 'BUST!', type: 'bad' });
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 1000);
    } else {
      setPlayerHands(prev => {
        const updated = [...prev];
        updated[currentHandIndex] = { ...currentHand, cards: newCards, bet: currentHand.bet * 2, status: 'stood' };
        return updated;
      });
    }
    
    advanceHand();
  }, [gameState, playerHands, currentHandIndex, deck, wallet]);

  // Split
  const split = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    if (playerHands.length >= 2) return;
    
    const currentHand = playerHands[currentHandIndex];
    if (!currentHand || currentHand.cards.length !== 2) return;
    
    const c1 = currentHand.cards[0];
    const c2 = currentHand.cards[1];
    const canSplit = (c1.rank === c2.rank) || (c1.value === 10 && c2.value === 10);
    
    if (!canSplit) return;
    if (wallet < currentHand.bet) return;

    setWallet(prev => prev - currentHand.bet);
    setCurrentBet(prev => prev + currentHand.bet);

    const newCard1 = deck[deck.length - 1];
    const newCard2 = deck[deck.length - 2];
    const newDeck = deck.slice(0, -2);

    const hand1: PlayerHand = {
      cards: [c1, newCard1],
      bet: currentHand.bet,
      status: 'playing'
    };
    
    const hand2: PlayerHand = {
      cards: [c2, newCard2],
      bet: currentHand.bet,
      status: 'playing'
    };

    setDeck(newDeck);
    setPlayerHands([hand1, hand2]);
  }, [gameState, playerHands, currentHandIndex, deck, wallet]);

  // Dealer logic - using refs to avoid stale closure issues
  const dealerHandRef = useRef(dealerHand);
  const deckRef = useRef(deck);
  
  useEffect(() => {
    dealerHandRef.current = dealerHand;
  }, [dealerHand]);
  
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  const dealerPlay = useCallback(() => {
    const allBusted = playerHands.every(h => h.status === 'bust');
    
    if (allBusted) {
      handleGameOver();
      return;
    }

    const currentHand = dealerHandRef.current;
    const currentDeck = deckRef.current;
    const score = calculateScore(currentHand);
    
    if (score < 17 && currentDeck.length > 0) {
      const newCard = currentDeck[currentDeck.length - 1];
      const newHand = [...currentHand, newCard];
      const newDeck = currentDeck.slice(0, -1);
      
      setDealerHand(newHand);
      setDeck(newDeck);
      dealerHandRef.current = newHand;
      deckRef.current = newDeck;
      
      // Check again after state updates
      const newScore = calculateScore(newHand);
      if (newScore < 17) {
        setTimeout(() => dealerPlay(), 800);
      } else {
        setTimeout(() => handleGameOver(), 800);
      }
    } else {
      handleGameOver();
    }
  }, [playerHands, handleGameOver]);

  // Handle game over
  const handleGameOver = useCallback(() => {
    setGameState('GAME_OVER');

    const dScore = calculateScore(dealerHand);
    let totalWin = 0;
    let anyWin = false;
    let anyPush = false;

    playerHands.forEach(hand => {
      if (hand.status === 'bust') return;

      const pScore = calculateScore(hand.cards);
      let win = 0;

      if (dScore > 21) {
        win = hand.bet * 2;
      } else if (pScore > dScore) {
        win = hand.bet * 2;
      } else if (pScore === dScore) {
        win = hand.bet;
        anyPush = true;
      }

      if (win > hand.bet) anyWin = true;
      totalWin += win;
    });

    setWallet(prev => prev + totalWin);

    let msgText = '';
    let msgType: 'win' | 'bad' | 'neutral' = 'neutral';

    if (totalWin === 0) {
      msgText = 'DEALER WINS';
      msgType = 'bad';
    } else if (anyWin) {
      msgText = 'YOU WIN!';
      msgType = 'win';
    } else if (anyPush) {
      msgText = 'PUSH';
      msgType = 'neutral';
    }

    setMessage({ text: msgText, type: msgType });
  }, [dealerHand, playerHands]);

  // Bankruptcy check
  useEffect(() => {
    if (wallet < 10 && currentBet === 0 && gameState === 'BETTING') {
      const timer = setTimeout(() => {
        setWallet(500);
        setMessage({ text: 'Bankrupt! +$500 Gift', type: 'win' });
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 2000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [wallet, currentBet, gameState]);

  // Can split check
  const canSplit = playerHands.length === 1 && 
    playerHands[0]?.cards.length === 2 && 
    playerHands[0]?.status === 'playing' &&
    ((playerHands[0].cards[0].rank === playerHands[0].cards[1].rank) || 
     (playerHands[0].cards[0].value === 10 && playerHands[0].cards[1].value === 10)) &&
    wallet >= playerHands[0].bet;

  // Can double check
  const canDouble = gameState === 'PLAYING' && 
    playerHands[currentHandIndex]?.cards.length === 2 &&
    wallet >= (playerHands[currentHandIndex]?.bet || 0);

  const dealerScore = gameState === 'PLAYING' ? '?' : calculateScore(dealerHand);
  const playerScore = playerHands[currentHandIndex] ? calculateScore(playerHands[currentHandIndex].cards) : 0;

  return (
    <div className="game-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '10px' }}>
      {/* Home Button */}
      <button className="home-btn" onClick={() => navigate('/')}>
        🏠 HOME
      </button>

      {/* Background decoration */}
      <div className="bg-decoration"></div>

      {/* Header */}
      <header className="game-header" style={{ marginBottom: '10px', flexShrink: 0 }}>
        <h1>BLACKJACK</h1>
        <p className="subtitle">Pixel Casino</p>
      </header>

      {/* Game Stats */}
      <div className="game-stats" style={{ marginBottom: '10px', flexShrink: 0 }}>
        <div className="stat-item wallet-stat">
          <span className="stat-label">Wallet</span>
          <span className="stat-value">${wallet}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Current Bet</span>
          <span className="stat-value">${currentBet}</span>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="bj-game-area" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1, width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '10px 0', overflow: 'hidden' }}>
        
        {/* Dealer Area */}
        <div className="dealer-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minHeight: '150px', flexShrink: 0 }}>
          <div className="hand-label">Dealer</div>
          <div className="hand-score">{dealerScore}</div>
          <div className="hand-container" style={{ display: 'flex', justifyContent: 'center', gap: '-30px', margin: '5px 0', minWidth: '120px', minHeight: '120px' }}>
            {dealerHand.map((card, i) => (
              <BJCard key={`dealer-${i}`} card={card} hidden={gameState === 'PLAYING' && i === 1} />
            ))}
          </div>
        </div>

        {/* Center Table */}
        <div className="table-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: '10px', minHeight: '100px' }}>
          <div className={`message-overlay ${showMessage ? 'visible' : ''}`} style={{ opacity: showMessage ? 1 : 0 }}>
            <div className="big-text" style={{ color: message.type === 'win' ? 'var(--retro-green)' : message.type === 'bad' ? 'var(--retro-red)' : 'var(--retro-yellow)' }}>
              {message.text}
            </div>
          </div>
          
          <div className="deck-shoe" title="Deck Shoe" style={{ width: '90px', height: '126px', background: 'var(--bg-card)', border: '4px solid var(--retro-purple)', position: 'relative', boxShadow: '6px 6px 0 rgba(0,0,0,0.5)' }}></div>
        </div>

        {/* Player Area */}
        <div className="player-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minHeight: '180px', flexShrink: 0, justifyContent: 'flex-end' }}>
          
          {/* Player Hands */}
          {playerHands.length === 0 ? (
            <div className="hand-container" style={{ display: 'flex', justifyContent: 'center', gap: '-30px', margin: '5px 0', minWidth: '120px', minHeight: '120px' }}></div>
          ) : playerHands.length === 1 ? (
            <div className="hand-container" style={{ display: 'flex', justifyContent: 'center', gap: '-30px', margin: '5px 0', minWidth: '120px', minHeight: '120px' }}>
              {playerHands[0].cards.map((card, i) => (
                <BJCard key={`player-${i}`} card={card} />
              ))}
            </div>
          ) : (
            <div className="split-wrapper" style={{ display: 'flex', gap: '20px', justifyContent: 'center', width: '100%' }}>
              {playerHands.map((hand, idx) => (
                <div key={`hand-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div 
                    className={`hand-container ${idx === currentHandIndex && gameState === 'PLAYING' ? 'active-hand' : 'inactive-hand'}`}
                    style={{ display: 'flex', justifyContent: 'center', gap: '-30px', margin: '5px 0', minWidth: '100px', minHeight: '100px' }}
                  >
                    {hand.cards.map((card, i) => (
                      <BJCard key={`split-${idx}-${i}`} card={card} />
                    ))}
                  </div>
                  <div className="hand-score">{calculateScore(hand.cards)}</div>
                </div>
              ))}
            </div>
          )}
          
          {playerHands.length === 1 && (
            <div className="hand-score">{playerScore}</div>
          )}
          <div className="hand-label">Player</div>

          {/* Controls */}
          <div className="control-panel" style={{ marginTop: '10px' }}>
            
            {/* Betting Phase Controls */}
            {gameState === 'BETTING' && (
              <div className="betting-controls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="chip-rack" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <Chip value={10} onClick={() => placeBet(10)} disabled={wallet < 10} />
                  <Chip value={50} onClick={() => placeBet(50)} disabled={wallet < 50} />
                  <Chip value={100} onClick={() => placeBet(100)} disabled={wallet < 100} />
                  <Chip value={500} onClick={() => placeBet(500)} disabled={wallet < 500} />
                  <Chip value="ALL" onClick={() => placeBet(wallet)} disabled={wallet === 0} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="action-btn" 
                    onClick={clearBet}
                    style={{ borderColor: '#888', color: '#aaa' }}
                  >
                    Clear
                  </button>
                  <button 
                    className="action-btn btn-hit" 
                    onClick={dealInitial}
                    disabled={currentBet === 0}
                  >
                    DEAL
                  </button>
                </div>
              </div>
            )}

            {/* Playing Phase Controls */}
            {gameState === 'PLAYING' && (
              <div className="action-controls" style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button className="action-btn btn-hit" onClick={hit}>HIT</button>
                <button className="action-btn btn-stand" onClick={stand}>STAND</button>
                <button 
                  className="action-btn btn-double" 
                  onClick={doubleDown}
                  disabled={!canDouble}
                >
                  DOUBLE
                </button>
                {canSplit && (
                  <button className="action-btn btn-split" onClick={split}>SPLIT</button>
                )}
              </div>
            )}

            {/* Game Over Controls */}
            {gameState === 'GAME_OVER' && (
              <div className="action-controls" style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button className="action-btn btn-hit" onClick={resetGame}>New Hand</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      <GameOverModal
        message={message.text}
        type={message.type}
        onNewHand={resetGame}
        visible={gameState === 'GAME_OVER'}
      />

      {/* Settings Button */}
      <button className="settings-hint">Settings</button>

      {/* Inject Blackjack Styles */}
      <style>{`
        .bj-game-area {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex-grow: 1;
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          position: relative;
          padding: 10px 0;
          overflow: hidden;
        }

        .dealer-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          min-height: 150px;
          flex-shrink: 0;
        }

        .player-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          min-height: 180px;
          flex-shrink: 0;
          justify-content: flex-end;
        }

        .table-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-grow: 1;
          gap: 10px;
          min-height: 100px;
        }

        .hand-container {
          display: flex;
          justify-content: center;
          gap: -30px;
          margin: 5px 0;
          min-width: 120px;
          min-height: 120px;
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
          gap: 20px;
          justify-content: center;
          width: 100%;
        }

        .hand-score {
          background: var(--bg-secondary);
          border: 2px solid var(--retro-cyan);
          color: var(--retro-yellow);
          font-family: 'Press Start 2P';
          font-size: 0.8rem;
          padding: 3px 8px;
          margin-top: 2px;
          text-shadow: 2px 2px 0 #000;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
          z-index: 10;
        }

        .hand-label {
          font-family: 'Press Start 2P';
          color: var(--text-secondary);
          font-size: 0.7rem;
          margin-top: 10px;
          margin-bottom: 2px;
          text-transform: uppercase;
        }

        .bj-card {
          width: 90px;
          height: 126px;
          position: relative;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          margin-left: -40px;
          transform-origin: center bottom;
        }

        .bj-card .card-front {
          width: 100%;
          height: 100%;
          background-color: var(--card-white);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 6px;
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
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
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

        .bj-card:first-child {
          margin-left: 0;
        }

        .bj-card:hover {
          transform: translateY(-10px) rotate(2deg);
          z-index: 50;
        }

        .bj-card.hidden .card-front {
          display: none;
        }

        .bj-card.hidden .card-back {
          transform: rotateY(0deg);
        }

        .chip-rack {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
          perspective: 500px;
        }

        .chip {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 4px dashed rgba(255,255,255,0.4);
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: 'Press Start 2P';
          font-size: 0.6rem;
          color: white;
          cursor: pointer;
          box-shadow: 0 5px 0 rgba(0,0,0,0.5);
          transition: transform 0.1s, margin-top 0.1s;
          user-select: none;
          text-shadow: 1px 1px 0 #000;
          position: relative;
        }

        .chip.c-10 { background: var(--retro-blue); border-color: #88ccff; }
        .chip.c-50 { background: var(--retro-red); border-color: #ff8888; }
        .chip.c-100 { background: var(--retro-green); border-color: #88ff88; }
        .chip.c-500 { background: var(--retro-purple); border-color: #dcb3ff; }
        .chip.c-max { background: var(--retro-yellow); color: black; text-shadow: none; border-color: #ffffaa; }

        .chip::before {
          content: '';
          position: absolute;
          top: 5px; left: 5px; right: 5px; bottom: 5px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.2);
        }

        .chip:hover {
          transform: translateY(-5px);
        }

        .chip:active {
          transform: translateY(0);
          box-shadow: 0 2px 0 rgba(0,0,0,0.5);
        }

        .chip.disabled {
          filter: grayscale(1) brightness(0.5);
          cursor: not-allowed;
          pointer-events: none;
        }

        .action-controls {
          display: flex;
          gap: 15px;
          margin-top: 10px;
        }

        .action-btn {
          font-family: 'Press Start 2P';
          font-size: 0.7rem;
          padding: 12px 20px;
          border: 4px solid;
          background: var(--bg-secondary);
          color: white;
          cursor: pointer;
          text-transform: uppercase;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
          transition: transform 0.1s;
        }

        .action-btn:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 rgba(0,0,0,0.5); }
        .action-btn:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 rgba(0,0,0,0.5); }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(0.5); }

        .btn-hit { border-color: var(--retro-green); color: var(--retro-green); }
        .btn-hit:hover:not(:disabled) { background: var(--retro-green); color: black; }

        .btn-stand { border-color: var(--retro-red); color: var(--retro-red); }
        .btn-stand:hover:not(:disabled) { background: var(--retro-red); color: white; }

        .btn-double { border-color: var(--retro-yellow); color: var(--retro-yellow); }
        .btn-double:hover:not(:disabled) { background: var(--retro-yellow); color: black; }

        .btn-split { border-color: var(--retro-cyan); color: var(--retro-cyan); }
        .btn-split:hover:not(:disabled) { background: var(--retro-cyan); color: black; }

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
          font-size: 2.5rem;
          text-shadow: 4px 4px 0 #000, -2px -2px 0 var(--retro-magenta);
          white-space: nowrap;
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes popIn {
          0% { transform: scale(0); }
          80% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .deck-shoe::before {
          content: '';
          position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px;
          border: 2px dashed var(--retro-purple);
          opacity: 0.5;
        }

        @media (max-height: 700px) {
          .bj-card { width: 70px; height: 98px; }
          .deck-shoe { width: 70px; height: 98px; }
          .hand-container { min-height: 100px; }
          .dealer-area { min-height: 120px; }
          .player-area { min-height: 150px; }
          .game-header h1 { font-size: 1.5rem; }
          .action-btn { padding: 10px 15px; font-size: 0.6rem; }
        }
      `}</style>
    </div>
  );
}
