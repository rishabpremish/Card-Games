class BlackjackGame {
    constructor() {
        this.suits = ["♠", "♥", "♦", "♣"];
        this.suitNames = ["spades", "hearts", "diamonds", "clubs"];
        this.values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.gameActive = false;
        
        this.wallet = parseInt(localStorage.getItem('gameWallet')) || 100;
        this.currentBet = 0;
        
        // DOM Elements
        this.walletBalanceEl = document.getElementById("wallet-balance");
        this.currentBetEl = document.getElementById("current-bet");
        this.dealerCardsEl = document.getElementById("dealer-cards");
        this.playerCardsEl = document.getElementById("player-cards");
        this.dealerScoreEl = document.getElementById("dealer-score");
        this.playerScoreEl = document.getElementById("player-score");
        
        this.gameControls = document.getElementById("game-controls");
        this.betControls = document.getElementById("bet-controls");
        
        this.bettingModal = document.getElementById("betting-modal");
        this.betInput = document.getElementById("bet-input");
        this.betSlider = document.getElementById("bet-slider");
        this.bettingBalanceEl = document.getElementById("betting-balance");
        this.potentialPayoutEl = document.getElementById("potential-payout-value");
        
        this.messageOverlay = document.getElementById("message-overlay");
        this.messageText = document.getElementById("message-text");
        this.messageSub = document.getElementById("message-sub");

        this.bindEvents();
        this.updateWalletUI();
    }

    createDeck() {
        const deck = [];
        for (let suitIndex = 0; suitIndex < this.suits.length; suitIndex++) {
            for (let valueIndex = 0; valueIndex < this.values.length; valueIndex++) {
                let numericValue = valueIndex + 1;
                let blackjackValue = numericValue;
                if (numericValue > 10) blackjackValue = 10; // J, Q, K
                if (numericValue === 1) blackjackValue = 11; // Ace default to 11

                deck.push({
                    suit: this.suits[suitIndex],
                    suitName: this.suitNames[suitIndex],
                    value: this.values[valueIndex],
                    numericValue: numericValue,
                    blackjackValue: blackjackValue,
                    isRed: suitIndex === 1 || suitIndex === 2,
                });
            }
        }
        return deck;
    }

    shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    bindEvents() {
        document.getElementById("btn-open-bet").addEventListener("click", () => this.showBettingModal());
        document.getElementById("close-bet-modal").addEventListener("click", () => this.hideBettingModal());
        document.getElementById("btn-place-bet").addEventListener("click", () => this.placeBet());
        
        document.getElementById("btn-hit").addEventListener("click", () => this.hit());
        document.getElementById("btn-stand").addEventListener("click", () => this.stand());
        
        // Betting inputs
        this.betInput.addEventListener("input", () => this.updatePayoutDisplay());
        this.betSlider.addEventListener("input", () => {
            this.betInput.value = this.betSlider.value;
            this.updatePayoutDisplay();
        });
        
        document.getElementById("btn-all-in").addEventListener("click", () => {
            this.betInput.value = this.wallet;
            this.betSlider.value = this.wallet;
            this.updatePayoutDisplay();
        });
    }

    updateWalletUI() {
        this.walletBalanceEl.textContent = `$${this.wallet}`;
        if(this.bettingBalanceEl) this.bettingBalanceEl.textContent = `$${this.wallet}`;
        localStorage.setItem('gameWallet', this.wallet);
    }

    showBettingModal() {
        this.betInput.max = this.wallet;
        this.betSlider.max = this.wallet;
        this.betInput.value = Math.min(10, this.wallet);
        this.betSlider.value = this.betInput.value;
        this.updatePayoutDisplay();
        this.bettingModal.classList.add("visible");
    }

    hideBettingModal() {
        this.bettingModal.classList.remove("visible");
    }

    updatePayoutDisplay() {
        const bet = parseInt(this.betInput.value) || 0;
        this.potentialPayoutEl.textContent = `$${bet * 2}`;
    }

    placeBet() {
        const bet = parseInt(this.betInput.value);
        if (isNaN(bet) || bet <= 0) {
            alert("Invalid bet");
            return;
        }
        if (bet > this.wallet) {
            alert("Insufficient funds");
            return;
        }

        this.currentBet = bet;
        this.wallet -= bet;
        this.updateWalletUI();
        this.currentBetEl.textContent = `$${this.currentBet}`;
        this.hideBettingModal();
        
        this.startNewHand();
    }

    startNewHand() {
        this.deck = this.shuffleDeck(this.createDeck());
        this.playerHand = [];
        this.dealerHand = [];
        this.gameActive = true;
        this.messageOverlay.classList.remove("visible");
        
        // Deal initial cards
        this.playerHand.push(this.deck.pop());
        this.dealerHand.push(this.deck.pop());
        this.playerHand.push(this.deck.pop());
        this.dealerHand.push(this.deck.pop());
        
        this.updateUI(false); // don't show dealer hole card yet
        this.gameControls.style.display = "flex";
        this.betControls.style.display = "none";
        
        // Check for natural blackjack
        const playerVal = this.calculateHandValue(this.playerHand);
        const dealerVal = this.calculateHandValue(this.dealerHand);
        
        if (playerVal === 21) {
            if (dealerVal === 21) {
                this.endRound("push");
            } else {
                this.endRound("blackjack");
            }
        }
    }

    hit() {
        if (!this.gameActive) return;
        
        const card = this.deck.pop();
        this.playerHand.push(card);
        this.updateUI(false);
        
        const val = this.calculateHandValue(this.playerHand);
        if (val > 21) {
            this.endRound("bust");
        }
    }

    stand() {
        if (!this.gameActive) return;
        this.dealerPlay();
    }

    dealerPlay() {
        this.updateUI(true); // Reveal hole card
        
        let dealerVal = this.calculateHandValue(this.dealerHand);
        
        // Simple dealer AI: hit on < 17
        const playStep = () => {
             if (dealerVal < 17) {
                 setTimeout(() => {
                     this.dealerHand.push(this.deck.pop());
                     dealerVal = this.calculateHandValue(this.dealerHand);
                     this.updateUI(true);
                     playStep();
                 }, 800);
             } else {
                 this.resolveGame();
             }
        };
        
        playStep();
    }

    resolveGame() {
        const playerVal = this.calculateHandValue(this.playerHand);
        const dealerVal = this.calculateHandValue(this.dealerHand);
        
        if (dealerVal > 21) {
            this.endRound("dealerBust");
        } else if (playerVal > dealerVal) {
            this.endRound("win");
        } else if (playerVal < dealerVal) {
            this.endRound("lose");
        } else {
            this.endRound("push");
        }
    }

    endRound(result) {
        this.gameActive = false;
        this.updateUI(true); // Ensure dealer card shown
        this.gameControls.style.display = "none";
        this.betControls.style.display = "flex";
        
        let message = "";
        let sub = "";
        let winnings = 0;
        
        switch(result) {
            case "blackjack":
                message = "BLACKJACK!";
                winnings = Math.floor(this.currentBet * 2.5); // 3:2 payout + original bet returned logic: 
                // Actually, standard is: you bet 10. Blackjack pays 1.5x = 15. Total returned = 25.
                // My logic: wallet already deducted 10. So adding 25 net change is +15.
                this.wallet += winnings;
                sub = `You won $${winnings - this.currentBet}!`;
                this.messageText.style.color = "var(--retro-magenta)";
                break;
            case "win":
            case "dealerBust":
                message = result === "dealerBust" ? "DEALER BUST!" : "YOU WIN!";
                winnings = this.currentBet * 2;
                this.wallet += winnings;
                sub = `You won $${winnings - this.currentBet}!`;
                this.messageText.style.color = "var(--retro-green)";
                break;
            case "push":
                message = "PUSH";
                winnings = this.currentBet;
                this.wallet += winnings;
                sub = "Bet returned";
                this.messageText.style.color = "var(--retro-yellow)";
                break;
            case "bust":
                message = "BUST!";
                sub = "You went over 21";
                this.messageText.style.color = "var(--retro-red)";
                break;
            case "lose":
                message = "DEALER WINS";
                sub = "Better luck next time";
                this.messageText.style.color = "var(--retro-red)";
                break;
        }
        
        this.updateWalletUI();
        this.currentBet = 0;
        this.currentBetEl.textContent = "$0";
        
        this.messageText.textContent = message;
        this.messageSub.textContent = sub;
        this.messageOverlay.classList.add("visible");
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;
        
        for (const card of hand) {
            value += card.blackjackValue;
            if (card.blackjackValue === 11) aces++;
        }
        
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }

    updateUI(showDealerHole) {
        // Render Player
        this.playerScoreEl.textContent = this.calculateHandValue(this.playerHand);
        this.renderHand(this.playerCardsEl, this.playerHand, false);
        
        // Render Dealer
        if (showDealerHole) {
            this.dealerScoreEl.textContent = this.calculateHandValue(this.dealerHand);
            this.renderHand(this.dealerCardsEl, this.dealerHand, false);
        } else {
            // Calculate visible score (only first card)
            if (this.dealerHand.length > 0) {
                // If we have cards but hole card is hidden, show value of just the visible cards (everything except index 1?)
                // Usually hole card is index 1 (second card dealt).
                // Let's assume standard deal: P, D, P, D(hole).
                // So index 1 is hole.
                
                // Let's just calculate score of index 0 for display
                 let visibleVal = 0;
                 let visibleAces = 0;
                 const visibleCard = this.dealerHand[0];
                 if(visibleCard) {
                     visibleVal = visibleCard.blackjackValue;
                 }
                this.dealerScoreEl.textContent = visibleVal;
            }
            this.renderHand(this.dealerCardsEl, this.dealerHand, true);
        }
    }

    renderHand(container, hand, hideHoleCard) {
        container.innerHTML = "";
        hand.forEach((card, index) => {
            const cardEl = document.createElement("div");
            cardEl.className = "card";
            
            // Check if this is the hole card (index 1 for dealer)
            if (hideHoleCard && index === 1) {
                // Render Back
                 const backEl = document.createElement("div");
                 backEl.className = "card-back";
                 cardEl.appendChild(backEl);
            } else {
                // Render Front (reused from game.js style)
                const frontEl = document.createElement("div");
                frontEl.className = `card-front ${card.isRed ? "red" : "black"}`;
                frontEl.innerHTML = `
                    <div class="card-corner top">
                        <span class="card-value">${card.value}</span>
                        <span class="card-suit-small">${card.suit}</span>
                    </div>
                    <span class="card-center">${card.suit}</span>
                    <div class="card-corner bottom">
                        <span class="card-value">${card.value}</span>
                        <span class="card-suit-small">${card.suit}</span>
                    </div>
                `;
                cardEl.appendChild(frontEl);
            }
            container.appendChild(cardEl);
        });
    }
}

// Init
window.blackjack = new BlackjackGame();
