/**
 * Integration Example for Gambling Logic Module
 * 
 * This file demonstrates how to integrate the gambling logic
 * into the existing HigherLowerGame.tsx without breaking it.
 * 
 * You can copy relevant parts into your HigherLowerGame.tsx
 */

import {
  initializeGame,
  getCurrentStake,
  isActive,
  getMultiplier,
  getBothMultipliers,
  processResult,
  cashOut,
  cardRankToValue,
  formatCurrency,
  resetGame,
  HOUSE_EDGE
} from './gamblingLogic';

// ============================================================================
// EXAMPLE INTEGRATION INTO HigherLowerGame.tsx
// ============================================================================

/*
1. ADD TO STATE (in your component):

const [gamblingState, setGamblingState] = useState({
  stake: 0,
  initialBet: 0,
  multipliers: { higher: 1, lower: 1 },
  showCashOut: false
});

const [showGamblingModal, setShowGamblingModal] = useState(false);
*/

/*
2. INITIALIZE GAME (when starting a new round with a bet):

const startGamblingRound = (betAmount: number) => {
  initializeGame(betAmount);
  setGamblingState(prev => ({
    ...prev,
    stake: betAmount,
    initialBet: betAmount,
    showCashOut: true
  }));
};
*/

/*
3. UPDATE MULTIPLIERS (when a card is revealed):

const updateMultipliers = (currentCard: Card, remainingDeck: Card[]) => {
  const currentValue = cardRankToValue(currentCard.rank);
  const remainingValues = remainingDeck.map(c => cardRankToValue(c.rank));
  
  const multipliers = getBothMultipliers(currentValue, remainingValues);
  
  setGamblingState(prev => ({
    ...prev,
    multipliers
  }));
};
*/

/*
4. PROCESS GUESS (when player makes a choice):

const handleGamblingChoice = (
  choice: 'higher' | 'lower',
  currentCard: Card,
  nextCard: Card
) => {
  const currentValue = cardRankToValue(currentCard.rank);
  const nextValue = cardRankToValue(nextCard.rank);
  
  // Get the multiplier that was shown to the player
  const multiplier = choice === 'higher' 
    ? gamblingState.multipliers.higher 
    : gamblingState.multipliers.lower;
  
  const result = processResult(choice, currentValue, nextValue, multiplier);
  
  if (result.result === 'win') {
    setGamblingState(prev => ({
      ...prev,
      stake: result.newStake
    }));
    // Continue game - allow another guess
  } else if (result.result === 'loss' || result.result === 'tie') {
    setGamblingState(prev => ({
      ...prev,
      stake: 0,
      showCashOut: false
    }));
    // Game over - player loses bet
  }
  
  return result;
};
*/

/*
5. CASH OUT (when player wants to take winnings):

const handleCashOut = () => {
  const payout = cashOut();
  setGamblingState(prev => ({
    ...prev,
    stake: 0,
    showCashOut: false
  }));
  
  // Add payout to player's wallet
  // updateWallet(payout);
  
  return payout;
};
*/

/*
6. UI COMPONENTS (add to your JSX):

// Display current stake
{gamblingState.showCashOut && (
  <div className="stake-display">
    <span>Current Stake: {formatCurrency(gamblingState.stake)}</span>
    <button onClick={handleCashOut} className="cash-out-btn">
      Cash Out
    </button>
  </div>
)}

// Display multipliers
{gamblingState.showCashOut && (
  <div className="multipliers-display">
    <span>Higher: {gamblingState.multipliers.higher.toFixed(2)}x</span>
    <span>Lower: {gamblingState.multipliers.lower.toFixed(2)}x</span>
  </div>
)}
*/

/*
7. CSS STYLES (add to styles.css):

.stake-display {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-secondary);
  border: 3px solid var(--retro-yellow);
  padding: 15px 25px;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 100;
}

.stake-display span {
  font-family: 'Press Start 2P', cursive;
  font-size: 0.7rem;
  color: var(--retro-yellow);
}

.cash-out-btn {
  background: var(--retro-green);
  color: var(--bg-primary);
  border: 3px solid #00cc00;
  padding: 10px 20px;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.5rem;
  cursor: pointer;
  transition: 0.1s;
}

.cash-out-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0px rgba(0, 255, 0, 0.4);
}

.multipliers-display {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 30px;
  background: var(--bg-secondary);
  padding: 10px 20px;
  border: 2px solid var(--retro-cyan);
}

.multipliers-display span {
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  color: var(--retro-cyan);
}
*/

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export {
  initializeGame,
  getCurrentStake,
  isActive,
  getMultiplier,
  getBothMultipliers,
  processResult,
  cashOut,
  cardRankToValue,
  formatCurrency,
  resetGame,
  HOUSE_EDGE
};
