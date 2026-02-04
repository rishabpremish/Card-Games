/**
 * poker.js - Texas Hold'em Poker Game
 * Supports single player (AI) and online multiplayer
 */

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const VALUE_RANKS = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

const HAND_RANKS = {
    HIGH_CARD: 1,
    ONE_PAIR: 2,
    TWO_PAIR: 3,
    THREE_OF_A_KIND: 4,
    STRAIGHT: 5,
    FLUSH: 6,
    FULL_HOUSE: 7,
    FOUR_OF_A_KIND: 8,
    STRAIGHT_FLUSH: 9,
    ROYAL_FLUSH: 10
};

const HAND_NAMES = {
    1: 'High Card',
    2: 'One Pair',
    3: 'Two Pair',
    4: 'Three of a Kind',
    5: 'Straight',
    6: 'Flush',
    7: 'Full House',
    8: 'Four of a Kind',
    9: 'Straight Flush',
    10: 'Royal Flush'
};

const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const TURN_TIME = 30; // seconds

const AI_NAMES = ['Bot Alice', 'Bot Bob', 'Bot Charlie', 'Bot Diana', 'Bot Eddie'];
const PLAYER_AVATARS = ['😎', '🤠', '🎭', '🦊', '🐱', '🤖'];

// ============================================
// GAME STATE
// ============================================

const PokerGame = {
    // Mode
    mode: null, // 'single' or 'multiplayer'
    difficulty: 'medium',
    isInGame: false,
    
    // Players
    players: [],
    myPlayerId: 0,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    
    // Cards
    deck: [],
    communityCards: [],
    
    // Betting
    pot: 0,
    currentBet: 0,
    minRaise: BIG_BLIND,
    roundBets: {}, // Track bets per round
    
    // Game phases: 'preflop', 'flop', 'turn', 'river', 'showdown'
    phase: 'preflop',
    round: 1,
    
    // Turn timer
    turnTimer: null,
    turnTimeLeft: TURN_TIME,
    
    // Multiplayer
    peer: null,
    connections: {},
    roomCode: null,
    isHost: false,
    
    // UI elements cache
    elements: {}
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    setupEventListeners();
    showScreen('screen-mode-select');
});

function cacheElements() {
    PokerGame.elements = {
        // Screens
        screenModeSelect: document.getElementById('screen-mode-select'),
        screenSingleSetup: document.getElementById('screen-single-setup'),
        screenMultiplayerLobby: document.getElementById('screen-multiplayer-lobby'),
        screenWaitingRoom: document.getElementById('screen-waiting-room'),
        screenGame: document.getElementById('screen-game'),
        
        // Mode selection
        btnSinglePlayer: document.getElementById('btn-single-player'),
        btnMultiplayer: document.getElementById('btn-multiplayer'),
        
        // Single player setup
        difficultyBtns: document.querySelectorAll('.difficulty-btn'),
        difficultyDesc: document.getElementById('difficulty-desc'),
        btnBackToMode: document.getElementById('btn-back-to-mode'),
        btnStartSingle: document.getElementById('btn-start-single'),
        
        // Multiplayer lobby
        connectionStatus: document.getElementById('connection-status'),
        connectionText: document.getElementById('connection-text'),
        btnCreateRoom: document.getElementById('btn-create-room'),
        btnJoinRoom: document.getElementById('btn-join-room'),
        joinRoomContainer: document.getElementById('join-room-container'),
        roomCodeInput: document.getElementById('room-code-input'),
        btnCancelJoin: document.getElementById('btn-cancel-join'),
        btnConfirmJoin: document.getElementById('btn-confirm-join'),
        btnBackToModeMp: document.getElementById('btn-back-to-mode-mp'),
        
        // Waiting room
        waitingSubtitle: document.getElementById('waiting-subtitle'),
        displayRoomCode: document.getElementById('display-room-code'),
        playersList: document.getElementById('players-list'),
        btnLeaveRoom: document.getElementById('btn-leave-room'),
        btnStartGame: document.getElementById('btn-start-game'),
        
        // Game
        yourChips: document.getElementById('your-chips'),
        blindsDisplay: document.getElementById('blinds-display'),
        roundDisplay: document.getElementById('round-display'),
        playersCount: document.getElementById('players-count'),
        potAmount: document.getElementById('pot-amount'),
        communityCards: document.getElementById('community-cards'),
        yourCards: document.getElementById('your-cards'),
        handRank: document.getElementById('hand-rank'),
        turnTimer: document.getElementById('turn-timer'),
        
        // Action buttons
        btnFold: document.getElementById('btn-fold'),
        btnCheck: document.getElementById('btn-check'),
        btnCall: document.getElementById('btn-call'),
        callAmount: document.getElementById('call-amount'),
        btnRaise: document.getElementById('btn-raise'),
        btnAllIn: document.getElementById('btn-all-in'),
        raiseControls: document.getElementById('raise-controls'),
        raiseSlider: document.getElementById('raise-slider'),
        raiseAmountDisplay: document.getElementById('raise-amount-display'),
        btnConfirmRaise: document.getElementById('btn-confirm-raise'),
        
        // Game over
        gameOverOverlay: document.getElementById('game-over-overlay'),
        gameOverTitle: document.getElementById('game-over-title'),
        winnerDisplay: document.getElementById('winner-display'),
        gameOverText: document.getElementById('game-over-text'),
        btnQuitGame: document.getElementById('btn-quit-game'),
        btnNextRound: document.getElementById('btn-next-round'),
        
        // Chat
        chatContainer: document.getElementById('chat-container'),
        chatToggle: document.getElementById('chat-toggle'),
        chatMessages: document.getElementById('chat-messages'),
        chatInput: document.getElementById('chat-input'),
        chatSend: document.getElementById('chat-send')
    };
}

function setupEventListeners() {
    const el = PokerGame.elements;
    
    // Mode selection
    el.btnSinglePlayer.addEventListener('click', () => {
        PokerGame.mode = 'single';
        showScreen('screen-single-setup');
    });
    
    el.btnMultiplayer.addEventListener('click', () => {
        PokerGame.mode = 'multiplayer';
        showScreen('screen-multiplayer-lobby');
        initializePeer();
    });
    
    // Difficulty selection
    el.difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            el.difficultyBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            PokerGame.difficulty = btn.dataset.difficulty;
            updateDifficultyDescription();
        });
    });
    
    el.btnBackToMode.addEventListener('click', () => showScreen('screen-mode-select'));
    el.btnStartSingle.addEventListener('click', startSinglePlayerGame);
    
    // Multiplayer lobby
    el.btnCreateRoom.addEventListener('click', createRoom);
    el.btnJoinRoom.addEventListener('click', () => {
        el.joinRoomContainer.classList.remove('hidden');
        el.btnCreateRoom.classList.add('hidden');
        el.btnJoinRoom.classList.add('hidden');
    });
    el.btnCancelJoin.addEventListener('click', () => {
        el.joinRoomContainer.classList.add('hidden');
        el.btnCreateRoom.classList.remove('hidden');
        el.btnJoinRoom.classList.remove('hidden');
    });
    el.btnConfirmJoin.addEventListener('click', joinRoom);
    el.btnBackToModeMp.addEventListener('click', () => {
        cleanupPeer();
        showScreen('screen-mode-select');
    });
    
    // Room code input - auto uppercase
    el.roomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    
    // Waiting room
    el.btnLeaveRoom.addEventListener('click', leaveRoom);
    el.btnStartGame.addEventListener('click', startMultiplayerGame);
    
    // Game actions
    el.btnFold.addEventListener('click', () => performAction('fold'));
    el.btnCheck.addEventListener('click', () => performAction('check'));
    el.btnCall.addEventListener('click', () => performAction('call'));
    el.btnRaise.addEventListener('click', toggleRaiseControls);
    el.btnAllIn.addEventListener('click', () => performAction('all-in'));
    el.btnConfirmRaise.addEventListener('click', confirmRaise);
    
    // Raise slider
    el.raiseSlider.addEventListener('input', updateRaiseDisplay);
    
    // Raise presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const multiplier = parseFloat(btn.dataset.multiplier);
            const amount = Math.floor(PokerGame.pot * multiplier);
            const myPlayer = PokerGame.players[PokerGame.myPlayerId];
            const maxRaise = myPlayer.chips;
            el.raiseSlider.value = Math.min(Math.max(amount, PokerGame.minRaise), maxRaise);
            updateRaiseDisplay();
        });
    });
    
    // Game over
    el.btnQuitGame.addEventListener('click', quitGame);
    el.btnNextRound.addEventListener('click', startNextRound);
    
    // Chat
    el.chatToggle.addEventListener('click', () => {
        el.chatContainer.classList.toggle('minimized');
        el.chatToggle.textContent = el.chatContainer.classList.contains('minimized') ? '+' : '-';
    });
    el.chatSend.addEventListener('click', sendChatMessage);
    el.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
}

// ============================================
// SCREEN MANAGEMENT
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function updateDifficultyDescription() {
    const descriptions = {
        easy: 'Relaxed AI that makes simple decisions. Good for learning!',
        medium: 'Balanced AI that plays strategically.',
        hard: 'Expert AI with advanced tactics. Good luck!'
    };
    PokerGame.elements.difficultyDesc.textContent = descriptions[PokerGame.difficulty];
}

// ============================================
// DECK & CARD FUNCTIONS
// ============================================

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ suit, value });
        }
    }
    return shuffleDeck(deck);
}

function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function dealCard() {
    return PokerGame.deck.pop();
}

function createCardHTML(card, faceDown = false, small = false) {
    if (!card) return '';
    
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const colorClass = isRed ? 'red' : 'black';
    const sizeClass = small ? 'small' : '';
    const faceClass = faceDown ? 'face-down' : '';
    
    return `
        <div class="poker-card ${sizeClass} ${faceClass}">
            <div class="card-front ${colorClass}">
                <div class="card-corner top">
                    <span class="card-value">${card.value}</span>
                    <span class="card-suit-small">${SUIT_SYMBOLS[card.suit]}</span>
                </div>
                <div class="card-center">${SUIT_SYMBOLS[card.suit]}</div>
                <div class="card-corner bottom">
                    <span class="card-value">${card.value}</span>
                    <span class="card-suit-small">${SUIT_SYMBOLS[card.suit]}</span>
                </div>
            </div>
            <div class="card-back"></div>
        </div>
    `;
}

// ============================================
// HAND EVALUATION
// ============================================

function evaluateHand(holeCards, communityCards) {
    const allCards = [...holeCards, ...communityCards];
    if (allCards.length < 5) return { rank: 0, name: '', highCards: [] };
    
    // Generate all 5-card combinations
    const combinations = getCombinations(allCards, 5);
    
    let bestHand = { rank: 0, name: '', highCards: [], cards: [] };
    
    for (const combo of combinations) {
        const hand = evaluateFiveCards(combo);
        if (compareHands(hand, bestHand) > 0) {
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
    const values = cards.map(c => VALUE_RANKS[c.value]).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = checkStraight(values);
    
    // Count values
    const valueCounts = {};
    for (const v of values) {
        valueCounts[v] = (valueCounts[v] || 0) + 1;
    }
    
    const counts = Object.values(valueCounts).sort((a, b) => b - a);
    const sortedByCount = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1] || b[0] - a[0])
        .map(e => parseInt(e[0]));
    
    // Royal Flush
    if (isFlush && isStraight && values[0] === 14 && values[4] === 10) {
        return { rank: HAND_RANKS.ROYAL_FLUSH, name: 'Royal Flush', highCards: values, cards };
    }
    
    // Straight Flush
    if (isFlush && isStraight) {
        return { rank: HAND_RANKS.STRAIGHT_FLUSH, name: 'Straight Flush', highCards: [Math.max(...values)], cards };
    }
    
    // Four of a Kind
    if (counts[0] === 4) {
        return { rank: HAND_RANKS.FOUR_OF_A_KIND, name: 'Four of a Kind', highCards: sortedByCount, cards };
    }
    
    // Full House
    if (counts[0] === 3 && counts[1] === 2) {
        return { rank: HAND_RANKS.FULL_HOUSE, name: 'Full House', highCards: sortedByCount, cards };
    }
    
    // Flush
    if (isFlush) {
        return { rank: HAND_RANKS.FLUSH, name: 'Flush', highCards: values, cards };
    }
    
    // Straight
    if (isStraight) {
        return { rank: HAND_RANKS.STRAIGHT, name: 'Straight', highCards: [Math.max(...values)], cards };
    }
    
    // Three of a Kind
    if (counts[0] === 3) {
        return { rank: HAND_RANKS.THREE_OF_A_KIND, name: 'Three of a Kind', highCards: sortedByCount, cards };
    }
    
    // Two Pair
    if (counts[0] === 2 && counts[1] === 2) {
        return { rank: HAND_RANKS.TWO_PAIR, name: 'Two Pair', highCards: sortedByCount, cards };
    }
    
    // One Pair
    if (counts[0] === 2) {
        return { rank: HAND_RANKS.ONE_PAIR, name: 'One Pair', highCards: sortedByCount, cards };
    }
    
    // High Card
    return { rank: HAND_RANKS.HIGH_CARD, name: 'High Card', highCards: values, cards };
}

function checkStraight(values) {
    const sorted = [...new Set(values)].sort((a, b) => b - a);
    if (sorted.length < 5) return false;
    
    // Check normal straight
    for (let i = 0; i <= sorted.length - 5; i++) {
        if (sorted[i] - sorted[i + 4] === 4) return true;
    }
    
    // Check wheel (A-2-3-4-5)
    if (sorted.includes(14) && sorted.includes(2) && sorted.includes(3) && 
        sorted.includes(4) && sorted.includes(5)) {
        return true;
    }
    
    return false;
}

function compareHands(hand1, hand2) {
    if (hand1.rank !== hand2.rank) {
        return hand1.rank - hand2.rank;
    }
    
    // Compare high cards
    for (let i = 0; i < Math.min(hand1.highCards.length, hand2.highCards.length); i++) {
        if (hand1.highCards[i] !== hand2.highCards[i]) {
            return hand1.highCards[i] - hand2.highCards[i];
        }
    }
    
    return 0;
}

// ============================================
// SINGLE PLAYER GAME
// ============================================

function startSinglePlayerGame() {
    PokerGame.isInGame = true;
    PokerGame.mode = 'single';
    PokerGame.round = 1;
    
    // Create players (you + AI)
    const numAI = 3; // 3 AI opponents for a 4-player game
    PokerGame.players = [];
    
    // Add human player
    PokerGame.players.push({
        id: 0,
        name: 'You',
        chips: STARTING_CHIPS,
        holeCards: [],
        folded: false,
        allIn: false,
        currentBet: 0,
        isAI: false,
        avatar: '😎'
    });
    
    PokerGame.myPlayerId = 0;
    
    // Add AI players
    for (let i = 0; i < numAI; i++) {
        PokerGame.players.push({
            id: i + 1,
            name: AI_NAMES[i],
            chips: STARTING_CHIPS,
            holeCards: [],
            folded: false,
            allIn: false,
            currentBet: 0,
            isAI: true,
            difficulty: PokerGame.difficulty,
            avatar: PLAYER_AVATARS[i + 1]
        });
    }
    
    PokerGame.dealerIndex = Math.floor(Math.random() * PokerGame.players.length);
    
    showScreen('screen-game');
    startRound();
}

function startRound() {
    // Reset round state
    PokerGame.deck = createDeck();
    PokerGame.communityCards = [];
    PokerGame.pot = 0;
    PokerGame.currentBet = 0;
    PokerGame.minRaise = BIG_BLIND;
    PokerGame.phase = 'preflop';
    PokerGame.roundBets = {};
    
    // Reset players for new round
    for (const player of PokerGame.players) {
        player.holeCards = [];
        player.folded = false;
        player.allIn = false;
        player.currentBet = 0;
        PokerGame.roundBets[player.id] = 0;
    }
    
    // Remove busted players
    PokerGame.players = PokerGame.players.filter(p => p.chips > 0 || p.id === PokerGame.myPlayerId);
    
    // Check if game is over
    if (PokerGame.players.filter(p => p.chips > 0).length <= 1) {
        endGame();
        return;
    }
    
    // Move dealer button
    PokerGame.dealerIndex = (PokerGame.dealerIndex + 1) % PokerGame.players.length;
    
    // Post blinds
    postBlinds();
    
    // Deal hole cards
    dealHoleCards();
    
    // Update UI
    updateGameUI();
    renderTable();
    
    // Start first betting round
    startBettingRound();
}

function postBlinds() {
    const numPlayers = PokerGame.players.length;
    
    // Heads-up (2 players) has special rules: dealer posts small blind
    if (numPlayers === 2) {
        // In heads-up: dealer = small blind, other player = big blind
        const sbIndex = PokerGame.dealerIndex;
        const bbIndex = (PokerGame.dealerIndex + 1) % 2;
        
        const sbPlayer = PokerGame.players[sbIndex];
        const sbAmount = Math.min(SMALL_BLIND, sbPlayer.chips);
        sbPlayer.chips -= sbAmount;
        sbPlayer.currentBet = sbAmount;
        PokerGame.roundBets[sbPlayer.id] = sbAmount;
        PokerGame.pot += sbAmount;
        
        const bbPlayer = PokerGame.players[bbIndex];
        const bbAmount = Math.min(BIG_BLIND, bbPlayer.chips);
        bbPlayer.chips -= bbAmount;
        bbPlayer.currentBet = bbAmount;
        PokerGame.roundBets[bbPlayer.id] = bbAmount;
        PokerGame.pot += bbAmount;
        
        PokerGame.currentBet = BIG_BLIND;
        
        // In heads-up preflop, dealer (SB) acts first
        PokerGame.currentPlayerIndex = sbIndex;
    } else {
        // Standard 3+ players: SB is left of dealer, BB is left of SB
        const sbIndex = (PokerGame.dealerIndex + 1) % numPlayers;
        const sbPlayer = PokerGame.players[sbIndex];
        const sbAmount = Math.min(SMALL_BLIND, sbPlayer.chips);
        sbPlayer.chips -= sbAmount;
        sbPlayer.currentBet = sbAmount;
        PokerGame.roundBets[sbPlayer.id] = sbAmount;
        PokerGame.pot += sbAmount;
        
        const bbIndex = (PokerGame.dealerIndex + 2) % numPlayers;
        const bbPlayer = PokerGame.players[bbIndex];
        const bbAmount = Math.min(BIG_BLIND, bbPlayer.chips);
        bbPlayer.chips -= bbAmount;
        bbPlayer.currentBet = bbAmount;
        PokerGame.roundBets[bbPlayer.id] = bbAmount;
        PokerGame.pot += bbAmount;
        
        PokerGame.currentBet = BIG_BLIND;
        
        // First to act is after big blind (UTG)
        PokerGame.currentPlayerIndex = (bbIndex + 1) % numPlayers;
    }
}

function dealHoleCards() {
    for (let i = 0; i < 2; i++) {
        for (const player of PokerGame.players) {
            player.holeCards.push(dealCard());
        }
    }
}

function startBettingRound() {
    // Find first active player
    let attempts = 0;
    while (attempts < PokerGame.players.length) {
        const player = PokerGame.players[PokerGame.currentPlayerIndex];
        if (!player.folded && !player.allIn && player.chips > 0) {
            break;
        }
        PokerGame.currentPlayerIndex = (PokerGame.currentPlayerIndex + 1) % PokerGame.players.length;
        attempts++;
    }
    
    // Check if betting round is complete
    if (isBettingRoundComplete()) {
        advancePhase();
        return;
    }
    
    // Start turn
    const currentPlayer = PokerGame.players[PokerGame.currentPlayerIndex];
    
    if (currentPlayer.isAI) {
        // AI turn - add delay for realism
        disableActions();
        renderTable();
        setTimeout(() => {
            aiTakeTurn(currentPlayer);
        }, 1000 + Math.random() * 1500);
    } else {
        // Human turn
        enableActions();
        startTurnTimer();
    }
    
    renderTable();
}

function isBettingRoundComplete() {
    const activePlayers = PokerGame.players.filter(p => !p.folded && !p.allIn);
    
    if (activePlayers.length <= 1) return true;
    
    // Check if all active players have matched the current bet
    const allMatched = activePlayers.every(p => p.currentBet === PokerGame.currentBet);
    
    // Also check if everyone has had a chance to act
    const allActed = activePlayers.every(p => PokerGame.roundBets[p.id] > 0 || PokerGame.phase === 'preflop');
    
    return allMatched && (PokerGame.phase !== 'preflop' || allActed);
}

function advancePhase() {
    // Reset bets for new betting round
    for (const player of PokerGame.players) {
        player.currentBet = 0;
    }
    PokerGame.currentBet = 0;
    PokerGame.minRaise = BIG_BLIND;
    
    // Reset round bets tracking
    for (const id in PokerGame.roundBets) {
        PokerGame.roundBets[id] = 0;
    }
    
    switch (PokerGame.phase) {
        case 'preflop':
            // Deal flop
            PokerGame.phase = 'flop';
            PokerGame.communityCards.push(dealCard(), dealCard(), dealCard());
            break;
        case 'flop':
            // Deal turn
            PokerGame.phase = 'turn';
            PokerGame.communityCards.push(dealCard());
            break;
        case 'turn':
            // Deal river
            PokerGame.phase = 'river';
            PokerGame.communityCards.push(dealCard());
            break;
        case 'river':
            // Showdown
            PokerGame.phase = 'showdown';
            showdown();
            return;
    }
    
    // Update UI
    updateGameUI();
    renderCommunityCards();
    
    // Reset to first active player after dealer
    PokerGame.currentPlayerIndex = (PokerGame.dealerIndex + 1) % PokerGame.players.length;
    
    // Check if only one player remains
    const activePlayers = PokerGame.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
        awardPot(activePlayers[0]);
        return;
    }
    
    // Continue betting
    startBettingRound();
}

function showdown() {
    const activePlayers = PokerGame.players.filter(p => !p.folded);
    
    // Evaluate all hands
    for (const player of activePlayers) {
        player.hand = evaluateHand(player.holeCards, PokerGame.communityCards);
    }
    
    // Sort by hand strength
    activePlayers.sort((a, b) => compareHands(b.hand, a.hand));
    
    // Find winners (could be ties)
    const winners = [activePlayers[0]];
    for (let i = 1; i < activePlayers.length; i++) {
        if (compareHands(activePlayers[i].hand, winners[0].hand) === 0) {
            winners.push(activePlayers[i]);
        } else {
            break;
        }
    }
    
    // Split pot among winners
    const winAmount = Math.floor(PokerGame.pot / winners.length);
    for (const winner of winners) {
        winner.chips += winAmount;
    }
    
    // Show results
    showRoundResult(winners, activePlayers);
}

function awardPot(winner) {
    winner.chips += PokerGame.pot;
    showRoundResult([winner], [winner], true);
}

function showRoundResult(winners, participants, everyoneFolded = false) {
    const el = PokerGame.elements;
    
    let title, winnerHTML, message;
    
    if (everyoneFolded) {
        title = 'EVERYONE FOLDED';
        winnerHTML = `
            <div class="winner-name">${winners[0].name} wins!</div>
            <div class="winner-amount">+${PokerGame.pot} chips</div>
        `;
        message = 'All other players folded.';
    } else {
        title = 'SHOWDOWN';
        
        if (winners.length === 1) {
            winnerHTML = `
                <div class="winner-name">${winners[0].name} wins!</div>
                <div class="winner-hand">${winners[0].hand.name}</div>
                <div class="winner-amount">+${PokerGame.pot} chips</div>
            `;
        } else {
            winnerHTML = `
                <div class="winner-name">Split Pot!</div>
                <div class="winner-hand">${winners.map(w => w.name).join(' & ')}</div>
                <div class="winner-amount">+${Math.floor(PokerGame.pot / winners.length)} chips each</div>
            `;
        }
        
        message = participants.map(p => `${p.name}: ${p.hand.name}`).join('<br>');
    }
    
    // Check if human player is eliminated
    const myPlayer = PokerGame.players.find(p => p.id === PokerGame.myPlayerId);
    if (myPlayer && myPlayer.chips <= 0) {
        title = 'GAME OVER';
        message = 'You ran out of chips!';
        el.btnNextRound.textContent = 'PLAY AGAIN';
    } else {
        el.btnNextRound.textContent = 'NEXT ROUND';
    }
    
    el.gameOverTitle.textContent = title;
    el.winnerDisplay.innerHTML = winnerHTML;
    el.gameOverText.innerHTML = message;
    el.gameOverOverlay.classList.add('visible');
    
    // Also reveal all cards in UI
    renderTable(true);
    
    stopTurnTimer();
    PokerGame.round++;
}

function startNextRound() {
    const el = PokerGame.elements;
    el.gameOverOverlay.classList.remove('visible');
    
    const myPlayer = PokerGame.players.find(p => p.id === PokerGame.myPlayerId);
    if (myPlayer && myPlayer.chips <= 0) {
        // Restart game
        if (PokerGame.mode === 'single') {
            startSinglePlayerGame();
        }
    } else {
        startRound();
    }
}

function endGame() {
    const el = PokerGame.elements;
    const winner = PokerGame.players.find(p => p.chips > 0);
    
    el.gameOverTitle.textContent = 'GAME OVER';
    el.winnerDisplay.innerHTML = `
        <div class="winner-name">${winner ? winner.name : 'No one'} wins the game!</div>
    `;
    el.gameOverText.textContent = winner.id === PokerGame.myPlayerId ? 'Congratulations!' : 'Better luck next time!';
    el.btnNextRound.textContent = 'PLAY AGAIN';
    el.gameOverOverlay.classList.add('visible');
}

function quitGame() {
    PokerGame.isInGame = false;
    PokerGame.elements.gameOverOverlay.classList.remove('visible');
    
    if (PokerGame.mode === 'multiplayer') {
        cleanupPeer();
    }
    
    showScreen('screen-mode-select');
}

// ============================================
// PLAYER ACTIONS
// ============================================

function performAction(action, amount = 0) {
    const player = PokerGame.players[PokerGame.currentPlayerIndex];
    if (!player || player.id !== PokerGame.myPlayerId) return;
    
    stopTurnTimer();
    executeAction(player, action, amount);
}

function executeAction(player, action, amount = 0) {
    const toCall = PokerGame.currentBet - player.currentBet;
    
    switch (action) {
        case 'fold':
            player.folded = true;
            showPlayerAction(player.id, 'FOLD');
            break;
            
        case 'check':
            showPlayerAction(player.id, 'CHECK');
            break;
            
        case 'call':
            const callAmount = Math.min(toCall, player.chips);
            player.chips -= callAmount;
            player.currentBet += callAmount;
            PokerGame.pot += callAmount;
            PokerGame.roundBets[player.id] += callAmount;
            if (player.chips === 0) player.allIn = true;
            showPlayerAction(player.id, player.allIn ? 'ALL IN' : 'CALL');
            break;
            
        case 'raise':
            const raiseAmount = Math.min(amount, player.chips);
            player.chips -= raiseAmount;
            player.currentBet += raiseAmount;
            PokerGame.pot += raiseAmount;
            PokerGame.roundBets[player.id] += raiseAmount;
            PokerGame.currentBet = player.currentBet;
            PokerGame.minRaise = Math.max(PokerGame.minRaise, raiseAmount - toCall);
            if (player.chips === 0) player.allIn = true;
            showPlayerAction(player.id, player.allIn ? 'ALL IN' : 'RAISE');
            break;
            
        case 'all-in':
            const allInAmount = player.chips;
            player.chips = 0;
            player.currentBet += allInAmount;
            PokerGame.pot += allInAmount;
            PokerGame.roundBets[player.id] += allInAmount;
            if (player.currentBet > PokerGame.currentBet) {
                PokerGame.currentBet = player.currentBet;
            }
            player.allIn = true;
            showPlayerAction(player.id, 'ALL IN');
            break;
    }
    
    // Update UI
    updateGameUI();
    renderTable();
    
    // Check if only one player remains
    const activePlayers = PokerGame.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
        awardPot(activePlayers[0]);
        return;
    }
    
    // Move to next player
    nextPlayer();
}

function nextPlayer() {
    const numPlayers = PokerGame.players.length;
    let nextIndex = (PokerGame.currentPlayerIndex + 1) % numPlayers;
    let attempts = 0;
    
    while (attempts < numPlayers) {
        const player = PokerGame.players[nextIndex];
        if (!player.folded && !player.allIn && player.chips > 0) {
            break;
        }
        nextIndex = (nextIndex + 1) % numPlayers;
        attempts++;
    }
    
    PokerGame.currentPlayerIndex = nextIndex;
    
    // Check if betting round is complete
    if (isBettingRoundComplete()) {
        advancePhase();
    } else {
        startBettingRound();
    }
}

function showPlayerAction(playerId, action) {
    const seatEl = document.getElementById(`seat-${playerId}`);
    if (seatEl) {
        const existingAction = seatEl.querySelector('.seat-action');
        if (existingAction) existingAction.remove();
        
        const actionEl = document.createElement('div');
        actionEl.className = `seat-action ${action.toLowerCase().replace(' ', '-')}`;
        actionEl.textContent = action;
        seatEl.appendChild(actionEl);
        
        setTimeout(() => actionEl.remove(), 2000);
    }
}

// ============================================
// AI LOGIC
// ============================================

function aiTakeTurn(player) {
    const toCall = PokerGame.currentBet - player.currentBet;
    const canCheck = toCall === 0;
    
    // Evaluate hand strength
    const handStrength = evaluateAIHandStrength(player);
    
    // Make decision based on difficulty and hand strength
    const decision = makeAIDecision(player, handStrength, toCall, canCheck);
    
    executeAction(player, decision.action, decision.amount);
}

function evaluateAIHandStrength(player) {
    if (PokerGame.communityCards.length === 0) {
        // Preflop - evaluate starting hand
        return evaluatePreflopStrength(player.holeCards);
    } else {
        // Postflop - evaluate actual hand
        const hand = evaluateHand(player.holeCards, PokerGame.communityCards);
        return hand.rank / 10; // Normalize to 0-1
    }
}

function evaluatePreflopStrength(holeCards) {
    const c1 = holeCards[0];
    const c2 = holeCards[1];
    const v1 = VALUE_RANKS[c1.value];
    const v2 = VALUE_RANKS[c2.value];
    const suited = c1.suit === c2.suit;
    const paired = v1 === v2;
    
    let strength = 0;
    
    // High cards
    strength += (v1 + v2) / 28; // Max is 28 (A+A)
    
    // Pairs
    if (paired) {
        strength += 0.3;
        if (v1 >= 10) strength += 0.2; // High pair
    }
    
    // Suited
    if (suited) strength += 0.1;
    
    // Connected (for straights)
    const gap = Math.abs(v1 - v2);
    if (gap <= 4) strength += (5 - gap) * 0.03;
    
    // Premium hands bonus
    if (paired && v1 === 14) strength = 0.95; // AA
    if (paired && v1 === 13) strength = 0.9;  // KK
    if ((v1 === 14 && v2 === 13) || (v1 === 13 && v2 === 14)) strength = 0.85; // AK
    
    return Math.min(1, strength);
}

function makeAIDecision(player, handStrength, toCall, canCheck) {
    const difficulty = player.difficulty || 'medium';
    const pot = PokerGame.pot;
    const chips = player.chips;
    
    // Add randomness based on difficulty
    let randomFactor = Math.random();
    let threshold;
    
    switch (difficulty) {
        case 'easy':
            // Easy AI: more random, calls more often
            threshold = 0.3 + randomFactor * 0.2;
            if (handStrength > 0.6 || (canCheck && randomFactor > 0.3)) {
                if (canCheck) return { action: 'check', amount: 0 };
                if (randomFactor > 0.7 && handStrength > 0.7) {
                    const raiseAmount = Math.min(toCall + BIG_BLIND * 2, chips);
                    return { action: 'raise', amount: raiseAmount };
                }
                return { action: 'call', amount: 0 };
            }
            if (canCheck) return { action: 'check', amount: 0 };
            if (toCall < chips * 0.1 && randomFactor > 0.5) return { action: 'call', amount: 0 };
            return { action: 'fold', amount: 0 };
            
        case 'medium':
            // Medium AI: considers pot odds
            const potOdds = toCall / (pot + toCall);
            threshold = 0.4;
            
            if (handStrength > 0.7) {
                // Strong hand - raise
                if (randomFactor > 0.4) {
                    const raiseAmount = Math.min(toCall + pot * 0.5, chips);
                    return { action: 'raise', amount: raiseAmount };
                }
                return { action: 'call', amount: 0 };
            }
            
            if (handStrength > 0.5 || (handStrength > potOdds && canCheck)) {
                if (canCheck) return { action: 'check', amount: 0 };
                return { action: 'call', amount: 0 };
            }
            
            if (canCheck) return { action: 'check', amount: 0 };
            
            // Occasionally bluff
            if (randomFactor > 0.85 && chips > toCall * 3) {
                const raiseAmount = Math.min(toCall + pot * 0.75, chips);
                return { action: 'raise', amount: raiseAmount };
            }
            
            if (toCall < chips * 0.05 && randomFactor > 0.6) return { action: 'call', amount: 0 };
            return { action: 'fold', amount: 0 };
            
        case 'hard':
            // Hard AI: considers position, pot odds, implied odds, occasional bluffs
            const position = getPositionStrength(player.id);
            const effectivePotOdds = toCall / (pot + toCall);
            
            // Adjust hand strength based on position
            const adjustedStrength = handStrength + position * 0.1;
            
            if (adjustedStrength > 0.75) {
                // Very strong - raise for value
                const raiseAmount = Math.min(toCall + pot * (0.6 + randomFactor * 0.4), chips);
                return { action: 'raise', amount: raiseAmount };
            }
            
            if (adjustedStrength > 0.55) {
                // Good hand
                if (canCheck && randomFactor > 0.6) {
                    // Trap sometimes
                    return { action: 'check', amount: 0 };
                }
                if (randomFactor > 0.5) {
                    const raiseAmount = Math.min(toCall + pot * 0.5, chips);
                    return { action: 'raise', amount: raiseAmount };
                }
                return { action: 'call', amount: 0 };
            }
            
            if (adjustedStrength > effectivePotOdds + 0.1) {
                if (canCheck) return { action: 'check', amount: 0 };
                return { action: 'call', amount: 0 };
            }
            
            if (canCheck) return { action: 'check', amount: 0 };
            
            // Strategic bluff
            if (randomFactor > 0.9 && position > 0.6 && chips > toCall * 4) {
                const raiseAmount = Math.min(toCall + pot * 1.0, chips);
                return { action: 'raise', amount: raiseAmount };
            }
            
            // Reluctant call if pot odds are good
            if (toCall < pot * 0.2 && randomFactor > 0.4) return { action: 'call', amount: 0 };
            
            return { action: 'fold', amount: 0 };
    }
    
    return { action: 'fold', amount: 0 };
}

function getPositionStrength(playerId) {
    // Later position is better
    const numPlayers = PokerGame.players.length;
    const dealerDist = (playerId - PokerGame.dealerIndex + numPlayers) % numPlayers;
    return dealerDist / numPlayers;
}

// ============================================
// UI UPDATES
// ============================================

function updateGameUI() {
    const el = PokerGame.elements;
    const myPlayer = PokerGame.players.find(p => p.id === PokerGame.myPlayerId);
    
    if (myPlayer) {
        el.yourChips.textContent = myPlayer.chips;
    }
    
    el.potAmount.textContent = PokerGame.pot;
    el.roundDisplay.textContent = PokerGame.round;
    el.playersCount.textContent = PokerGame.players.filter(p => !p.folded).length;
    el.blindsDisplay.textContent = `${SMALL_BLIND}/${BIG_BLIND}`;
    
    // Update your cards
    if (myPlayer && myPlayer.holeCards.length > 0) {
        el.yourCards.innerHTML = myPlayer.holeCards.map(c => createCardHTML(c)).join('');
        
        // Show hand rank if community cards exist
        if (PokerGame.communityCards.length >= 3) {
            const hand = evaluateHand(myPlayer.holeCards, PokerGame.communityCards);
            el.handRank.textContent = hand.name;
        } else {
            el.handRank.textContent = '';
        }
    }
    
    renderCommunityCards();
}

function renderCommunityCards() {
    const cards = PokerGame.communityCards;
    const slots = ['flop-1', 'flop-2', 'flop-3', 'turn-card', 'river-card'];
    
    slots.forEach((slotId, index) => {
        const slot = document.getElementById(slotId);
        if (cards[index]) {
            slot.innerHTML = createCardHTML(cards[index]);
            slot.classList.remove('community-card-slot');
        } else {
            slot.innerHTML = '';
            slot.classList.add('community-card-slot');
        }
    });
}

function renderTable(showAllCards = false) {
    // Render each seat
    for (let i = 0; i < PokerGame.players.length; i++) {
        const player = PokerGame.players[i];
        const seatEl = document.getElementById(`seat-${i}`);
        if (!seatEl) continue;
        
        const isCurrentTurn = i === PokerGame.currentPlayerIndex;
        const isDealer = i === PokerGame.dealerIndex;
        const showCards = showAllCards || (player.id === PokerGame.myPlayerId);
        
        seatEl.className = 'player-seat';
        if (player.folded) seatEl.classList.add('folded');
        if (isCurrentTurn) seatEl.classList.add('current-turn');
        
        seatEl.innerHTML = `
            <div class="seat-avatar ${isDealer ? 'dealer' : ''}">${player.avatar || '🎭'}</div>
            <div class="seat-info">
                <div class="seat-name">${player.name}</div>
                <div class="seat-chips">${player.chips}</div>
            </div>
            <div class="seat-cards">
                ${player.holeCards.map(c => createCardHTML(c, !showCards && !player.folded, true)).join('')}
            </div>
            ${player.currentBet > 0 ? `<div class="seat-bet">${player.currentBet}</div>` : ''}
        `;
    }
    
    // Clear unused seats
    for (let i = PokerGame.players.length; i < 7; i++) {
        const seatEl = document.getElementById(`seat-${i}`);
        if (seatEl) seatEl.innerHTML = '';
    }
}

function enableActions() {
    const el = PokerGame.elements;
    const myPlayer = PokerGame.players.find(p => p.id === PokerGame.myPlayerId);
    if (!myPlayer || myPlayer.folded) return;
    
    const toCall = PokerGame.currentBet - myPlayer.currentBet;
    const canCheck = toCall === 0;
    
    el.btnFold.disabled = false;
    el.btnCheck.disabled = !canCheck;
    el.btnCheck.classList.toggle('hidden', !canCheck);
    el.btnCall.disabled = canCheck;
    el.btnCall.classList.toggle('hidden', canCheck);
    el.callAmount.textContent = toCall > 0 ? toCall : '';
    el.btnRaise.disabled = myPlayer.chips <= toCall;
    el.btnAllIn.disabled = false;
    
    // Hide raise controls when re-enabling actions
    el.raiseControls.classList.add('hidden');
}

function disableActions() {
    const el = PokerGame.elements;
    el.btnFold.disabled = true;
    el.btnCheck.disabled = true;
    el.btnCall.disabled = true;
    el.btnRaise.disabled = true;
    el.btnAllIn.disabled = true;
    el.raiseControls.classList.add('hidden');
}

function toggleRaiseControls() {
    const el = PokerGame.elements;
    const isVisible = !el.raiseControls.classList.contains('hidden');
    
    if (isVisible) {
        el.raiseControls.classList.add('hidden');
    } else {
        const myPlayer = PokerGame.players.find(p => p.id === PokerGame.myPlayerId);
        const toCall = PokerGame.currentBet - myPlayer.currentBet;
        const minRaise = toCall + PokerGame.minRaise;
        const maxRaise = myPlayer.chips;
        
        el.raiseSlider.min = minRaise;
        el.raiseSlider.max = maxRaise;
        el.raiseSlider.value = minRaise;
        updateRaiseDisplay();
        
        el.raiseControls.classList.remove('hidden');
    }
}

function updateRaiseDisplay() {
    const el = PokerGame.elements;
    el.raiseAmountDisplay.textContent = el.raiseSlider.value;
}

function confirmRaise() {
    const amount = parseInt(PokerGame.elements.raiseSlider.value);
    performAction('raise', amount);
}

// ============================================
// TURN TIMER
// ============================================

function startTurnTimer() {
    const el = PokerGame.elements;
    PokerGame.turnTimeLeft = TURN_TIME;
    el.turnTimer.textContent = TURN_TIME;
    el.turnTimer.classList.remove('hidden', 'warning', 'critical');
    
    if (PokerGame.turnTimer) clearInterval(PokerGame.turnTimer);
    
    PokerGame.turnTimer = setInterval(() => {
        PokerGame.turnTimeLeft--;
        el.turnTimer.textContent = PokerGame.turnTimeLeft;
        
        if (PokerGame.turnTimeLeft <= 10) {
            el.turnTimer.classList.add('warning');
        }
        if (PokerGame.turnTimeLeft <= 5) {
            el.turnTimer.classList.remove('warning');
            el.turnTimer.classList.add('critical');
        }
        
        if (PokerGame.turnTimeLeft <= 0) {
            // Auto-fold or check
            stopTurnTimer();
            const toCall = PokerGame.currentBet - PokerGame.players[PokerGame.myPlayerId].currentBet;
            performAction(toCall === 0 ? 'check' : 'fold');
        }
    }, 1000);
}

function stopTurnTimer() {
    if (PokerGame.turnTimer) {
        clearInterval(PokerGame.turnTimer);
        PokerGame.turnTimer = null;
    }
    PokerGame.elements.turnTimer.classList.add('hidden');
}

// ============================================
// MULTIPLAYER (PeerJS)
// ============================================

function initializePeer() {
    const el = PokerGame.elements;
    
    el.connectionStatus.className = 'connection-status connecting';
    el.connectionText.textContent = 'Connecting to server...';
    el.btnCreateRoom.disabled = true;
    el.btnJoinRoom.disabled = true;
    
    // Generate unique ID
    const peerId = 'poker_' + Math.random().toString(36).substr(2, 9);
    
    PokerGame.peer = new Peer(peerId, {
        debug: 1
    });
    
    PokerGame.peer.on('open', (id) => {
        console.log('Connected to PeerJS server with ID:', id);
        el.connectionStatus.className = 'connection-status connected';
        el.connectionText.textContent = 'Connected!';
        el.btnCreateRoom.disabled = false;
        el.btnJoinRoom.disabled = false;
    });
    
    PokerGame.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        el.connectionStatus.className = 'connection-status error';
        el.connectionText.textContent = 'Connection failed. Try refreshing.';
    });
    
    PokerGame.peer.on('connection', (conn) => {
        handleIncomingConnection(conn);
    });
}

function cleanupPeer() {
    if (PokerGame.peer) {
        PokerGame.peer.destroy();
        PokerGame.peer = null;
    }
    PokerGame.connections = {};
    PokerGame.roomCode = null;
    PokerGame.isHost = false;
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function createRoom() {
    PokerGame.isHost = true;
    PokerGame.roomCode = generateRoomCode();
    
    // The room code is used as part of the peer ID for discoverability
    // We'll create a "room" peer that others can connect to
    const roomPeerId = 'pokerroom_' + PokerGame.roomCode;
    
    // Reinitialize peer with room ID
    if (PokerGame.peer) PokerGame.peer.destroy();
    
    PokerGame.peer = new Peer(roomPeerId, { debug: 1 });
    
    PokerGame.peer.on('open', () => {
        console.log('Room created:', PokerGame.roomCode);
        
        // Initialize players list with host
        PokerGame.players = [{
            id: 0,
            peerId: roomPeerId,
            name: 'Host (You)',
            chips: STARTING_CHIPS,
            isHost: true,
            avatar: '😎'
        }];
        
        PokerGame.myPlayerId = 0;
        
        showScreen('screen-waiting-room');
        updateWaitingRoom();
        
        PokerGame.elements.btnStartGame.disabled = true; // Need at least 2 players
    });
    
    PokerGame.peer.on('connection', handleIncomingConnection);
    
    PokerGame.peer.on('error', (err) => {
        console.error('Room creation error:', err);
        alert('Failed to create room. The code might be taken. Try again.');
        showScreen('screen-multiplayer-lobby');
        initializePeer();
    });
}

function joinRoom() {
    const code = PokerGame.elements.roomCodeInput.value.toUpperCase();
    if (code.length !== 6) {
        alert('Please enter a valid 6-character room code');
        return;
    }
    
    PokerGame.roomCode = code;
    PokerGame.isHost = false;
    
    const roomPeerId = 'pokerroom_' + code;
    
    const conn = PokerGame.peer.connect(roomPeerId, { reliable: true });
    
    conn.on('open', () => {
        console.log('Connected to room:', code);
        PokerGame.connections['host'] = conn;
        
        // Send join request
        conn.send({
            type: 'join',
            name: 'Player ' + Math.floor(Math.random() * 1000),
            avatar: PLAYER_AVATARS[Math.floor(Math.random() * PLAYER_AVATARS.length)]
        });
        
        showScreen('screen-waiting-room');
    });
    
    conn.on('data', (data) => handleMessage(conn, data));
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        alert('Failed to join room. Check the code and try again.');
    });
    
    conn.on('close', () => {
        if (PokerGame.isInGame) {
            alert('Disconnected from host.');
            quitGame();
        }
    });
}

function handleIncomingConnection(conn) {
    console.log('Incoming connection:', conn.peer);
    
    conn.on('open', () => {
        PokerGame.connections[conn.peer] = conn;
    });
    
    conn.on('data', (data) => handleMessage(conn, data));
    
    conn.on('close', () => {
        delete PokerGame.connections[conn.peer];
        
        if (PokerGame.isHost) {
            // Remove player from list
            PokerGame.players = PokerGame.players.filter(p => p.peerId !== conn.peer);
            updateWaitingRoom();
            // Use appropriate broadcast based on game state
            if (PokerGame.isInGame) {
                broadcastGameState();
            } else {
                broadcastPlayersUpdate();
            }
        }
    });
}

function handleMessage(conn, data) {
    console.log('Received message:', data.type, data);
    
    switch (data.type) {
        case 'join':
            if (PokerGame.isHost) {
                handlePlayerJoin(conn, data);
            }
            break;
            
        case 'joined':
            // We successfully joined, update our player info
            PokerGame.myPlayerId = data.playerId;
            PokerGame.players = data.players;
            updateWaitingRoom();
            break;
            
        case 'players-update':
            PokerGame.players = data.players;
            updateWaitingRoom();
            break;
            
        case 'game-start':
            PokerGame.players = data.players;
            PokerGame.isInGame = true;
            showScreen('screen-game');
            PokerGame.elements.chatContainer.classList.remove('hidden');
            // Non-host players wait for game state
            break;
            
        case 'game-state':
            // Full game state sync
            PokerGame.deck = data.deck || PokerGame.deck;
            PokerGame.communityCards = data.communityCards;
            PokerGame.pot = data.pot;
            PokerGame.currentBet = data.currentBet;
            PokerGame.minRaise = data.minRaise;
            PokerGame.phase = data.phase;
            PokerGame.round = data.round;
            PokerGame.dealerIndex = data.dealerIndex;
            PokerGame.currentPlayerIndex = data.currentPlayerIndex;
            PokerGame.players = data.players;
            PokerGame.roundBets = data.roundBets;
            
            updateGameUI();
            renderTable();
            
            // Enable actions if it's our turn
            if (PokerGame.currentPlayerIndex === PokerGame.myPlayerId) {
                enableActions();
                startTurnTimer();
            } else {
                disableActions();
                stopTurnTimer();
            }
            break;
            
        case 'action':
            // Another player performed an action
            if (PokerGame.isHost) {
                const player = PokerGame.players.find(p => p.id === data.playerId);
                if (player) {
                    executeAction(player, data.action, data.amount);
                }
            }
            break;
            
        case 'round-result':
            showRoundResult(data.winners, data.participants, data.everyoneFolded);
            break;
            
        case 'chat':
            addChatMessage(data.sender, data.text);
            break;
    }
}

function handlePlayerJoin(conn, data) {
    if (PokerGame.players.length >= 6) {
        conn.send({ type: 'error', message: 'Room is full' });
        return;
    }
    
    const newPlayer = {
        id: PokerGame.players.length,
        peerId: conn.peer,
        name: data.name || 'Player ' + PokerGame.players.length,
        chips: STARTING_CHIPS,
        isHost: false,
        avatar: data.avatar || '🎭'
    };
    
    PokerGame.players.push(newPlayer);
    
    // Send confirmation to joining player
    conn.send({
        type: 'joined',
        playerId: newPlayer.id,
        players: PokerGame.players.map(p => ({
            id: p.id,
            name: p.name,
            chips: p.chips,
            isHost: p.isHost,
            avatar: p.avatar
        }))
    });
    
    // Broadcast player list to all connected players
    broadcastPlayersUpdate();
    updateWaitingRoom();
}

function broadcastPlayersUpdate() {
    const playersData = PokerGame.players.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        isHost: p.isHost,
        avatar: p.avatar
    }));
    
    Object.values(PokerGame.connections).forEach(conn => {
        conn.send({
            type: 'players-update',
            players: playersData
        });
    });
}

function broadcastGameState() {
    const state = {
        type: 'game-state',
        communityCards: PokerGame.communityCards,
        pot: PokerGame.pot,
        currentBet: PokerGame.currentBet,
        minRaise: PokerGame.minRaise,
        phase: PokerGame.phase,
        round: PokerGame.round,
        dealerIndex: PokerGame.dealerIndex,
        currentPlayerIndex: PokerGame.currentPlayerIndex,
        roundBets: PokerGame.roundBets,
        players: PokerGame.players.map(p => ({
            id: p.id,
            name: p.name,
            chips: p.chips,
            holeCards: p.holeCards,
            folded: p.folded,
            allIn: p.allIn,
            currentBet: p.currentBet,
            avatar: p.avatar
        }))
    };
    
    Object.values(PokerGame.connections).forEach(conn => {
        // Send player-specific state (hide other players' cards)
        const playerState = { ...state };
        playerState.players = state.players.map(p => {
            const player = { ...p };
            // Hide hole cards from other players (except during showdown)
            const recipientId = PokerGame.players.find(pl => pl.peerId === conn.peer)?.id;
            if (player.id !== recipientId && PokerGame.phase !== 'showdown') {
                player.holeCards = player.holeCards.map(() => ({ hidden: true }));
            }
            return player;
        });
        conn.send(playerState);
    });
}

function updateWaitingRoom() {
    const el = PokerGame.elements;
    
    el.displayRoomCode.textContent = PokerGame.roomCode || '------';
    
    const listHTML = PokerGame.players.map((p, i) => `
        <div class="player-slot">
            <span class="player-icon">${p.avatar || '🎭'}</span>
            <span class="player-name">${p.name}${p.id === PokerGame.myPlayerId ? ' (You)' : ''}</span>
            <span class="player-status ${p.isHost ? 'host' : 'ready'}">${p.isHost ? 'HOST' : 'READY'}</span>
        </div>
    `).join('');
    
    // Add empty slots
    const emptySlots = Array(6 - PokerGame.players.length).fill(`
        <div class="player-slot empty">
            <span class="player-icon">⬜</span>
            <span class="player-name">Waiting...</span>
        </div>
    `).join('');
    
    el.playersList.innerHTML = `
        <div class="players-list-title">PLAYERS (${PokerGame.players.length}/6)</div>
        ${listHTML}
        ${emptySlots}
    `;
    
    // Enable start button for host if enough players
    if (PokerGame.isHost) {
        el.btnStartGame.disabled = PokerGame.players.length < 2;
    } else {
        el.btnStartGame.classList.add('hidden');
    }
    
    el.waitingSubtitle.textContent = PokerGame.isHost ? 
        'Share the room code with friends!' : 
        'Waiting for host to start...';
}

function leaveRoom() {
    cleanupPeer();
    showScreen('screen-multiplayer-lobby');
    initializePeer();
}

function startMultiplayerGame() {
    if (!PokerGame.isHost || PokerGame.players.length < 2) return;
    
    PokerGame.isInGame = true;
    PokerGame.round = 1;
    PokerGame.dealerIndex = Math.floor(Math.random() * PokerGame.players.length);
    
    // Initialize all players
    for (const player of PokerGame.players) {
        player.holeCards = [];
        player.folded = false;
        player.allIn = false;
        player.currentBet = 0;
        player.isAI = false;
    }
    
    // Broadcast game start
    Object.values(PokerGame.connections).forEach(conn => {
        conn.send({
            type: 'game-start',
            players: PokerGame.players.map(p => ({
                id: p.id,
                name: p.name,
                chips: p.chips,
                avatar: p.avatar
            }))
        });
    });
    
    showScreen('screen-game');
    PokerGame.elements.chatContainer.classList.remove('hidden');
    startRound();
}

// Override executeAction for multiplayer
const originalExecuteAction = executeAction;
executeAction = function(player, action, amount = 0) {
    // If multiplayer and not host, send action to host
    if (PokerGame.mode === 'multiplayer' && !PokerGame.isHost && player.id === PokerGame.myPlayerId) {
        const hostConn = PokerGame.connections['host'];
        if (hostConn) {
            hostConn.send({
                type: 'action',
                playerId: player.id,
                action: action,
                amount: amount
            });
        }
        return;
    }
    
    // Original logic (for single player or host)
    originalExecuteAction(player, action, amount);
    
    // If multiplayer host, broadcast state after action
    if (PokerGame.mode === 'multiplayer' && PokerGame.isHost) {
        broadcastGameState();
    }
};

// Chat functions
function sendChatMessage() {
    const el = PokerGame.elements;
    const text = el.chatInput.value.trim();
    if (!text) return;
    
    const myPlayer = PokerGame.players.find(p => p.id === PokerGame.myPlayerId);
    const sender = myPlayer ? myPlayer.name : 'Unknown';
    
    // Add locally
    addChatMessage(sender, text);
    
    // Broadcast
    if (PokerGame.mode === 'multiplayer') {
        const message = { type: 'chat', sender, text };
        Object.values(PokerGame.connections).forEach(conn => conn.send(message));
    }
    
    el.chatInput.value = '';
}

function addChatMessage(sender, text, isSystem = false) {
    const el = PokerGame.elements;
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message' + (isSystem ? ' system' : '');
    
    if (isSystem) {
        msgEl.textContent = text;
    } else {
        msgEl.innerHTML = `<span class="sender">${sender}:</span> <span class="text">${text}</span>`;
    }
    
    el.chatMessages.appendChild(msgEl);
    el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
}

// Make PokerGame globally accessible
window.PokerGame = PokerGame;
