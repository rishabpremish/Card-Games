// Blackjack Game Logic

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class BlackjackGame {
    constructor() {
        this.deck = [];
        this.dealerHand = [];
        
        // Multi-hand support
        this.playerHands = []; // Array of { cards: [], bet: 0, status: 'playing', score: 0 }
        this.currentHandIndex = 0;
        
        // Wallet with persistence
        this._wallet = parseInt(localStorage.getItem('gameWallet')) || 1000;
        
        this.currentBet = 0; // Total current bet (sum of all hands)
        this.baseBet = 0;    // The initial bet size (for doubling/splitting)
        this.gameState = 'BETTING'; // BETTING, PLAYING, DEALER_TURN, GAME_OVER

        this.ui = {
            wallet: document.getElementById('wallet-display'),
            bet: document.getElementById('bet-display'),
            dealerHand: document.getElementById('dealer-hand'),
            playerHandContainer: document.getElementById('player-hand'), // Renamed for clarity
            dealerScore: document.getElementById('dealer-score'),
            playerScore: document.getElementById('player-score'),
            bettingControls: document.getElementById('betting-controls'),
            actionControls: document.getElementById('action-controls'),
            gameOverControls: document.getElementById('game-over-controls'),
            msgOverlay: document.getElementById('message-overlay'),
            msgText: document.getElementById('game-message'),
            chips: document.querySelectorAll('.chip'),
            splitBtn: document.getElementById('btn-split')
        };

        this.init();
    }

    get wallet() { return this._wallet; }
    set wallet(val) {
        this._wallet = val;
        localStorage.setItem('gameWallet', this._wallet);
        // Also update UI immediately if initialized? 
        // updateUI() reads this.wallet so it will be consistent on next render.
        // But for safety, we could update the display here if we wanted reactive UI.
        // For now, the game calls updateUI() manually after changes, which is fine.
    }

    init() {
        // Event Listeners
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                if(e.target.id === 'btn-all-in') this.placeBet(this.wallet);
                else this.placeBet(parseInt(e.target.dataset.value));
            });
        });

        document.getElementById('btn-clear-bet').addEventListener('click', () => this.clearBet());
        document.getElementById('btn-deal').addEventListener('click', () => this.dealInitial());
        
        document.getElementById('btn-hit').addEventListener('click', () => this.hit());
        document.getElementById('btn-stand').addEventListener('click', () => this.stand());
        document.getElementById('btn-double').addEventListener('click', () => this.doubleDown());
        if(this.ui.splitBtn) this.ui.splitBtn.addEventListener('click', () => this.split());
        
        document.getElementById('btn-new-hand').addEventListener('click', () => this.resetGame());

        this.updateUI();
    }

    resetGame() {
        this.gameState = 'BETTING';
        this.dealerHand = [];
        this.playerHands = [];
        this.currentHandIndex = 0;
        this.currentBet = 0;
        this.baseBet = 0;
        this.ui.msgOverlay.classList.remove('visible');
        this.updateUI();
    }

    createDeck() {
        this.deck = [];
        SUITS.forEach(suit => {
            RANKS.forEach(rank => {
                let value = parseInt(rank);
                if (['J', 'Q', 'K'].includes(rank)) value = 10;
                if (rank === 'A') value = 11;
                this.deck.push({ suit, rank, value });
            });
        });
        // Shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    placeBet(amount) {
        if (this.gameState !== 'BETTING') return;
        if (this.wallet >= amount) {
            this.wallet -= amount;
            this.currentBet += amount;
            this.baseBet = this.currentBet; // Track base bet
            this.updateUI();
        }
    }

    clearBet() {
        if (this.gameState !== 'BETTING') return;
        this.wallet += this.currentBet;
        this.currentBet = 0;
        this.baseBet = 0;
        this.updateUI();
    }

    dealInitial() {
        if (this.currentBet === 0) return; // Must bet
        
        this.createDeck(); 
        this.gameState = 'PLAYING';
        
        // Setup initial hand
        const hand = {
            cards: [this.deck.pop(), this.deck.pop()],
            bet: this.baseBet,
            status: 'playing',
            score: 0
        };
        this.playerHands = [hand];
        this.currentHandIndex = 0;

        this.dealerHand = [this.deck.pop(), this.deck.pop()];

        this.updateUI();

        // Check for Instant Blackjack on single hand
        const pScore = this.calculateScore(this.playerHands[0].cards);
        if (pScore === 21) {
            this.playerHands[0].status = 'blackjack';
            this.handleGameOver(); 
        }
    }

    hit() {
        if (this.gameState !== 'PLAYING') return;
        
        const currentHand = this.playerHands[this.currentHandIndex];
        currentHand.cards.push(this.deck.pop());
        const score = this.calculateScore(currentHand.cards);
        
        if (score > 21) {
            currentHand.status = 'bust';
            this.showMessage("BUST!", "bad");
            this.advanceHand(); // Move to next hand or dealer
        } else if (score === 21) {
            this.stand(); // Auto-stand on 21
        } else {
            this.updateUI();
        }
    }

    stand() {
        if (this.gameState !== 'PLAYING') return;
        
        const currentHand = this.playerHands[this.currentHandIndex];
        if (currentHand.status === 'playing') {
            currentHand.status = 'stood';
        }
        this.advanceHand();
    }

    advanceHand() {
        if (this.currentHandIndex < this.playerHands.length - 1) {
            this.currentHandIndex++;
            this.updateUI();
        } else {
            // All hands done
            this.gameState = 'DEALER_TURN';
            this.updateUI();
            setTimeout(() => this.dealerLogic(), 800);
        }
    }

    doubleDown() {
        if (this.gameState !== 'PLAYING') return;
        
        const currentHand = this.playerHands[this.currentHandIndex];
        if (currentHand.cards.length !== 2) return;
        if (this.wallet < currentHand.bet) return; 

        this.wallet -= currentHand.bet;
        this.currentBet += currentHand.bet; // Total table bet
        currentHand.bet *= 2;
        
        // Draw one card
        currentHand.cards.push(this.deck.pop());
        
        const score = this.calculateScore(currentHand.cards);
        if (score > 21) {
            currentHand.status = 'bust';
            this.showMessage("BUST!", "bad");
        } else {
            currentHand.status = 'stood'; // Auto stand
        }
        
        this.advanceHand();
    }

    split() {
        if (this.gameState !== 'PLAYING') return;
        
        // Validation
        const currentHand = this.playerHands[this.currentHandIndex];
        if (this.playerHands.length >= 2) return; // Limit to one split for v1
        if (currentHand.cards.length !== 2) return;
        
        // Check Rank (must be identical rank, e.g. 8 & 8, or K & K. K & Q is valid value-wise but stricter rules say rank)
        // Let's allow same Rank OR both are value 10 (e.g. K & J)
        const c1 = currentHand.cards[0];
        const c2 = currentHand.cards[1];
        const canSplit = (c1.rank === c2.rank) || (c1.value === 10 && c2.value === 10);
        
        if (!canSplit) return;
        if (this.wallet < currentHand.bet) return; // Can't afford

        // Pay for split
        this.wallet -= currentHand.bet;
        this.currentBet += currentHand.bet;

        // Perform Split
        const splitCard = currentHand.cards.pop(); // Remove 2nd card
        
        // Create new hand
        const newHand = {
            cards: [splitCard],
            bet: currentHand.bet,
            status: 'playing',
            score: 0
        };

        // Deal one card to first hand
        currentHand.cards.push(this.deck.pop());
        // Deal one card to new hand
        newHand.cards.push(this.deck.pop());

        this.playerHands.push(newHand);
        
        // Check for aces? Usually special rules, but skipping for v1
        
        this.updateUI();
    }

    dealerLogic() {
        // Only play if at least one player hand is not busted?
        const allBusted = this.playerHands.every(h => h.status === 'bust');
        
        if (allBusted) {
            this.handleGameOver();
            return;
        }

        const score = this.calculateScore(this.dealerHand);
        
        if (score < 17) {
            this.dealerHand.push(this.deck.pop());
            this.updateUI();
            setTimeout(() => this.dealerLogic(), 800);
        } else {
            this.handleGameOver();
        }
    }

    calculateScore(hand) {
        let score = 0;
        let aces = 0;
        
        hand.forEach(card => {
            score += card.value;
            if (card.rank === 'A') aces++;
        });

        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        return score;
    }

    handleGameOver() {
        this.gameState = 'GAME_OVER';
        this.updateUI();

        const dScore = this.calculateScore(this.dealerHand);
        let totalWin = 0;
        let anyWin = false;
        let anyPush = false;

        this.playerHands.forEach(hand => {
            if (hand.status === 'bust') return; // Already lost bet

            const pScore = this.calculateScore(hand.cards);
            let win = 0;

            if (dScore > 21) {
                // Dealer Bust
                win = hand.bet * 2;
            } else if (pScore > dScore) {
                // Win
                if (pScore === 21 && hand.cards.length === 2 && this.playerHands.length === 1) {
                    // Natural Blackjack (only if not split usually, but let's be generous or check logic)
                    // Standard rules: Split aces don't get blackjack bonus, just 1:1 wins usually.
                    // But if it's a normal win:
                    win = hand.bet * 2; 
                    // Note: Instant Blackjack is handled in dealInitial. If we are here, it's normal play.
                } else {
                    win = hand.bet * 2;
                }
            } else if (pScore === dScore) {
                // Push
                win = hand.bet;
                anyPush = true;
            }

            if (win > hand.bet) anyWin = true;
            totalWin += win;
        });

        this.wallet += totalWin;

        let message = "";
        let type = "neutral";

        if (totalWin === 0) {
            message = "DEALER WINS";
            type = "bad";
        } else if (anyWin) {
            message = "YOU WIN!";
            type = "win";
        } else if (anyPush) {
            message = "PUSH";
            type = "neutral";
        }

        this.showMessage(message, type);
        this.updateUI(); // Final wallet update
    }

    showMessage(text, type) {
        this.ui.msgText.textContent = text;
        this.ui.msgText.style.color = type === 'win' ? 'var(--retro-green)' : (type === 'bad' ? 'var(--retro-red)' : 'var(--retro-yellow)');
        this.ui.msgOverlay.classList.add('visible');
    }

    // --- Rendering ---
    
    updateUI() {
        this.ui.wallet.textContent = `$${this.wallet}`;
        this.ui.bet.textContent = `$${this.currentBet}`;

        // Control Visibility
        this.ui.bettingControls.style.display = this.gameState === 'BETTING' ? 'flex' : 'none';
        this.ui.actionControls.style.display = this.gameState === 'PLAYING' ? 'flex' : 'none';
        this.ui.gameOverControls.style.display = this.gameState === 'GAME_OVER' ? 'flex' : 'none';

        // Split Button Logic
        if (this.gameState === 'PLAYING' && this.ui.splitBtn) {
            const currentHand = this.playerHands[this.currentHandIndex];
            if (this.playerHands.length === 1 && 
                currentHand && 
                currentHand.cards.length === 2 && 
                ((currentHand.cards[0].rank === currentHand.cards[1].rank) || (currentHand.cards[0].value === 10 && currentHand.cards[1].value === 10)) &&
                this.wallet >= currentHand.bet) {
                this.ui.splitBtn.style.display = 'block';
            } else {
                this.ui.splitBtn.style.display = 'none';
            }
        }

        // Render Dealer
        this.renderHand(this.ui.dealerHand, this.dealerHand, this.gameState === 'PLAYING');
        
        // Render Dealer Score
        if (this.dealerHand.length > 0) {
            if (this.gameState === 'PLAYING') {
                this.ui.dealerScore.textContent = '?';
            } else {
                this.ui.dealerScore.textContent = this.calculateScore(this.dealerHand);
            }
        } else {
            this.ui.dealerScore.textContent = '0';
        }

        // Render Player Hand(s)
        const container = this.ui.playerHandContainer;
        container.innerHTML = ''; // Clear previous

        if (this.playerHands.length === 0) {
            // Empty state
            this.ui.playerScore.style.display = 'block';
            this.ui.playerScore.textContent = '0';
        } else if (this.playerHands.length === 1) {
            // Normal Single Hand
            container.className = 'hand-container';
            this.renderCards(container, this.playerHands[0].cards);
            
            this.ui.playerScore.style.display = 'block';
            this.ui.playerScore.textContent = this.calculateScore(this.playerHands[0].cards);
        } else {
            // Split State
            container.className = 'split-wrapper';
            this.ui.playerScore.style.display = 'none'; // Hide main score

            this.playerHands.forEach((hand, index) => {
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.alignItems = 'center';

                const subHand = document.createElement('div');
                subHand.className = 'hand-container';
                // Smaller scale for split hands to fit
                subHand.style.minWidth = '100px'; 
                subHand.style.minHeight = '100px';
                
                if (index === this.currentHandIndex && this.gameState === 'PLAYING') {
                    subHand.classList.add('active-hand');
                } else {
                    subHand.classList.add('inactive-hand');
                }

                this.renderCards(subHand, hand.cards);

                const scoreEl = document.createElement('div');
                scoreEl.className = 'hand-score';
                scoreEl.textContent = this.calculateScore(hand.cards);
                
                wrapper.appendChild(subHand);
                wrapper.appendChild(scoreEl);
                container.appendChild(wrapper);
            });
        }

        // Chip State
        this.ui.chips.forEach(chip => {
            const val = parseInt(chip.dataset.value) || 999999;
            if (val > this.wallet) chip.classList.add('disabled');
            else chip.classList.remove('disabled');
        });

        // Bankruptcy Check
        if (this.wallet < 10 && this.currentBet === 0 && this.gameState === 'BETTING') {
             // Give free money
             setTimeout(() => {
                 this.wallet = 500;
                 this.showMessage("Bankrupt! +$500 Gift", "win");
                 this.updateUI();
             }, 2000);
        }
    }

    renderHand(container, cards, hideHoleCard = false) {
        container.innerHTML = '';
        this.renderCards(container, cards, hideHoleCard);
    }

    renderCards(container, cards, hideHoleCard = false) {
        cards.forEach((card, index) => {
            const el = this.createCardEl(card);
            
            if (hideHoleCard && index === 1) {
                el.classList.add('hidden');
            }
            
            el.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(el);
        });
    }

    createCardEl(card) {
        const div = document.createElement('div');
        div.className = 'bj-card';
        
        const front = document.createElement('div');
        front.className = `card-front ${['hearts', 'diamonds'].includes(card.suit) ? 'red' : 'black'}`;
        
        const topCorner = document.createElement('div');
        topCorner.className = 'card-corner top';
        topCorner.innerHTML = `<span class="card-value">${card.rank}</span><span class="card-suit-small">${this.getSuitSymbol(card.suit)}</span>`;
        
        const center = document.createElement('div');
        center.className = 'card-center';
        center.innerHTML = this.getSuitSymbol(card.suit);

        const bottomCorner = document.createElement('div');
        bottomCorner.className = 'card-corner bottom';
        bottomCorner.innerHTML = `<span class="card-value">${card.rank}</span><span class="card-suit-small">${this.getSuitSymbol(card.suit)}</span>`;

        front.appendChild(topCorner);
        front.appendChild(center);
        front.appendChild(bottomCorner);

        const back = document.createElement('div');
        back.className = 'card-back';
        
        div.appendChild(front);
        div.appendChild(back);

        return div;
    }

    getSuitSymbol(suit) {
        switch(suit) {
            case 'hearts': return '♥';
            case 'diamonds': return '♦';
            case 'clubs': return '♣';
            case 'spades': return '♠';
        }
    }
}

window.onload = () => {
    const game = new BlackjackGame();
};
