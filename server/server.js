import { WebSocketServer } from 'ws';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

// ============================================
// POKER GAME CONSTANTS
// ============================================
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

// Hand rankings
const HAND_RANKS = {
  ROYAL_FLUSH: 10,
  STRAIGHT_FLUSH: 9,
  FOUR_OF_A_KIND: 8,
  FULL_HOUSE: 7,
  FLUSH: 6,
  STRAIGHT: 5,
  THREE_OF_A_KIND: 4,
  TWO_PAIR: 3,
  ONE_PAIR: 2,
  HIGH_CARD: 1
};

// ============================================
// ROOM & PLAYER MANAGEMENT
// ============================================
const rooms = new Map();
const playerSockets = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function generatePlayerId() {
  return 'p_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// DECK & CARD UTILITIES
// ============================================
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCardValue(value) {
  const valueMap = { 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  return valueMap[value] || parseInt(value);
}

// ============================================
// HAND EVALUATION
// ============================================
function evaluateHand(cards) {
  if (cards.length < 5) return { rank: 0, name: 'Invalid', highCards: [] };

  // Get all 5-card combinations
  const combinations = getCombinations(cards, 5);
  let bestHand = { rank: 0, name: 'High Card', highCards: [] };

  for (const combo of combinations) {
    const hand = evaluateFiveCards(combo);
    if (hand.rank > bestHand.rank || 
        (hand.rank === bestHand.rank && compareHighCards(hand.highCards, bestHand.highCards) > 0)) {
      bestHand = hand;
    }
  }

  return bestHand;
}

function getCombinations(arr, k) {
  const result = [];
  function combine(start, combo) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  combine(0, []);
  return result;
}

function evaluateFiveCards(cards) {
  const values = cards.map(c => getCardValue(c.value)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(values);
  const valueCounts = getValueCounts(values);
  const counts = Object.values(valueCounts).sort((a, b) => b - a);

  // Royal Flush
  if (isFlush && isStraight && values[0] === 14 && values[4] === 10) {
    return { rank: HAND_RANKS.ROYAL_FLUSH, name: 'Royal Flush', highCards: values };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, name: 'Straight Flush', highCards: values };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    const fourValue = Object.keys(valueCounts).find(k => valueCounts[k] === 4);
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, name: 'Four of a Kind', highCards: sortByCount(values, valueCounts) };
  }

  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: HAND_RANKS.FULL_HOUSE, name: 'Full House', highCards: sortByCount(values, valueCounts) };
  }

  // Flush
  if (isFlush) {
    return { rank: HAND_RANKS.FLUSH, name: 'Flush', highCards: values };
  }

  // Straight
  if (isStraight) {
    return { rank: HAND_RANKS.STRAIGHT, name: 'Straight', highCards: values };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    return { rank: HAND_RANKS.THREE_OF_A_KIND, name: 'Three of a Kind', highCards: sortByCount(values, valueCounts) };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: HAND_RANKS.TWO_PAIR, name: 'Two Pair', highCards: sortByCount(values, valueCounts) };
  }

  // One Pair
  if (counts[0] === 2) {
    return { rank: HAND_RANKS.ONE_PAIR, name: 'One Pair', highCards: sortByCount(values, valueCounts) };
  }

  // High Card
  return { rank: HAND_RANKS.HIGH_CARD, name: 'High Card', highCards: values };
}

function checkStraight(values) {
  const sorted = [...new Set(values)].sort((a, b) => b - a);
  if (sorted.length < 5) return false;
  
  // Check normal straight
  for (let i = 0; i < sorted.length - 4; i++) {
    if (sorted[i] - sorted[i + 4] === 4) return true;
  }
  
  // Check Ace-low straight (A-2-3-4-5)
  if (sorted.includes(14) && sorted.includes(2) && sorted.includes(3) && sorted.includes(4) && sorted.includes(5)) {
    return true;
  }
  
  return false;
}

function getValueCounts(values) {
  const counts = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

function sortByCount(values, counts) {
  return [...values].sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    return b - a;
  });
}

function compareHighCards(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// ============================================
// GAME STATE MANAGEMENT
// ============================================
function createRoom(hostId, hostName) {
  const roomCode = generateRoomCode();
  const room = {
    code: roomCode,
    hostId: hostId,
    players: [{
      id: hostId,
      name: hostName,
      chips: STARTING_CHIPS,
      cards: [],
      bet: 0,
      totalBet: 0,
      folded: false,
      isAllIn: false,
      isConnected: true,
      seatIndex: 0
    }],
    gameState: 'waiting', // waiting, preflop, flop, turn, river, showdown
    deck: [],
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaise: BIG_BLIND,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    lastRaiserIndex: -1,
    roundStartIndex: 0,
    actedThisRound: new Set()
  };
  rooms.set(roomCode, room);
  return room;
}

function joinRoom(roomCode, playerId, playerName) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= 8) return { error: 'Room is full' };
  if (room.gameState !== 'waiting') return { error: 'Game already in progress' };

  // Find first available seat
  const usedSeats = new Set(room.players.map(p => p.seatIndex));
  let seatIndex = 0;
  while (usedSeats.has(seatIndex)) seatIndex++;

  room.players.push({
    id: playerId,
    name: playerName,
    chips: STARTING_CHIPS,
    cards: [],
    bet: 0,
    totalBet: 0,
    folded: false,
    isAllIn: false,
    isConnected: true,
    seatIndex: seatIndex
  });
  
  return { success: true, room };
}

function leaveRoom(roomCode, playerId) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  if (room.gameState === 'waiting') {
    room.players.splice(playerIndex, 1);
    if (room.players.length === 0) {
      rooms.delete(roomCode);
      return { roomDeleted: true };
    }
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }
  } else {
    // Mark as disconnected during game
    room.players[playerIndex].isConnected = false;
    room.players[playerIndex].folded = true;
    
    // Check if game should end
    const activePlayers = room.players.filter(p => !p.folded && p.isConnected);
    if (activePlayers.length <= 1) {
      endHand(room);
    } else if (room.players[room.currentPlayerIndex].id === playerId) {
      advanceToNextPlayer(room);
    }
  }
  
  return { room };
}

function startGame(room) {
  if (room.players.length < 2) return { error: 'Need at least 2 players' };
  
  startNewHand(room);
  return { success: true };
}

function startNewHand(room) {
  // Reset deck
  room.deck = shuffleDeck(createDeck());
  room.communityCards = [];
  room.pot = 0;
  room.sidePots = [];
  room.currentBet = 0;
  room.minRaise = BIG_BLIND;
  room.lastRaiserIndex = -1;
  room.actedThisRound = new Set();

  // Remove busted players
  room.players = room.players.filter(p => p.chips > 0 || p.isConnected);
  
  if (room.players.length < 2) {
    room.gameState = 'waiting';
    return;
  }

  // Reset player states
  for (const player of room.players) {
    player.cards = [];
    player.bet = 0;
    player.totalBet = 0;
    player.folded = false;
    player.isAllIn = false;
  }

  // Move dealer button
  room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
  
  // Deal cards
  for (const player of room.players) {
    player.cards = [room.deck.pop(), room.deck.pop()];
  }

  // Post blinds
  const smallBlindIndex = (room.dealerIndex + 1) % room.players.length;
  const bigBlindIndex = (room.dealerIndex + 2) % room.players.length;
  
  postBlind(room, smallBlindIndex, SMALL_BLIND);
  postBlind(room, bigBlindIndex, BIG_BLIND);
  
  room.currentBet = BIG_BLIND;
  room.currentPlayerIndex = (bigBlindIndex + 1) % room.players.length;
  room.roundStartIndex = room.currentPlayerIndex;
  room.lastRaiserIndex = bigBlindIndex;
  room.gameState = 'preflop';
  
  // Skip folded/all-in players
  skipInactivePlayers(room);
}

function postBlind(room, playerIndex, amount) {
  const player = room.players[playerIndex];
  const blindAmount = Math.min(amount, player.chips);
  player.chips -= blindAmount;
  player.bet = blindAmount;
  player.totalBet = blindAmount;
  room.pot += blindAmount;
  
  if (player.chips === 0) {
    player.isAllIn = true;
  }
}

function handlePlayerAction(room, playerId, action, amount = 0) {
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return { error: 'Player not found' };
  if (playerIndex !== room.currentPlayerIndex) return { error: 'Not your turn' };
  if (room.gameState === 'waiting' || room.gameState === 'showdown') return { error: 'Invalid game state' };

  const player = room.players[playerIndex];
  if (player.folded || player.isAllIn) return { error: 'Cannot act' };

  switch (action) {
    case 'fold':
      player.folded = true;
      break;
      
    case 'check':
      if (room.currentBet > player.bet) return { error: 'Cannot check, must call or fold' };
      break;
      
    case 'call':
      const callAmount = Math.min(room.currentBet - player.bet, player.chips);
      player.chips -= callAmount;
      player.bet += callAmount;
      player.totalBet += callAmount;
      room.pot += callAmount;
      if (player.chips === 0) player.isAllIn = true;
      break;
      
    case 'raise':
      const minRaiseTotal = room.currentBet + room.minRaise;
      if (amount < minRaiseTotal && amount < player.chips + player.bet) {
        return { error: `Minimum raise is ${minRaiseTotal}` };
      }
      const raiseAmount = Math.min(amount - player.bet, player.chips);
      const actualRaise = raiseAmount - (room.currentBet - player.bet);
      
      player.chips -= raiseAmount;
      player.bet += raiseAmount;
      player.totalBet += raiseAmount;
      room.pot += raiseAmount;
      
      room.minRaise = Math.max(room.minRaise, actualRaise);
      room.currentBet = player.bet;
      room.lastRaiserIndex = playerIndex;
      room.actedThisRound = new Set([playerIndex]);
      
      if (player.chips === 0) player.isAllIn = true;
      break;
      
    case 'allin':
      const allInAmount = player.chips;
      if (player.bet + allInAmount > room.currentBet) {
        // This is a raise
        const raiseBy = (player.bet + allInAmount) - room.currentBet;
        if (raiseBy >= room.minRaise) {
          room.minRaise = raiseBy;
          room.lastRaiserIndex = playerIndex;
          room.actedThisRound = new Set([playerIndex]);
        }
        room.currentBet = player.bet + allInAmount;
      }
      player.totalBet += allInAmount;
      player.bet += allInAmount;
      room.pot += allInAmount;
      player.chips = 0;
      player.isAllIn = true;
      break;
      
    default:
      return { error: 'Invalid action' };
  }

  room.actedThisRound.add(playerIndex);
  
  // Check if hand should end or advance
  const activePlayers = room.players.filter(p => !p.folded);
  const playersCanAct = activePlayers.filter(p => !p.isAllIn);
  
  if (activePlayers.length === 1) {
    // Everyone else folded
    endHand(room);
    return { success: true };
  }
  
  if (playersCanAct.length <= 1 || isRoundComplete(room)) {
    advanceGameState(room);
  } else {
    advanceToNextPlayer(room);
  }
  
  return { success: true };
}

function isRoundComplete(room) {
  const activePlayers = room.players.filter(p => !p.folded && !p.isAllIn);
  
  for (const player of activePlayers) {
    const playerIndex = room.players.indexOf(player);
    if (!room.actedThisRound.has(playerIndex)) return false;
    if (player.bet < room.currentBet) return false;
  }
  
  return true;
}

function skipInactivePlayers(room) {
  let attempts = 0;
  while (attempts < room.players.length) {
    const player = room.players[room.currentPlayerIndex];
    if (!player.folded && !player.isAllIn) break;
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    attempts++;
  }
}

function advanceToNextPlayer(room) {
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  skipInactivePlayers(room);
}

function advanceGameState(room) {
  // Reset betting for new round
  for (const player of room.players) {
    player.bet = 0;
  }
  room.currentBet = 0;
  room.minRaise = BIG_BLIND;
  room.actedThisRound = new Set();
  room.lastRaiserIndex = -1;

  switch (room.gameState) {
    case 'preflop':
      room.communityCards = [room.deck.pop(), room.deck.pop(), room.deck.pop()];
      room.gameState = 'flop';
      break;
    case 'flop':
      room.communityCards.push(room.deck.pop());
      room.gameState = 'turn';
      break;
    case 'turn':
      room.communityCards.push(room.deck.pop());
      room.gameState = 'river';
      break;
    case 'river':
      endHand(room);
      return;
  }

  // Set first player after dealer
  room.currentPlayerIndex = (room.dealerIndex + 1) % room.players.length;
  room.roundStartIndex = room.currentPlayerIndex;
  skipInactivePlayers(room);
  
  // Check if only one player can act
  const playersCanAct = room.players.filter(p => !p.folded && !p.isAllIn);
  if (playersCanAct.length <= 1) {
    advanceGameState(room);
  }
}

function endHand(room) {
  room.gameState = 'showdown';
  
  const activePlayers = room.players.filter(p => !p.folded);
  
  if (activePlayers.length === 1) {
    // Single winner - everyone else folded
    activePlayers[0].chips += room.pot;
    room.winners = [{
      player: activePlayers[0],
      amount: room.pot,
      hand: null
    }];
  } else {
    // Evaluate hands and determine winner(s)
    const playerHands = activePlayers.map(player => ({
      player,
      hand: evaluateHand([...player.cards, ...room.communityCards])
    }));

    // Sort by hand rank
    playerHands.sort((a, b) => {
      if (b.hand.rank !== a.hand.rank) return b.hand.rank - a.hand.rank;
      return compareHighCards(b.hand.highCards, a.hand.highCards);
    });

    // Find winners (could be multiple for split pot)
    const bestHand = playerHands[0].hand;
    const winners = playerHands.filter(ph => 
      ph.hand.rank === bestHand.rank && 
      compareHighCards(ph.hand.highCards, bestHand.highCards) === 0
    );

    const winAmount = Math.floor(room.pot / winners.length);
    room.winners = winners.map(w => {
      w.player.chips += winAmount;
      return {
        player: w.player,
        amount: winAmount,
        hand: w.hand
      };
    });
  }

  room.pot = 0;
}

// ============================================
// WEBSOCKET MESSAGE HANDLING
// ============================================
function broadcast(room, message, excludePlayerId = null) {
  for (const player of room.players) {
    if (player.id === excludePlayerId) continue;
    const socket = playerSockets.get(player.id);
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  }
}

function sendToPlayer(playerId, message) {
  const socket = playerSockets.get(playerId);
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
}

function getPublicGameState(room, forPlayerId = null) {
  return {
    roomCode: room.code,
    hostId: room.hostId,
    gameState: room.gameState,
    communityCards: room.communityCards,
    pot: room.pot,
    currentBet: room.currentBet,
    minRaise: room.minRaise,
    dealerIndex: room.dealerIndex,
    currentPlayerIndex: room.currentPlayerIndex,
    winners: room.winners,
    players: room.players.map((p, index) => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      bet: p.bet,
      folded: p.folded,
      isAllIn: p.isAllIn,
      isConnected: p.isConnected,
      seatIndex: p.seatIndex,
      // Only show cards if it's the player's own cards or showdown
      cards: (p.id === forPlayerId || (room.gameState === 'showdown' && !p.folded)) 
        ? p.cards 
        : p.cards.map(() => null),
      isCurrentPlayer: index === room.currentPlayerIndex
    }))
  };
}

wss.on('connection', (ws) => {
  let playerId = null;
  let currentRoomCode = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'CREATE_ROOM': {
          playerId = generatePlayerId();
          playerSockets.set(playerId, ws);
          const room = createRoom(playerId, message.playerName);
          currentRoomCode = room.code;
          
          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            playerId,
            roomCode: room.code,
            gameState: getPublicGameState(room, playerId)
          }));
          break;
        }
        
        case 'JOIN_ROOM': {
          playerId = generatePlayerId();
          playerSockets.set(playerId, ws);
          const result = joinRoom(message.roomCode.toUpperCase(), playerId, message.playerName);
          
          if (result.error) {
            ws.send(JSON.stringify({ type: 'ERROR', error: result.error }));
            playerSockets.delete(playerId);
            playerId = null;
            return;
          }
          
          currentRoomCode = message.roomCode.toUpperCase();
          const room = result.room;
          
          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            playerId,
            roomCode: currentRoomCode,
            gameState: getPublicGameState(room, playerId)
          }));
          
          // Notify other players
          broadcast(room, {
            type: 'PLAYER_JOINED',
            gameState: getPublicGameState(room)
          }, playerId);
          break;
        }
        
        case 'START_GAME': {
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          if (room.hostId !== playerId) {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Only host can start the game' }));
            return;
          }
          
          const result = startGame(room);
          if (result.error) {
            ws.send(JSON.stringify({ type: 'ERROR', error: result.error }));
            return;
          }
          
          // Send personalized game state to each player
          for (const player of room.players) {
            sendToPlayer(player.id, {
              type: 'GAME_STARTED',
              gameState: getPublicGameState(room, player.id)
            });
          }
          break;
        }
        
        case 'PLAYER_ACTION': {
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          
          const result = handlePlayerAction(room, playerId, message.action, message.amount);
          if (result.error) {
            ws.send(JSON.stringify({ type: 'ERROR', error: result.error }));
            return;
          }
          
          // Send updated state to all players
          for (const player of room.players) {
            sendToPlayer(player.id, {
              type: 'GAME_UPDATE',
              gameState: getPublicGameState(room, player.id),
              lastAction: {
                playerId,
                action: message.action,
                amount: message.amount
              }
            });
          }
          break;
        }
        
        case 'NEW_HAND': {
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          if (room.hostId !== playerId) {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Only host can start new hand' }));
            return;
          }
          if (room.gameState !== 'showdown') {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Current hand not finished' }));
            return;
          }
          
          startNewHand(room);
          
          for (const player of room.players) {
            sendToPlayer(player.id, {
              type: 'GAME_UPDATE',
              gameState: getPublicGameState(room, player.id)
            });
          }
          break;
        }
        
        case 'LEAVE_ROOM': {
          if (currentRoomCode) {
            const result = leaveRoom(currentRoomCode, playerId);
            if (result && result.room) {
              broadcast(result.room, {
                type: 'PLAYER_LEFT',
                playerId,
                gameState: getPublicGameState(result.room)
              });
            }
          }
          currentRoomCode = null;
          ws.send(JSON.stringify({ type: 'LEFT_ROOM' }));
          break;
        }
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  ws.on('close', () => {
    if (playerId) {
      playerSockets.delete(playerId);
      if (currentRoomCode) {
        const result = leaveRoom(currentRoomCode, playerId);
        if (result && result.room) {
          for (const player of result.room.players) {
            sendToPlayer(player.id, {
              type: 'PLAYER_DISCONNECTED',
              playerId,
              gameState: getPublicGameState(result.room, player.id)
            });
          }
        }
      }
    }
  });
});

console.log(`Poker WebSocket server running on port ${PORT}`);
