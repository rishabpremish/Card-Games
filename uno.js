// Uno Game Logic

const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
const WILD_TYPES = ['wild', 'wild4'];

class UnoGame {
    constructor() {
        this.deck = [];
        this.discardPile = [];
        this.players = [];
        this.currentPlayerIndex = 0;
        this.direction = 1; // 1 or -1
        this.gameActive = false;
        
        // Settings
        this.aiCount = 3;
        
        // DOM Elements
        this.ui = {
            playerHand: document.getElementById('player-hand'),
            discardPile: document.getElementById('discard-pile'),
            drawPile: document.getElementById('draw-pile'),
            status: document.getElementById('game-status'),
            direction: document.getElementById('direction-indicator'),
            opponents: [
                { el: document.getElementById('cpu-1'), hand: document.getElementById('cpu-1-hand') },
                { el: document.getElementById('cpu-2'), hand: document.getElementById('cpu-2-hand') },
                { el: document.getElementById('cpu-3'), hand: document.getElementById('cpu-3-hand') }
            ],
            colorModal: document.getElementById('color-picker-modal'),
            gameOverModal: document.getElementById('game-over-modal'),
            unoBtn: document.getElementById('uno-shout-btn'),
            passBtn: document.getElementById('pass-btn')
        };

        this.init();
    }

    init() {
        // Event Listeners
        this.ui.drawPile.addEventListener('click', () => this.humanDraw());
        this.ui.passBtn.addEventListener('click', () => {
            this.ui.passBtn.style.display = 'none';
            this.nextTurn();
        });
        
        // Color Picker
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.resolveWild(e.target.dataset.color);
            });
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.ui.gameOverModal.classList.remove('visible');
            this.startNewGame();
        });

        this.startNewGame();
    }

    startNewGame() {
        this.createDeck();
        this.shuffleDeck();
        this.createPlayers();
        this.dealHands();
        
        this.discardPile = [this.deck.pop()];
        // Ensure first card isn't a Wild Draw 4 (standard rule, but simpler to just redraw if wild)
        while(this.discardPile[0].type === 'wild4') {
            this.deck.push(this.discardPile.pop());
            this.shuffleDeck();
            this.discardPile.push(this.deck.pop());
        }

        this.currentPlayerIndex = 0;
        this.direction = 1;
        this.gameActive = true;
        this.waitingForColor = false;

        this.updateUI();
        this.startTurn();
    }

    createDeck() {
        this.deck = [];
        
        COLORS.forEach(color => {
            // 0 (one per color)
            this.deck.push({ color, value: '0', type: 'number' });
            
            // 1-9 (two per color)
            for(let i=1; i<=9; i++) {
                this.deck.push({ color, value: i.toString(), type: 'number' });
                this.deck.push({ color, value: i.toString(), type: 'number' });
            }

            // Actions (two per color)
            ['skip', 'reverse', 'draw2'].forEach(val => {
                this.deck.push({ color, value: val, type: 'action' });
                this.deck.push({ color, value: val, type: 'action' });
            });
        });

        // Wilds (4 each)
        for(let i=0; i<4; i++) {
            this.deck.push({ color: 'black', value: 'wild', type: 'wild' });
            this.deck.push({ color: 'black', value: 'wild4', type: 'wild4' });
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    createPlayers() {
        this.players = [
            { id: 0, name: 'You', hand: [], isHuman: true },
            { id: 1, name: 'CPU 1', hand: [], isHuman: false },
            { id: 2, name: 'CPU 2', hand: [], isHuman: false },
            { id: 3, name: 'CPU 3', hand: [], isHuman: false }
        ];
    }

    dealHands() {
        for(let i=0; i<7; i++) {
            this.players.forEach(p => {
                if(this.deck.length === 0) this.reshuffleDiscard();
                p.hand.push(this.deck.pop());
            });
        }
    }

    reshuffleDiscard() {
        if(this.discardPile.length <= 1) return;
        const top = this.discardPile.pop();
        this.deck = [...this.discardPile];
        this.discardPile = [top];
        this.shuffleDeck();
        console.log("Reshuffled deck");
    }

    getTopCard() {
        return this.discardPile[this.discardPile.length - 1];
    }

    startTurn() {
        if(!this.gameActive) return;

        const player = this.players[this.currentPlayerIndex];
        this.ui.passBtn.style.display = 'none'; // Ensure hidden at start of turn
        this.updateUI();

        // Check Winner
        if(player.hand.length === 0) {
            this.endGame(player);
            return;
        }

        if(player.isHuman) {
            this.ui.status.textContent = "Your Turn!";
            this.ui.status.style.color = "var(--retro-yellow)";
        } else {
            this.ui.status.textContent = `${player.name} is thinking...`;
            this.ui.status.style.color = "var(--text-secondary)";
            setTimeout(() => this.aiTurn(), 1000);
        }
    }

    isValidMove(card) {
        const top = this.getTopCard();
        
        // Wilds are always playable
        if(card.type === 'wild' || card.type === 'wild4') return true;

        // Match Color (including wild color choice)
        if(card.color === top.color) return true;
        
        // Match Value
        if(card.value === top.value) return true;

        return false;
    }

    humanPlay(cardIndex) {
        if(!this.gameActive || this.currentPlayerIndex !== 0 || this.waitingForColor) return;

        const card = this.players[0].hand[cardIndex];
        if(this.isValidMove(card)) {
            // Remove from hand
            this.players[0].hand.splice(cardIndex, 1);
            this.handlePlayedCard(card);
        } else {
            // Shake card animation?
            console.log("Invalid Move");
        }
    }

    humanDraw() {
        if(!this.gameActive || this.currentPlayerIndex !== 0 || this.waitingForColor) return;
        
        this.drawCards(0, 1);
        const newCard = this.players[0].hand[this.players[0].hand.length - 1];
        
        // If playable, auto play? Or let user play? 
        // Standard Uno: You can play the drawn card immediately if valid.
        // For simplicity: We just draw and pass turn if not playable, or let user click it.
        // Let's just add to hand and let user decide to play it or keep it (if we added a "Pass" button).
        // BUT, simplified Retro version: 
        // If you draw, and it's playable, you CAN play it.
        // If not, turn auto ends?
        // Let's keep it simple: Draw -> Add to hand -> Player must play or Pass?
        // To avoid "Pass" button clutter, let's say: Draw 1. If playable, you can play. If not, auto-pass?
        // Actually, easiest flow: Draw 1. AI checks if playable.
        // For Human: Draw 1. Then we need a way to end turn if they can't/won't play.
        // Let's enforce: If you draw, checking logic...
        
        // Revised Human Draw:
        // User clicks Deck. Draws card. 
        // If valid, highlighting it?
        // Let's just allow drawing indefinitely? No that breaks game.
        // Allow draw once per turn.
        
        // Implementation: Just Draw 1 and Pass Turn automatically for now to keep UI simple.
        // Better: Draw 1. If valid, Play? No, let's just Auto-pass to speed up game.
        // Actually, if I draw a playable card, I want to play it.
        
        // Logic: Draw 1.
        // Check if playable.
        // If yes -> Leave turn active.
        // If no -> Auto pass.
        
        if(this.isValidMove(newCard)) {
            this.ui.status.textContent = "Play your new card or Pass!";
            this.ui.passBtn.style.display = 'inline-block';
            this.updateUI(); // Show card
        } else {
            this.ui.status.textContent = "No play possible. Passing...";
            this.updateUI();
            setTimeout(() => this.nextTurn(), 1000);
        }
    }

    aiTurn() {
        const player = this.players[this.currentPlayerIndex];
        const validMoves = player.hand.filter(c => this.isValidMove(c));

        if(validMoves.length > 0) {
            // Pick one. Prioritize non-wilds?
            // Simple AI: First valid move.
            // Better AI: Save Wilds/Action?
            
            // Random valid move
            const card = validMoves[Math.floor(Math.random() * validMoves.length)];
            const index = player.hand.indexOf(card);
            player.hand.splice(index, 1);
            
            // If wild, choose random color
            if(card.type.startsWith('wild')) {
                const colors = ['red', 'blue', 'green', 'yellow'];
                // Choose color they have most of
                const counts = {};
                player.hand.forEach(c => { if(c.color !== 'black') counts[c.color] = (counts[c.color]||0)+1; });
                let bestColor = colors[0];
                let max = -1;
                colors.forEach(c => {
                    if((counts[c]||0) > max) { max = counts[c]; bestColor = c; }
                });
                card.tempColor = bestColor; // Store decision
            }

            this.handlePlayedCard(card);

        } else {
            // Draw
            this.drawCards(this.currentPlayerIndex, 1);
            const newCard = player.hand[player.hand.length-1];
            if(this.isValidMove(newCard)) {
                // Play immediately
                player.hand.pop();
                if(newCard.type.startsWith('wild')) {
                     const colors = ['red', 'blue', 'green', 'yellow'];
                     newCard.tempColor = colors[Math.floor(Math.random()*4)];
                }
                this.handlePlayedCard(newCard);
            } else {
                this.nextTurn();
            }
        }
    }

    handlePlayedCard(card) {
        this.discardPile.push(card);
        
        // Handle Action
        if(card.type === 'wild' || card.type === 'wild4') {
            if(this.players[this.currentPlayerIndex].isHuman) {
                // Show modal
                this.waitingForColor = true;
                this.pendingWildCard = card;
                this.ui.colorModal.classList.add('visible');
                this.updateUI();
                return; // Stop here, resume after modal
            } else {
                // AI already decided color
                card.color = card.tempColor; // Permanently set color on pile
                this.updateUI();
                this.finishCardAction(card);
            }
        } else {
            this.finishCardAction(card);
        }
    }

    resolveWild(color) {
        this.pendingWildCard.color = color;
        this.waitingForColor = false;
        this.ui.colorModal.classList.remove('visible');
        this.updateUI();
        this.finishCardAction(this.pendingWildCard);
    }

    finishCardAction(card) {
        // Effects
        let skipNext = false;

        if(card.value === 'reverse') {
            this.direction *= -1;
            // In 2 player game, reverse acts like skip
            if(this.players.length === 2) skipNext = true;
        } else if (card.value === 'skip') {
            skipNext = true;
        } else if (card.value === 'draw2') {
            const nextP = this.getNextPlayerIndex();
            this.drawCards(nextP, 2);
            skipNext = true;
        } else if (card.value === 'wild4') {
            const nextP = this.getNextPlayerIndex();
            this.drawCards(nextP, 4);
            skipNext = true;
        }

        this.nextTurn(skipNext);
    }

    getNextPlayerIndex() {
        let idx = this.currentPlayerIndex + this.direction;
        if(idx < 0) idx = this.players.length - 1;
        if(idx >= this.players.length) idx = 0;
        return idx;
    }

    nextTurn(skip = false) {
        let idx = this.getNextPlayerIndex();
        if(skip) {
            // Calculate next after next
             idx = idx + this.direction;
            if(idx < 0) idx = this.players.length - 1;
            if(idx >= this.players.length) idx = 0;
        }
        this.currentPlayerIndex = idx;
        this.updateUI();
        this.startTurn();
    }

    drawCards(playerIndex, count) {
        for(let i=0; i<count; i++) {
            if(this.deck.length === 0) this.reshuffleDiscard();
            if(this.deck.length > 0) {
                this.players[playerIndex].hand.push(this.deck.pop());
            }
        }
    }

    endGame(winner) {
        this.gameActive = false;
        document.getElementById('modal-title').textContent = winner.isHuman ? "YOU WON!" : `${winner.name} WINS!`;
        document.getElementById('modal-icon').textContent = winner.isHuman ? "🏆" : "💀";
        this.ui.gameOverModal.classList.add('visible');
    }

    // --- Rendering ---

    updateUI() {
        // Render Discard Pile
        const top = this.getTopCard();
        this.ui.discardPile.innerHTML = '';
        this.ui.discardPile.appendChild(this.createCardEl(top, false));

        // Render Player Hand
        this.ui.playerHand.innerHTML = '';
        this.players[0].hand.forEach((card, idx) => {
            const el = this.createCardEl(card, true);
            
            // Check playability
            if(this.gameActive && this.currentPlayerIndex === 0 && !this.waitingForColor) {
                if(this.isValidMove(card)) {
                    el.addEventListener('click', () => this.humanPlay(idx));
                } else {
                    el.classList.add('disabled');
                }
            } else {
                el.classList.add('disabled');
            }
            this.ui.playerHand.appendChild(el);
        });

        // Render Opponents
        for(let i=1; i<4; i++) {
            const container = this.ui.opponents[i-1].hand;
            container.innerHTML = '';
            // Just show card backs based on count
            const count = this.players[i].hand.length;
            for(let j=0; j<count; j++) {
                const back = document.createElement('div');
                back.className = 'card-back-mini';
                // Limit max cards shown to prevent overflow visually
                if(j < 15) container.appendChild(back);
            }
            
            // Highlight active turn
            const opEl = this.ui.opponents[i-1].el;
            if(this.currentPlayerIndex === i) opEl.classList.add('active-turn');
            else opEl.classList.remove('active-turn');
        }

        // Direction Indicator
        this.ui.direction.style.transform = this.direction === 1 ? 'rotate(0deg)' : 'rotate(180deg)';
    }

    createCardEl(card, isFull) {
        const div = document.createElement('div');
        div.className = `card ${card.color} ${card.type}`;
        div.dataset.value = card.value.toUpperCase(); // For corner text

        const content = document.createElement('div');
        content.className = 'card-content';
        
        // Symbols
        if(card.value === 'skip') content.textContent = '⊘';
        else if(card.value === 'reverse') content.textContent = '⇄';
        else if(card.value === 'draw2') content.textContent = '+2';
        else if(card.value === 'wild') content.textContent = 'W';
        else if(card.value === 'wild4') content.textContent = '+4';
        else content.textContent = card.value;

        div.appendChild(content);
        return div;
    }
}

// Start
window.onload = () => {
    const game = new UnoGame();
};
