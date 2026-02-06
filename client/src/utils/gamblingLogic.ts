/**
 * Gambling Logic Module for Higher or Lower Game
 * Manages stake calculations, payouts, and game state
 */

// House edge constant (5%)
export const HOUSE_EDGE = 0.05;

// Game state
let currentStake: number = 0;
let isGameActive: boolean = false;

// Card values for probability calculations (2-10, J, Q, K, A)
const CARD_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/**
 * Initialize a new gambling session with starting stake
 */
export function initializeGame(startingStake: number): void {
  if (startingStake <= 0) {
    throw new Error('Starting stake must be greater than 0');
  }
  currentStake = Math.floor(startingStake * 100) / 100; // Round down to 2 decimal places
  isGameActive = true;
}

/**
 * Get the current stake
 */
export function getCurrentStake(): number {
  return currentStake;
}

/**
 * Check if a game is currently active
 */
export function isActive(): boolean {
  return isGameActive;
}

/**
 * Calculate the multiplier for a bet based on probability
 * @param direction - 'higher' or 'lower'
 * @param currentCardValue - The value of the current card (2-14, where 14 = Ace)
 * @param remainingCards - Array of remaining card values in the deck
 * @returns The payout multiplier
 */
export function getMultiplier(
  direction: 'higher' | 'lower',
  currentCardValue: number,
  remainingCards: number[]
): number {
  if (remainingCards.length === 0) {
    return 1;
  }

  // Count cards that are higher or lower than current
  let favorableOutcomes = 0;
  
  for (const cardValue of remainingCards) {
    if (direction === 'higher' && cardValue > currentCardValue) {
      favorableOutcomes++;
    } else if (direction === 'lower' && cardValue < currentCardValue) {
      favorableOutcomes++;
    }
  }

  // Calculate probability
  const probability = favorableOutcomes / remainingCards.length;
  
  // If no favorable outcomes, return minimum multiplier of 1
  if (probability === 0) {
    return 1;
  }

  // Calculate multiplier: (1 / probability) * (1 - HOUSE_EDGE)
  const rawMultiplier = (1 / probability) * (1 - HOUSE_EDGE);
  
  // Round down to 2 decimal places
  return Math.floor(rawMultiplier * 100) / 100;
}

/**
 * Get multipliers for both directions
 * Convenience function to get both higher and lower multipliers at once
 */
export function getBothMultipliers(
  currentCardValue: number,
  remainingCards: number[]
): { higher: number; lower: number } {
  return {
    higher: getMultiplier('higher', currentCardValue, remainingCards),
    lower: getMultiplier('lower', currentCardValue, remainingCards)
  };
}

/**
 * Process the result of a guess
 * @param playerGuess - 'higher' or 'lower'
 * @param currentCardValue - The card the player guessed on
 * @param nextCardValue - The card that was drawn
 * @param multiplier - The payout multiplier (from getMultiplier)
 * @param pushAllowed - Whether ties are allowed (push) or treated as loss
 * @returns Object containing result and updated stake
 */
export function processResult(
  playerGuess: 'higher' | 'lower',
  currentCardValue: number,
  nextCardValue: number,
  multiplier: number,
  pushAllowed: boolean = true
): { 
  result: 'win' | 'loss' | 'tie' | 'push'; 
  previousStake: number;
  newStake: number;
  payout: number;
} {
  if (!isGameActive) {
    throw new Error('No active game. Call initializeGame() first.');
  }

  const previousStake = currentStake;
  let result: 'win' | 'loss' | 'tie' | 'push';

  // Check for tie (equal value)
  if (nextCardValue === currentCardValue) {
    if (pushAllowed) {
      result = 'push';
      // Stake remains unchanged
      return {
        result,
        previousStake,
        newStake: currentStake,
        payout: currentStake
      };
    } else {
      result = 'tie';
      currentStake = 0;
      isGameActive = false;
      return {
        result,
        previousStake,
        newStake: 0,
        payout: 0
      };
    }
  }

  // Check if guess was correct
  const isHigher = nextCardValue > currentCardValue;
  const guessedCorrectly = 
    (playerGuess === 'higher' && isHigher) || 
    (playerGuess === 'lower' && !isHigher);

  if (guessedCorrectly) {
    result = 'win';
    // Calculate new stake: currentStake * multiplier
    const rawPayout = currentStake * multiplier;
    // Round down to 2 decimal places
    currentStake = Math.floor(rawPayout * 100) / 100;
  } else {
    result = 'loss';
    currentStake = 0;
    isGameActive = false;
  }

  return {
    result,
    previousStake,
    newStake: currentStake,
    payout: result === 'win' ? currentStake : 0
  };
}

/**
 * Cash out the current stake
 * @returns The current stake rounded down to 2 decimal places
 */
export function cashOut(): number {
  if (!isGameActive) {
    return 0;
  }

  const payout = Math.floor(currentStake * 100) / 100;
  currentStake = 0;
  isGameActive = false;
  
  return payout;
}

/**
 * Reset the game state without cashing out (for testing or forced reset)
 */
export function resetGame(): void {
  currentStake = 0;
  isGameActive = false;
}

/**
 * Convert card rank to numeric value for calculations
 */
export function cardRankToValue(rank: string): number {
  const rankMap: { [key: string]: number } = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return rankMap[rank] || parseInt(rank) || 2;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// Export constants for external use
export { CARD_VALUES };
