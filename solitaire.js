/**
 * solitaire.js
 * Retro Solitaire (Klondike)
 */

const SUITS = ['h', 'd', 'c', 's'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COST_TO_PLAY = 10;
const WIN_REWARD = 50;

let deck = [];
let tableau = [[], [], [], [], [], [], []];
let foundation = [[], [], [], []];
let stock = [];
let waste = [];
let selectedCard = null; // { location: 'tableau'|'waste'|'foundation', index: 0, cardIndex: 0 }
let isGameActive = false;
let startTime = 0;
let timerInterval = null;
let moves = 0;
let wallet = 1000;

// --- DOM ---
const stockPileEl = document.getElementById('stock-pile');
const wastePileEl = document.getElementById('waste-pile');
const foundationEls = [0, 1, 2, 3].map(i => document.getElementById(`foundation-${i}`));
const tableauEls = [0, 1, 2, 3, 4, 5, 6].map(i => document.getElementById(`tableau-${i}`));
const btnNewGame = document.getElementById('btn-new-game');
const statusMsg = document.getElementById('status-msg');
const walletDisplay = document.getElementById('wallet-display');
const movesDisplay = document.getElementById('moves-display');
const timeDisplay = document.getElementById('time-display');

document.addEventListener('DOMContentLoaded', () => {
    loadWallet();
    btnNewGame.addEventListener('click', startNewGame);
    stockPileEl.addEventListener('click', drawCard);
    document.getElementById('stock-placeholder').addEventListener('click', recycleWaste);
    
    // Global Deselect if clicking background
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.sol-card') && !e.target.closest('.card-pile') && !e.target.closest('.foundation-slot') && !e.target.closest('.tableau-col')) {
            deselect();
        }
    });
});

function loadWallet() {
    const saved = localStorage.getItem('gameWallet');
    if (saved) wallet = parseInt(saved);
    updateWalletDisplay();
}

function updateWalletDisplay() {
    walletDisplay.innerText = `$${wallet}`;
    localStorage.setItem('gameWallet', wallet);
}

function startNewGame() {
    if (wallet < COST_TO_PLAY) {
        if (wallet < 10) {
            wallet += 500; // Bankruptcy protection
            alert("Bankrupt! Here's $500 on the house.");
        } else {
            alert("Not enough funds!");
            return;
        }
    }

    wallet -= COST_TO_PLAY;
    updateWalletDisplay();

    // Reset State
    deck = createDeck();
    shuffle(deck);
    tableau = [[], [], [], [], [], [], []];
    foundation = [[], [], [], []];
    stock = [];
    waste = [];
    moves = 0;
    movesDisplay.innerText = "0";
    clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(updateTime, 1000);
    isGameActive = true;
    statusMsg.innerText = "Good Luck!";
    
    // Deal
    // 1. Fill Tableau
    // Col 0: 1 card, Col 1: 2 cards...
    let cardIdx = 0;
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j <= i; j++) {
            let card = deck[cardIdx++];
            if (j === i) card.faceUp = true; // Top card face up
            else card.faceUp = false;
            tableau[i].push(card);
        }
    }
    
    // 2. Rest to Stock
    while (cardIdx < deck.length) {
        let card = deck[cardIdx++];
        card.faceUp = false;
        stock.push(card);
    }

    renderBoard();
}

function createDeck() {
    let d = [];
    for (let s of SUITS) {
        for (let v of VALUES) {
            d.push({ suit: s, value: v, color: (s === 'h' || s === 'd') ? 'red' : 'black', faceUp: false });
        }
    }
    return d;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- Interaction Logic ---

function drawCard() {
    if (!isGameActive) return;
    deselect();
    
    if (stock.length > 0) {
        let card = stock.pop();
        card.faceUp = true;
        waste.push(card);
        moveMade();
    }
    renderBoard();
}

function recycleWaste() {
    if (!isGameActive) return;
    if (stock.length === 0 && waste.length > 0) {
        // Waste to Stock (reverse order, face down)
        while (waste.length > 0) {
            let card = waste.pop();
            card.faceUp = false;
            stock.push(card);
        }
        moveMade();
        renderBoard();
    }
}

function handleCardClick(card, location, index, cardIndex) {
    if (!isGameActive) return;
    if (!card.faceUp) {
        // If clicking a face-down top card in tableau, flip it? 
        // Logic handles this automatically after moves.
        // If deeper face down card, ignore.
        return;
    }

    if (selectedCard) {
        // Attempt move TO this card/stack
        if (selectedCard.location === location && selectedCard.index === index && selectedCard.cardIndex === cardIndex) {
            deselect(); // Clicked self -> deselect
        } else {
            attemptMove(location, index); // Try to move selected card TO location
        }
    } else {
        // Select this card
        selectCard(location, index, cardIndex);
    }
}

function handleEmptySlotClick(location, index) {
    if (!isGameActive || !selectedCard) return;
    attemptMove(location, index);
}

function selectCard(location, index, cardIndex) {
    // Can only select from waste (top), foundation (top), tableau (any face up)
    if (location === 'waste') {
        selectedCard = { location, index, cardIndex, card: waste[waste.length-1] };
    } else if (location === 'foundation') {
         selectedCard = { location, index, cardIndex, card: foundation[index][foundation[index].length-1] };
    } else if (location === 'tableau') {
        selectedCard = { location, index, cardIndex, card: tableau[index][cardIndex] };
    }
    renderBoard(); // Re-render to show highlight
}

function deselect() {
    selectedCard = null;
    renderBoard();
}

function attemptMove(toLoc, toIndex) {
    // Source
    let fromCard = selectedCard.card;
    
    // Destination Validation
    let valid = false;
    
    if (toLoc === 'foundation') {
        // Rule: Ascending, Same Suit
        // Can only move ONE card at a time to foundation
        // Check if we are moving a stack from tableau?
        let isSingleCard = true;
        if (selectedCard.location === 'tableau') {
            if (selectedCard.cardIndex !== tableau[selectedCard.index].length - 1) isSingleCard = false;
        }
        
        if (isSingleCard) {
            let targetPile = foundation[toIndex];
            let topTarget = targetPile.length > 0 ? targetPile[targetPile.length-1] : null;
            
            // Check Suit of foundation slot vs card
            // Foundation slots are hardcoded 0=h, 1=d, 2=c, 3=s in HTML data-suit, 
            // but let's just enforce suit matching if pile not empty, 
            // OR if empty, accept Ace of matching suit? 
            // Actually standard solitaire foundation piles accept matching suit starting with Ace.
            // My HTML has dedicated slots for suits, let's enforce that.
            const suits = ['h', 'd', 'c', 's'];
            const targetSuit = suits[toIndex];
            
            if (fromCard.suit === targetSuit) {
                if (!topTarget && fromCard.value === 'A') valid = true;
                else if (topTarget && getValRank(fromCard.value) === getValRank(topTarget.value) + 1) valid = true;
            }
        }
    } else if (toLoc === 'tableau') {
        // Rule: Descending, Alternate Color
        let targetPile = tableau[toIndex];
        let topTarget = targetPile.length > 0 ? targetPile[targetPile.length-1] : null;
        
        if (!topTarget) {
            // King only on empty spot
            if (fromCard.value === 'K') valid = true;
        } else {
            if (fromCard.color !== topTarget.color && getValRank(fromCard.value) === getValRank(topTarget.value) - 1) {
                valid = true;
            }
        }
    }
    
    if (valid) {
        executeMove(toLoc, toIndex);
    } else {
        // Invalid move feedback?
        deselect();
    }
}

function executeMove(toLoc, toIndex) {
    // 1. Remove from source
    let movingCards = [];
    if (selectedCard.location === 'waste') {
        movingCards.push(waste.pop());
    } else if (selectedCard.location === 'foundation') {
        movingCards.push(foundation[selectedCard.index].pop());
    } else if (selectedCard.location === 'tableau') {
        let pile = tableau[selectedCard.index];
        movingCards = pile.splice(selectedCard.cardIndex); // Take all from index to end
        
        // Auto-flip next card below if exists
        if (pile.length > 0 && !pile[pile.length-1].faceUp) {
            pile[pile.length-1].faceUp = true;
        }
    }
    
    // 2. Add to dest
    if (toLoc === 'foundation') {
        foundation[toIndex].push(movingCards[0]);
    } else if (toLoc === 'tableau') {
        tableau[toIndex] = tableau[toIndex].concat(movingCards);
    }
    
    moveMade();
    deselect();
    checkWin();
}

function getValRank(v) {
    return VALUES.indexOf(v);
}

function moveMade() {
    moves++;
    movesDisplay.innerText = moves;
    renderBoard();
}

// --- Rendering ---

function renderBoard() {
    // Stock
    stockPileEl.innerHTML = '';
    if (stock.length > 0) {
        stockPileEl.appendChild(createCardEl(null, false)); // Just a back
    }
    
    // Waste
    wastePileEl.innerHTML = '';
    if (waste.length > 0) {
        let top = waste[waste.length-1];
        let el = createCardEl(top, true);
        if (selectedCard && selectedCard.location === 'waste') el.classList.add('selected');
        el.onclick = () => handleCardClick(top, 'waste', 0, 0);
        wastePileEl.appendChild(el);
    }
    
    // Foundations
    foundation.forEach((pile, i) => {
        let el = foundationEls[i];
        el.innerHTML = '<span class="suit-icon ' + (i<2?'red':'black') + '">' + getSuitSymbol(['h','d','c','s'][i]) + '</span>'; // Reset background icon
        el.onclick = () => handleEmptySlotClick('foundation', i); // Handle empty click
        
        if (pile.length > 0) {
            let top = pile[pile.length-1];
            let cardEl = createCardEl(top, true);
            if (selectedCard && selectedCard.location === 'foundation' && selectedCard.index === i) cardEl.classList.add('selected');
            cardEl.onclick = (e) => { e.stopPropagation(); handleCardClick(top, 'foundation', i, 0); };
            el.appendChild(cardEl);
        }
    });
    
    // Tableau
    tableau.forEach((pile, i) => {
        let colEl = tableauEls[i];
        colEl.innerHTML = '';
        colEl.onclick = (e) => { 
            // Only trigger empty click if hitting the col directly (not a card)
            if (e.target === colEl) handleEmptySlotClick('tableau', i);
        };
        
        pile.forEach((card, cIndex) => {
            let el = createCardEl(card, card.faceUp);
            el.style.top = (cIndex * 25) + 'px'; // Cascade
            if (selectedCard && selectedCard.location === 'tableau' && selectedCard.index === i && selectedCard.cardIndex === cIndex) {
                el.classList.add('selected');
            }
            // Highlight stack if parent selected
            if (selectedCard && selectedCard.location === 'tableau' && selectedCard.index === i && cIndex > selectedCard.cardIndex) {
                 el.classList.add('selected'); // Visually select whole stack
            }
            
            el.onclick = (e) => { e.stopPropagation(); handleCardClick(card, 'tableau', i, cIndex); };
            colEl.appendChild(el);
        });
    });
}

function createCardEl(cardData, faceUp) {
    const div = document.createElement('div');
    div.className = 'sol-card';
    
    if (!faceUp) {
        div.innerHTML = '<div class="card-back"></div>';
    } else {
        let sSym = getSuitSymbol(cardData.suit);
        div.innerHTML = `
            <div class="card-front ${cardData.color}">
                <div class="card-top">
                    <span class="card-val">${cardData.value}</span>
                    <span class="card-suit">${sSym}</span>
                </div>
                <div class="card-center">${sSym}</div>
                <div class="card-bottom">
                    <span class="card-val">${cardData.value}</span>
                    <span class="card-suit">${sSym}</span>
                </div>
            </div>
        `;
    }
    return div;
}

function getSuitSymbol(s) {
    if (s === 'h') return '♥';
    if (s === 'd') return '♦';
    if (s === 'c') return '♣';
    if (s === 's') return '♠';
    return '?';
}

function updateTime() {
    let now = Date.now();
    let diff = Math.floor((now - startTime) / 1000);
    let m = Math.floor(diff / 60).toString().padStart(2, '0');
    let s = (diff % 60).toString().padStart(2, '0');
    timeDisplay.innerText = `${m}:${s}`;
}

function checkWin() {
    let count = 0;
    foundation.forEach(p => count += p.length);
    if (count === 52) {
        clearInterval(timerInterval);
        isGameActive = false;
        wallet += WIN_REWARD;
        updateWalletDisplay();
        statusMsg.innerText = `VICTORY! Won $${WIN_REWARD}`;
        statusMsg.style.color = "#0f0";
        alert("YOU WIN! Deck Cleared.");
    }
}
