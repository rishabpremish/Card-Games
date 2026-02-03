/* ============================================
   HIGHER OR LOWER - CARD GAME LOGIC
   ============================================ */

class HigherLowerGame {
  constructor() {
    // Card suits and values
    this.suits = ["♠", "♥", "♦", "♣"];
    this.suitNames = ["spades", "hearts", "diamonds", "clubs"];
    this.values = [
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

    // Game state
    this.deck = [];
    this.grid = []; // 9 stacks
    this.selectedStackIndex = null;
    this.cardsPlaced = 0;
    this.gameOver = false;
    this.isProcessing = false; // Prevent rapid-fire glitches
    
    // Wallet state
    this.wallet = parseInt(localStorage.getItem('gameWallet')) || 100;
    this.currentBet = 0;

    // DOM elements
    this.cardGrid = document.getElementById("card-grid");
    this.deckElement = document.getElementById("deck");
    this.choiceContainer = document.getElementById("choice-container");
    this.drawnCardOverlay = document.getElementById("drawn-card-overlay");
    this.drawnCard = document.getElementById("drawn-card");
    this.resultMessage = document.getElementById("result-message");
    this.gameOverModal = document.getElementById("game-over-modal");
    
    // Betting elements
    this.bettingModal = document.getElementById("betting-modal");
    this.walletBalanceEl = document.getElementById("wallet-balance");
    this.bettingBalanceEl = document.getElementById("betting-balance");
    this.betInput = document.getElementById("bet-input");
    this.betSlider = document.getElementById("bet-slider");
    this.btnPlaceBet = document.getElementById("btn-place-bet");
    this.btnAllIn = document.getElementById("btn-all-in");
    this.potentialPayoutEl = document.getElementById("potential-payout-value");

    // Stats elements
    this.cardsRemainingEl = document.getElementById("cards-remaining");
    this.cardsPlacedEl = document.getElementById("cards-placed");
    
    // In-Game Progress elements
    this.mainProgressFill = document.getElementById("main-progress-fill");

    // Progress Bar elements
    this.progressFill = document.getElementById("progress-bar-fill");
    this.progressPercent = document.getElementById("progress-percent");

    // New Game Confirmation Modal
    this.newGameConfirmModal = document.getElementById("new-game-confirm-modal");

    // Ace value setting (1 or 14, default 1)
    this.aceValue = parseInt(localStorage.getItem("aceValue")) || 1;

    // Bind event handlers
    this.bindEvents();

    // Start the game
    this.updateWalletUI();
    this.initGame();
  }

  // Update Wallet UI
  updateWalletUI() {
    this.walletBalanceEl.textContent = `$${this.wallet}`;
    this.bettingBalanceEl.textContent = `$${this.wallet}`;
    localStorage.setItem('gameWallet', this.wallet);
  }

  // Show betting modal
  showBettingModal() {
    // Reset inputs
    this.betInput.max = this.wallet;
    this.betSlider.max = this.wallet;
    
    // Default bet logic
    let defaultBet = Math.min(10, this.wallet);
    if (this.wallet === 0) defaultBet = 0;
    
    this.betInput.value = defaultBet;
    this.betSlider.value = defaultBet;
    
    this.updatePayoutDisplay();
    this.bettingModal.classList.add("visible");
  }

  // Hide betting modal
  hideBettingModal() {
    this.bettingModal.classList.remove("visible");
  }

  // Update potential payout display
  updatePayoutDisplay() {
    const bet = parseInt(this.betInput.value) || 0;
    const payout = bet * 5;
    this.potentialPayoutEl.textContent = `$${payout}`;
  }

  // Place bet and start game
  placeBet() {
    const bet = parseInt(this.betInput.value);
    
    if (isNaN(bet) || bet <= 0) {
      alert("Please enter a valid bet amount!");
      return;
    }
    
    if (bet > this.wallet) {
      alert("You don't have enough money!");
      return;
    }

    this.currentBet = bet;
    this.wallet -= bet;
    this.updateWalletUI();
    this.hideBettingModal();
    this.initGame();
  }

  // Create a standard 52-card deck
  createDeck() {
    const deck = [];
    for (let suitIndex = 0; suitIndex < this.suits.length; suitIndex++) {
      for (let valueIndex = 0; valueIndex < this.values.length; valueIndex++) {
        let numericValue = valueIndex + 1; // Default: Ace = 1, King = 13
        
        // Handle Ace value based on setting
        if (valueIndex === 0 && this.aceValue === 14) {
          numericValue = 14; // Ace high
        }
        
        deck.push({
          suit: this.suits[suitIndex],
          suitName: this.suitNames[suitIndex],
          value: this.values[valueIndex],
          numericValue: numericValue,
          isRed: suitIndex === 1 || suitIndex === 2, // Hearts or Diamonds
        });
      }
    }
    return deck;
  }

  // Fisher-Yates shuffle
  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Initialize or reset the game
  initGame() {
    // Reset state
    this.deck = this.shuffleDeck(this.createDeck());
    this.grid = [];
    this.selectedStackIndex = null;
    this.cardsPlaced = 0;
    this.gameOver = false;
    
    // If initGame is called directly (New Game btn), reset bet to 0
    // If called from placeBet(), currentBet is already set
    // We need to know if this is a "Free Game" or "Bet Game".
    // For now, if initGame is called, we assume the bet state is already correct.
    // But "New Game" button calls this. We should probably reset bet to 0 there.
    
    // Clear the grid
    this.cardGrid.innerHTML = "";

    // Deal 9 cards to the grid
    for (let i = 0; i < 9; i++) {
      const card = this.deck.pop();
      this.grid.push({
        cards: [card],
        locked: false,
      });
    }

    this.cardsPlaced = 9;

    // Render the grid with dealing animation
    this.renderGrid(true);

    // Update stats
    this.updateStats();

    // Hide any modals
    this.hideChoiceContainer();
    this.hideDrawnCardOverlay();
    this.hideGameOverModal();

    // Update deck visual
    this.updateDeckVisual();
  }

  // Render the card grid
  renderGrid(animate = false) {
    this.cardGrid.innerHTML = "";

    this.grid.forEach((stack, index) => {
      const stackEl = document.createElement("div");
      stackEl.className = "card-stack";
      stackEl.dataset.index = index;

      // Create visual for stacked cards (show up to 3)
      const cardsToShow = Math.min(stack.cards.length, 3);

      for (let i = 0; i < cardsToShow; i++) {
        const card =
          stack.cards[stack.cards.length - 1 - (cardsToShow - 1 - i)];
        const isTopCard = i === cardsToShow - 1;
        const cardEl = this.createCardElement(
          card,
          stack.locked,
          isTopCard,
          index,
        );

        if (animate && isTopCard) {
          cardEl.classList.add("dealing");
          cardEl.style.animationDelay = `${index * 0.1}s`;
        }

        stackEl.appendChild(cardEl);
      }

      this.cardGrid.appendChild(stackEl);
    });
  }

  // Create a card DOM element
  createCardElement(card, isLocked = false, isTopCard = true, stackIndex = -1) {
    const cardEl = document.createElement("div");
    cardEl.className = "card";

    if (isLocked) {
      cardEl.classList.add("flipped", "locked");
    }

    // Card front
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

    // Card back
    const backEl = document.createElement("div");
    backEl.className = "card-back";

    cardEl.appendChild(frontEl);
    cardEl.appendChild(backEl);

    // Add hover zones for top card only (if not locked)
    if (isTopCard && !isLocked && stackIndex >= 0) {
      const hoverZones = document.createElement("div");
      hoverZones.className = "card-hover-zones";

      const higherZone = document.createElement("div");
      higherZone.className = "hover-zone-higher";
      higherZone.innerHTML = "<span>▲ HIGHER</span>";
      higherZone.addEventListener("click", (e) => {
        e.stopPropagation();
        this.makeQuickChoice(stackIndex, "higher");
      });

      const lowerZone = document.createElement("div");
      lowerZone.className = "hover-zone-lower";
      lowerZone.innerHTML = "<span>▼ LOWER</span>";
      lowerZone.addEventListener("click", (e) => {
        e.stopPropagation();
        this.makeQuickChoice(stackIndex, "lower");
      });

      hoverZones.appendChild(higherZone);
      hoverZones.appendChild(lowerZone);
      cardEl.appendChild(hoverZones);
    }

    return cardEl;
  }

  // Select a stack to play
  selectStack(index) {
    if (this.gameOver || this.grid[index].locked || this.deck.length === 0) {
      return;
    }

    // Deselect previous
    if (this.selectedStackIndex !== null) {
      const prevStack = this.cardGrid.children[this.selectedStackIndex];
      if (prevStack) {
        const prevCard = prevStack.querySelector(".card:last-child");
        if (prevCard) prevCard.classList.remove("selected");
      }
    }

    this.selectedStackIndex = index;

    // Highlight selected card
    const stackEl = this.cardGrid.children[index];
    const cardEl = stackEl.querySelector(".card:last-child");
    cardEl.classList.add("selected");

    // Update choice prompt
    const topCard = this.grid[index].cards[this.grid[index].cards.length - 1];
    document.getElementById("selected-card-display").textContent =
      `${topCard.value}${topCard.suit}`;

    // Show choice container
    this.showChoiceContainer();
  }

  // Make a higher/lower choice (new quick version)
  makeQuickChoice(stackIndex, choice) {
    // Safety check
    if (
      this.gameOver ||
      this.grid[stackIndex].locked ||
      this.deck.length === 0 ||
      this.isProcessing
    ) {
      return;
    }

    // Always ensure UI is clean when starting a move
    this.hideChoiceContainer();
    this.isProcessing = true;

    const currentCard =
      this.grid[stackIndex].cards[this.grid[stackIndex].cards.length - 1];
    const drawnCard = this.deck.pop();

    // Determine if the guess is correct
    let isCorrect = false;
    const pushedEnabled = localStorage.getItem("pushed") !== "false";
    if (choice === "higher") {
      isCorrect = drawnCard.numericValue > currentCard.numericValue || 
                  (pushedEnabled && drawnCard.numericValue === currentCard.numericValue);
    } else {
      isCorrect = drawnCard.numericValue < currentCard.numericValue ||
                  (pushedEnabled && drawnCard.numericValue === currentCard.numericValue);
    }

    // Animate card flying from deck to stack
    this.animateCardFlight(stackIndex, drawnCard, isCorrect, () => {
      if (isCorrect) {
        // Add card to the stack
        this.grid[stackIndex].cards.push(drawnCard);
        this.cardsPlaced++;
        this.renderGrid();
      } else {
        // Lock the stack
        this.grid[stackIndex].locked = true;
        this.renderGrid();

        // Shake animation
        const stackEl = this.cardGrid.children[stackIndex];
        stackEl.classList.add("shake");
        setTimeout(() => stackEl.classList.remove("shake"), 300);
      }

      // Reset selection
      this.selectedStackIndex = null;

      // Update
      this.updateStats();
      this.updateDeckVisual();

      // Check for game over
      this.checkGameOver();
      
      this.isProcessing = false;
    });
  }

  // Make a higher/lower choice (unified to use quick animation)
  makeChoice(choice) {
    if (this.selectedStackIndex === null) {
      return;
    }
    // Delegate to the quick choice logic
    this.makeQuickChoice(this.selectedStackIndex, choice);
  }

  // Animate card flying from deck to stack
  animateCardFlight(stackIndex, card, isCorrect, callback) {
    // Get positions
    const deckRect = this.deckElement.getBoundingClientRect();
    const stackEl = this.cardGrid.children[stackIndex];
    const stackRect = stackEl.getBoundingClientRect();

    // Create flying card element
    const flyingCard = document.createElement("div");
    flyingCard.className = "flying-card";

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
    flyingCard.appendChild(frontEl);

    // Set starting position (deck)
    flyingCard.style.left = deckRect.left + "px";
    flyingCard.style.top = deckRect.top + "px";

    document.body.appendChild(flyingCard);

    // Get animation speed from settings
    const speedSetting = localStorage.getItem("cardSpeed") || "normal";
    const durations = { fast: 150, normal: 300, slow: 500 };
    const duration = durations[speedSetting];
    
    const startX = deckRect.left;
    const startY = deckRect.top;
    const endX = stackRect.left;
    const endY = stackRect.top;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentX = startX + (endX - startX) * easeOut;
      const currentY = startY + (endY - startY) * easeOut;

      flyingCard.style.left = currentX + "px";
      flyingCard.style.top = currentY + "px";

      // Add slight rotation during flight
      flyingCard.style.transform = `rotate(${(1 - progress) * 10}deg)`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        flyingCard.remove();

        // Flash color based on result
        if (!isCorrect) {
          stackEl.style.boxShadow = "0 0 20px #ff3333";
          setTimeout(() => {
            stackEl.style.boxShadow = "";
          }, 200);
        }

        callback();
      }
    };

    requestAnimationFrame(animate);
  }

  // Make a higher/lower choice (old version - kept for compatibility)
  makeChoice(choice) {
    if (this.selectedStackIndex === null || this.deck.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    const stackIndex = this.selectedStackIndex;
    const currentCard =
      this.grid[stackIndex].cards[this.grid[stackIndex].cards.length - 1];
    const drawnCard = this.deck.pop();

    // Hide choice container
    this.hideChoiceContainer();

    // Determine if the guess is correct
    let isCorrect = false;
    const pushedEnabled = localStorage.getItem("pushed") !== "false";
    if (choice === "higher") {
      isCorrect = drawnCard.numericValue > currentCard.numericValue || 
                  (pushedEnabled && drawnCard.numericValue === currentCard.numericValue);
    } else {
      isCorrect = drawnCard.numericValue < currentCard.numericValue ||
                  (pushedEnabled && drawnCard.numericValue === currentCard.numericValue);
    }

    // Show the drawn card
    this.showDrawnCard(drawnCard, isCorrect, () => {
      if (isCorrect) {
        // Add card to the stack
        this.grid[stackIndex].cards.push(drawnCard);
        this.cardsPlaced++;
      } else {
        // Lock the stack
        this.grid[stackIndex].locked = true;

        // Shake animation
        const stackEl = this.cardGrid.children[stackIndex];
        stackEl.classList.add("shake");
        setTimeout(() => stackEl.classList.remove("shake"), 300);
      }

      // Deselect
      this.selectedStackIndex = null;

      // Re-render and update
      this.renderGrid();
      this.updateStats();
      this.updateDeckVisual();

      // Check for game over
      this.checkGameOver();
      
      this.isProcessing = false;
    });
  }

  // Show the drawn card overlay
  showDrawnCard(card, isCorrect, callback) {
    // Create card HTML
    this.drawnCard.innerHTML = "";
    const cardEl = this.createCardElement(card, false, true);
    cardEl.classList.remove("card");
    cardEl.querySelector(".card-front").style.position = "relative";
    cardEl.querySelector(".card-back").style.display = "none";
    this.drawnCard.appendChild(cardEl.querySelector(".card-front"));

    // Set result message
    this.resultMessage.textContent = isCorrect ? "Correct!" : "Wrong!";
    this.resultMessage.className = `result-message ${isCorrect ? "correct" : "wrong"}`;

    // Show overlay
    this.drawnCardOverlay.classList.add("visible");

    // Auto-hide after delay
    setTimeout(() => {
      this.hideDrawnCardOverlay();
      if (callback) callback();
    }, 1500);
  }

  // Hide drawn card overlay
  hideDrawnCardOverlay() {
    this.drawnCardOverlay.classList.remove("visible");
  }

  // Show choice container
  showChoiceContainer() {
    this.choiceContainer.classList.add("visible");
  }

  // Hide choice container
  hideChoiceContainer() {
    this.choiceContainer.classList.remove("visible");

    // Deselect card visual
    if (this.selectedStackIndex !== null) {
      const stackEl = this.cardGrid.children[this.selectedStackIndex];
      if (stackEl) {
        const cardEl = stackEl.querySelector(".card:last-child");
        if (cardEl) cardEl.classList.remove("selected");
      }
    }
  }

  // Update game statistics
  updateStats() {
    this.cardsRemainingEl.textContent = this.deck.length;
    this.cardsPlacedEl.textContent = this.cardsPlaced;

    // Update in-game progress bar
    if (this.mainProgressFill) {
        // Calculate progress based on cards used from the deck (43 total in draw pile)
        const cardsGone = 43 - this.deck.length;
        const percentage = Math.round((cardsGone / 43) * 100);
        this.mainProgressFill.style.height = `${percentage}%`;
        
        // Color shift based on progress
        if (percentage >= 80) {
            this.mainProgressFill.style.backgroundColor = "var(--retro-green)";
        } else if (percentage >= 40) {
            this.mainProgressFill.style.backgroundColor = "var(--retro-yellow)";
        } else {
            this.mainProgressFill.style.backgroundColor = "var(--retro-cyan)";
        }
    }
  }

  // Update deck visual
  updateDeckVisual() {
    if (this.deck.length === 0) {
      this.deckElement.classList.add("empty");
    } else {
      this.deckElement.classList.remove("empty");
    }
  }

  // Check for game over conditions
  checkGameOver() {
    const activeStacks = this.grid.filter((s) => !s.locked).length;

    // Lose condition: no active stacks but cards remain
    if (activeStacks === 0 && this.deck.length > 0) {
      this.showGameOverModal(false);
      this.gameOver = true;
      return;
    }

    // Win condition: deck empty and at least 1 stack still active
    if (this.deck.length === 0 && activeStacks > 0) {
      this.showGameOverModal(true);
      this.gameOver = true;
      return;
    }

    // Lose condition: deck empty and no active stacks
    if (this.deck.length === 0 && activeStacks === 0) {
      this.showGameOverModal(false);
      this.gameOver = true;
    }
  }

  // Show game over modal
  showGameOverModal(isWin) {
    const modalIcon = document.getElementById("modal-icon");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    const finalPlaced = document.getElementById("final-placed");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const revealDeckBtn = document.getElementById("reveal-deck-btn");
    const winPayoutStat = document.getElementById("win-payout-stat");
    const winAmountEl = document.getElementById("win-amount");

    // Calculate progress
    // Total cards to draw = 43
    const cardsGone = 43 - this.deck.length;
    const percentage = Math.round((cardsGone / 43) * 100);
    
    // Update progress bar
    if (this.progressFill && this.progressPercent) {
        // Reset first to allow animation to replay if reopening
        this.progressFill.style.width = "0%";
        
        // Small delay to ensure transition plays
        setTimeout(() => {
            this.progressFill.style.width = `${percentage}%`;
        }, 100);
        
        this.progressPercent.textContent = `DECK PROGRESS: ${cardsGone} / 43`;
        
        // Change color based on completion
        if (percentage >= 100) {
            this.progressFill.style.background = "var(--retro-green)";
        } else if (percentage >= 50) {
            this.progressFill.style.background = "var(--retro-yellow)";
        } else {
            this.progressFill.style.background = "var(--retro-red)";
        }
    }

    if (isWin) {
      modalIcon.textContent = "🎉";
      modalTitle.textContent = "Congratulations!";
      modalMessage.textContent = "You've made it through the entire deck!";
      closeModalBtn.style.display = "inline-block";
      if (revealDeckBtn) revealDeckBtn.style.display = "none";
      
      // Calculate payout
      const payout = this.currentBet * 5;
      this.wallet += payout;
      this.updateWalletUI();
      
      // Show payout only if there was a bet
      if (this.currentBet > 0) {
        winPayoutStat.style.display = "flex";
        winAmountEl.textContent = `$${payout}`;
      } else {
        winPayoutStat.style.display = "none";
      }
    } else {
      modalIcon.textContent = "😔";
      modalTitle.textContent = "Game Over";
      modalMessage.textContent =
        "All stacks are locked. Better luck next time!";
      closeModalBtn.style.display = "none";
      if (revealDeckBtn) revealDeckBtn.style.display = "inline-block";
      winPayoutStat.style.display = "none";
    }

    finalPlaced.textContent = this.cardsPlaced;

    this.gameOverModal.classList.add("visible");
  }

  // Hide game over modal
  hideGameOverModal() {
    this.gameOverModal.classList.remove("visible");
  }

  // Show new game confirmation modal
  showNewGameConfirmModal() {
    this.newGameConfirmModal.classList.add("visible");
  }

  // Hide new game confirmation modal
  hideNewGameConfirmModal() {
    this.newGameConfirmModal.classList.remove("visible");
  }

  // Update instructions text to reflect current settings
  updateInstructions() {
    const aceNote = document.querySelector(".instructions-content .note");
    if (aceNote) {
      const aceValue = this.aceValue;
      const aceText = aceValue === 14 ? "high (14)" : "low (1)";
      const pushedEnabled = localStorage.getItem("pushed") !== "false";
      const equalValuesText = pushedEnabled ? "count as correct (pushed)" : "count as wrong";
      aceNote.textContent = `Note: Aces are ${aceText}, Kings are high (13). Equal values ${equalValuesText}!`;
    }
  }

  // Reveal the remaining cards in the deck
  revealDeck() {
    // Clear grid
    this.cardGrid.innerHTML = "";
    
    // Add header
    const header = document.createElement("div");
    header.style.gridColumn = "1 / -1";
    header.style.textAlign = "center";
    header.style.color = "var(--retro-cyan)";
    header.style.fontFamily = "'Press Start 2P', cursive";
    header.style.padding = "20px";
    header.style.marginBottom = "20px";
    header.innerHTML = `REMAINING CARDS (${this.deck.length})`;
    this.cardGrid.appendChild(header);

    // If deck is empty
    if (this.deck.length === 0) {
        const msg = document.createElement("div");
        msg.style.gridColumn = "1 / -1";
        msg.style.textAlign = "center";
        msg.textContent = "No cards remaining!";
        this.cardGrid.appendChild(msg);
        return;
    }

    // Render all remaining cards face up
    this.deck.forEach((card, index) => {
        // Create a wrapper for grid layout
        const wrapper = document.createElement("div");
        wrapper.className = "card-stack"; // Reuse stack class for sizing
        wrapper.style.cursor = "default";
        
        // Create the card element (reusing logic but flattened)
        const cardEl = this.createCardElement(card, false, false);
        
        // Ensure it looks like a face-up card
        const front = cardEl.querySelector(".card-front");
        const back = cardEl.querySelector(".card-back");
        if(back) back.style.display = "none";
        
        // Animation for reveal
        cardEl.style.opacity = "0";
        cardEl.style.transform = "translateY(20px)";
        cardEl.style.transition = "all 0.3s ease";
        setTimeout(() => {
            cardEl.style.opacity = "1";
            cardEl.style.transform = "translateY(0)";
        }, index * 50);

        wrapper.appendChild(cardEl);
        this.cardGrid.appendChild(wrapper);
    });
    
    // Disable deck interactions
    this.deckElement.classList.add("empty");
  }

  // Bind all event handlers
  bindEvents() {
    // Higher/Lower buttons
    document.getElementById("btn-higher").addEventListener("click", () => {
      this.makeChoice("higher");
    });

    document.getElementById("btn-lower").addEventListener("click", () => {
      this.makeChoice("lower");
    });

    // Cancel button
    document.getElementById("btn-cancel").addEventListener("click", () => {
      this.selectedStackIndex = null;
      this.hideChoiceContainer();
    });

    // Play again button
    document.getElementById("play-again-btn").addEventListener("click", () => {
      // Hide Game Over Modal first
      this.hideGameOverModal();
      // If we had a bet, offer to bet again? Or just normal game?
      // User likely wants to play again.
      // If they were betting, maybe show modal. If free play, just init.
      // Let's stick to showing modal if they won money (to bet it) or lost money.
      // Actually, user flow implies "Play Again" might want to quickly restart.
      // But if betting is optional, maybe "Play Again" -> "New Game" (Free).
      // Let's make "Play Again" just start a new FREE game, they can click "Place Bet" if they want.
      // OR, if they had a bet, re-open modal?
      // Let's reset to free play to be safe/consistent with "New Game" btn.
      this.currentBet = 0;
      this.initGame();
    });

    // Close modal button (for viewing winning game)
    document.getElementById("close-modal-btn").addEventListener("click", () => {
      this.hideGameOverModal();
    });

    // Reveal Deck button
    const revealBtn = document.getElementById("reveal-deck-btn");
    if (revealBtn) {
        revealBtn.addEventListener("click", () => {
            this.hideGameOverModal();
            this.revealDeck();
        });
    }

    // Instructions toggle
    const instructionsToggle = document.getElementById("instructions-toggle");
    const instructionsContent = document.getElementById("instructions-content");

    instructionsToggle.addEventListener("click", () => {
      instructionsContent.classList.toggle("visible");
    });

    // Close instructions when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".instructions")) {
        instructionsContent.classList.remove("visible");
      }
    });

    // Settings Menu
    const settingsOverlay = document.getElementById("settings-overlay");
    const settingsClose = document.getElementById("settings-close");
    const themeGrid = document.getElementById("theme-grid");

    // Settings elements
    const cardSpeedSelect = document.getElementById("card-speed");
    const pushedToggle = document.getElementById("pushed-toggle");
    const confirmNewgameToggle = document.getElementById("confirm-newgame");
    const aceValueSelect = document.getElementById("ace-value");
    const scanlinesToggle = document.getElementById("scanlines-toggle");
    const vignetteToggle = document.getElementById("vignette-toggle");
    const bgAnimationToggle = document.getElementById("bg-animation-toggle");
    const highContrastToggle = document.getElementById("high-contrast-toggle");
    const reduceMotionToggle = document.getElementById("reduce-motion-toggle");
    const resetSettingsBtn = document.getElementById("reset-settings");

    // Settings button (top right)
    const settingsHintBtn = document.querySelector(".settings-hint");
    settingsHintBtn.addEventListener("click", () => {
      if (settingsOverlay) {
        settingsOverlay.classList.toggle("visible");
      }
    });

    // Close settings button
    settingsClose.addEventListener("click", () => {
      settingsOverlay.classList.remove("visible");
    });

    // Close when clicking overlay background
    settingsOverlay.addEventListener("click", (e) => {
      if (e.target === settingsOverlay) {
        settingsOverlay.classList.remove("visible");
      }
    });

    // Theme selection
    themeGrid.addEventListener("click", (e) => {
      const themeBtn = e.target.closest(".theme-btn");
      if (!themeBtn) return;

      const theme = themeBtn.dataset.theme;

      // Remove all theme classes but keep other settings classes
      const currentClasses = [...document.body.classList].filter(
        (c) => !c.startsWith("theme-")
      );
      document.body.className = currentClasses.join(" ");

      // Add new theme class (if not default)
      if (theme !== "default") {
        document.body.classList.add(`theme-${theme}`);
      }

      // Update active button
      themeGrid.querySelectorAll(".theme-btn").forEach((btn) => {
        btn.classList.remove("active");
      });
      themeBtn.classList.add("active");

      // Save to localStorage
      localStorage.setItem("gameTheme", theme);
    });

    // Card speed setting
    cardSpeedSelect.addEventListener("change", () => {
      localStorage.setItem("cardSpeed", cardSpeedSelect.value);
    });

    // Confirm new game setting
    confirmNewgameToggle.addEventListener("change", () => {
      localStorage.setItem(
        "confirmNewgame",
        confirmNewgameToggle.checked ? "true" : "false"
      );
    });

    // Ace value setting
    aceValueSelect.addEventListener("change", () => {
      const newValue = parseInt(aceValueSelect.value);
      this.aceValue = newValue;
      localStorage.setItem("aceValue", newValue.toString());
      this.updateInstructions();
      // Restart game to apply new ace value
      this.currentBet = 0;
      this.initGame();
    });

    // Pushed setting - update instructions when changed
    pushedToggle.addEventListener("change", () => {
      localStorage.setItem(
        "pushed",
        pushedToggle.checked ? "true" : "false"
      );
      this.updateInstructions();
    });

    // Scanlines toggle
    scanlinesToggle.addEventListener("change", () => {
      if (scanlinesToggle.checked) {
        document.body.classList.remove("no-scanlines");
      } else {
        document.body.classList.add("no-scanlines");
      }
      localStorage.setItem(
        "scanlines",
        scanlinesToggle.checked ? "true" : "false"
      );
    });

    // Vignette toggle
    vignetteToggle.addEventListener("change", () => {
      if (vignetteToggle.checked) {
        document.body.classList.remove("no-vignette");
      } else {
        document.body.classList.add("no-vignette");
      }
      localStorage.setItem(
        "vignette",
        vignetteToggle.checked ? "true" : "false"
      );
    });

    // Background animation toggle
    bgAnimationToggle.addEventListener("change", () => {
      if (bgAnimationToggle.checked) {
        document.body.classList.remove("no-bg-animation");
      } else {
        document.body.classList.add("no-bg-animation");
      }
      localStorage.setItem(
        "bgAnimation",
        bgAnimationToggle.checked ? "true" : "false"
      );
    });

    // High contrast toggle
    highContrastToggle.addEventListener("change", () => {
      if (highContrastToggle.checked) {
        document.body.classList.add("high-contrast");
      } else {
        document.body.classList.remove("high-contrast");
      }
      localStorage.setItem(
        "highContrast",
        highContrastToggle.checked ? "true" : "false"
      );
    });

    // Reduce motion toggle
    reduceMotionToggle.addEventListener("change", () => {
      if (reduceMotionToggle.checked) {
        document.body.classList.add("reduce-motion");
      } else {
        document.body.classList.remove("reduce-motion");
      }
      localStorage.setItem(
        "reduceMotion",
        reduceMotionToggle.checked ? "true" : "false"
      );
    });

    // Reset settings
    resetSettingsBtn.addEventListener("click", () => {
      if (confirm("Reset all settings to default?")) {
        // Clear all localStorage except wallet
        const wallet = localStorage.getItem('gameWallet');
        localStorage.clear();
        if (wallet !== null) {
            localStorage.setItem('gameWallet', wallet);
        }
        location.reload();
      }
    });

    // Load all saved settings
    const loadSettings = () => {
      // Theme
      const savedTheme = localStorage.getItem("gameTheme");
      if (savedTheme && savedTheme !== "default") {
        document.body.classList.add(`theme-${savedTheme}`);
        const activeBtn = themeGrid.querySelector(
          `[data-theme="${savedTheme}"]`
        );
        if (activeBtn) {
          themeGrid
            .querySelectorAll(".theme-btn")
            .forEach((btn) => btn.classList.remove("active"));
          activeBtn.classList.add("active");
        }
      }

      // Card speed
      const savedSpeed = localStorage.getItem("cardSpeed");
      if (savedSpeed) {
        cardSpeedSelect.value = savedSpeed;
      }

      // Pushed (equal values accepted) - default is true
      const savedPushed = localStorage.getItem("pushed");
      if (savedPushed !== null) {
        pushedToggle.checked = savedPushed === "true";
      }

      // Confirm new game
      const savedConfirm = localStorage.getItem("confirmNewgame");
      if (savedConfirm !== null) {
        confirmNewgameToggle.checked = savedConfirm === "true";
      }

      // Ace value - default is 1 (low)
      const savedAceValue = localStorage.getItem("aceValue");
      if (savedAceValue !== null) {
        aceValueSelect.value = savedAceValue;
        this.aceValue = parseInt(savedAceValue);
      }
      // Update instructions to reflect current ace value
      this.updateInstructions();

      // Scanlines
      const savedScanlines = localStorage.getItem("scanlines");
      if (savedScanlines !== null) {
        scanlinesToggle.checked = savedScanlines === "true";
        if (!scanlinesToggle.checked) {
          document.body.classList.add("no-scanlines");
        }
      }

      // Vignette
      const savedVignette = localStorage.getItem("vignette");
      if (savedVignette !== null) {
        vignetteToggle.checked = savedVignette === "true";
        if (!vignetteToggle.checked) {
          document.body.classList.add("no-vignette");
        }
      }

      // Background animation
      const savedBgAnimation = localStorage.getItem("bgAnimation");
      if (savedBgAnimation !== null) {
        bgAnimationToggle.checked = savedBgAnimation === "true";
        if (!bgAnimationToggle.checked) {
          document.body.classList.add("no-bg-animation");
        }
      }

      // High contrast
      const savedHighContrast = localStorage.getItem("highContrast");
      if (savedHighContrast !== null) {
        highContrastToggle.checked = savedHighContrast === "true";
        if (highContrastToggle.checked) {
          document.body.classList.add("high-contrast");
        }
      }

      // Reduce motion
      const savedReduceMotion = localStorage.getItem("reduceMotion");
      if (savedReduceMotion !== null) {
        reduceMotionToggle.checked = savedReduceMotion === "true";
        if (reduceMotionToggle.checked) {
          document.body.classList.add("reduce-motion");
        }
      }
    };

    loadSettings();

    // Update new game button to respect setting with custom modal
    document.getElementById("new-game-btn").addEventListener("click", () => {
      const needsConfirm = localStorage.getItem("confirmNewgame") !== "false";
      if (!needsConfirm) {
        this.currentBet = 0;
        this.initGame();
      } else {
        this.showNewGameConfirmModal();
      }
    });

    // New Game Confirmation Modal buttons
    document.getElementById("cancel-new-game").addEventListener("click", () => {
      this.hideNewGameConfirmModal();
    });

    document.getElementById("confirm-new-game").addEventListener("click", () => {
      this.hideNewGameConfirmModal();
      this.currentBet = 0;
      this.initGame();
    });

    // Close new game modal on overlay click
    this.newGameConfirmModal.addEventListener("click", (e) => {
      if (e.target === this.newGameConfirmModal) {
        this.hideNewGameConfirmModal();
      }
    });

    // Place Bet Button (New)
    const placeBetBtn = document.getElementById("open-bet-btn");
    if (placeBetBtn) {
        placeBetBtn.addEventListener("click", () => {
             this.showBettingModal();
        });
    }
    
    // Close Betting Modal Button
    const closeBetBtn = document.getElementById("close-bet-modal");
    if (closeBetBtn) {
        closeBetBtn.addEventListener("click", () => {
            this.hideBettingModal();
        });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Handle Escape key for closing modals
      if (e.key === "Escape") {
        // Close settings modal if open - re-query to ensure we have the element
        const currentSettingsOverlay = document.getElementById("settings-overlay");
        if (currentSettingsOverlay && currentSettingsOverlay.classList.contains("visible")) {
          e.preventDefault();
          currentSettingsOverlay.classList.remove("visible");
          return;
        }
        // Close game over modal if open
        if (this.gameOverModal && this.gameOverModal.classList.contains("visible")) {
          e.preventDefault();
          this.gameOverModal.classList.remove("visible");
          return;
        }
        // Close drawn card overlay if open
        if (this.drawnCardOverlay && this.drawnCardOverlay.classList.contains("visible")) {
          e.preventDefault();
          this.drawnCardOverlay.classList.remove("visible");
          return;
        }
        // Close choice container if open
        if (this.choiceContainer && this.choiceContainer.classList.contains("visible")) {
          e.preventDefault();
          this.selectedStackIndex = null;
          this.hideChoiceContainer();
          return;
        }
          // Close new game confirm modal if open
        if (this.newGameConfirmModal && this.newGameConfirmModal.classList.contains("visible")) {
          e.preventDefault();
          this.hideNewGameConfirmModal();
          return;
        }
        // Close betting modal if open
        if (this.bettingModal && this.bettingModal.classList.contains("visible")) {
          e.preventDefault();
          this.hideBettingModal();
          return;
        }
      }
      // Open settings with Ctrl/Cmd + /
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        if (settingsOverlay) {
          settingsOverlay.classList.toggle("visible");
        }
        return;
      }
      
      // Betting shortcuts (Enter to bet, Esc to close)
      if (this.bettingModal && this.bettingModal.classList.contains("visible")) {
        if (e.key === "Enter") {
          this.placeBet();
          return;
        }
        if (e.key === "Escape") {
           this.hideBettingModal();
           return;
        }
      }

      // Other keyboard shortcuts for game
      if (this.choiceContainer.classList.contains("visible")) {
        if (e.key === "ArrowUp" || e.key === "h" || e.key === "H") {
          this.makeChoice("higher");
        } else if (e.key === "ArrowDown" || e.key === "l" || e.key === "L") {
          this.makeChoice("lower");
        }
      }
    });
    
    // Betting Event Listeners
    if (this.btnPlaceBet) {
        this.btnPlaceBet.addEventListener("click", () => this.placeBet());
    }
    
    if (this.btnAllIn) {
        this.btnAllIn.addEventListener("click", () => {
            this.betInput.value = this.wallet;
            this.betSlider.value = this.wallet;
            this.updatePayoutDisplay();
        });
    }
    
    if (this.betInput) {
        this.betInput.addEventListener("input", () => {
            let val = parseInt(this.betInput.value) || 0;
            if (val > this.wallet) {
                val = this.wallet;
                this.betInput.value = val;
            }
            this.betSlider.value = val;
            this.updatePayoutDisplay();
        });
    }
    
    if (this.betSlider) {
        this.betSlider.addEventListener("input", () => {
            this.betInput.value = this.betSlider.value;
            this.updatePayoutDisplay();
        });
    }
  }
}

// Start the game when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.gameInstance = new HigherLowerGame();
});
