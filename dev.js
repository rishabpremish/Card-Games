class DevTools {
    constructor() {
        this.game = null;
        this.init();
    }

    init() {
        // Wait for game instance to be ready
        const checkGame = () => {
             if (window.gameInstance) return window.gameInstance;
             if (window.connect4) return window.connect4;
             return null;
        };

        const instance = checkGame();
        if (instance) {
            this.game = instance;
            this.createUI();
        } else {
            document.addEventListener("DOMContentLoaded", () => {
                // Give a small buffer for the game to initialize
                setTimeout(() => {
                    const instance = checkGame();
                    this.game = instance;
                    this.createUI();
                }, 100);
            });
        }
    }

    createUI() {
        // Create Toggle Button
        const devBtn = document.createElement('button');
        devBtn.textContent = '🛠️ DEV';
        devBtn.id = 'dev-tools-toggle';
        devBtn.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 1000;
            background: #333;
            color: #0f0;
            border: 2px solid #0f0;
            padding: 5px 10px;
            font-family: monospace;
            cursor: pointer;
            opacity: 0.7;
        `;
        document.body.appendChild(devBtn);

        // Create Connect 4 Link Button
        const c4Btn = document.createElement('button');
        c4Btn.textContent = '🔴 C4';
        c4Btn.title = 'Play Connect 4';
        c4Btn.style.cssText = `
            position: fixed;
            top: 50px;
            left: 10px;
            z-index: 1000;
            background: #1a1a2e;
            color: #ff00ff;
            border: 2px solid #ff00ff;
            padding: 5px 10px;
            font-family: 'Press Start 2P', monospace;
            font-size: 10px;
            cursor: pointer;
            opacity: 0.7;
            text-shadow: 0 0 5px #ff00ff;
        `;
        
        if (window.location.href.includes('connect4.html')) {
            c4Btn.style.background = '#ff00ff';
            c4Btn.style.color = '#1a1a2e';
            c4Btn.textContent = '◀ HL';
            c4Btn.title = 'Back to Higher Lower';
            c4Btn.onclick = () => window.location.href = 'index.html';
        } else {
            c4Btn.onclick = () => window.location.href = 'connect4.html';
        }
        
        document.body.appendChild(c4Btn);

        // Create Panel
        const panel = document.createElement('div');
        panel.id = 'dev-tools-panel';
        panel.style.cssText = `
            position: fixed;
            top: 90px;
            left: 10px;
            z-index: 1000;
            background: rgba(0,0,0,0.9);
            border: 2px solid #0f0;
            padding: 15px;
            display: none;
            flex-direction: column;
            gap: 10px;
            font-family: monospace;
            min-width: 200px;
        `;
        
        // Add Controls
        this.addControl(panel, '💰 Reset Balance ($100)', () => this.resetBalance());
        this.addControl(panel, '🏆 Simulate Win', () => this.simulateWin());
        this.addControl(panel, '💀 Simulate Loss', () => this.simulateLoss());

        document.body.appendChild(panel);

        // Toggle Logic
        devBtn.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        });
    }

    addControl(panel, text, action) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            background: #222;
            color: #fff;
            border: 1px solid #666;
            padding: 5px;
            cursor: pointer;
            text-align: left;
        `;
        btn.addEventListener('mouseenter', () => btn.style.background = '#444');
        btn.addEventListener('mouseleave', () => btn.style.background = '#222');
        btn.addEventListener('click', () => {
            action();
            // Flash button to indicate action
            const originalBg = btn.style.background;
            btn.style.background = '#0f0';
            setTimeout(() => btn.style.background = originalBg, 200);
        });
        panel.appendChild(btn);
    }

    resetBalance() {
        if (!this.game) return;
        this.game.wallet = 100;
        this.game.updateWalletUI();
        console.log("Balance reset to $100");
    }

    simulateWin() {
        if (!this.game || !this.game.grid) return;
        
        // Force win condition: Empty deck, at least one active stack
        this.game.deck = [];
        
        // Ensure at least one stack is unlocked
        const activeStacks = this.game.grid.filter((s) => !s.locked).length;
        if (activeStacks === 0 && this.game.grid.length > 0) {
            this.game.grid[0].locked = false;
        }

        this.game.updateDeckVisual();
        this.game.updateStats();
        this.game.checkGameOver();
        console.log("Simulating Win");
    }

    simulateLoss() {
        if (!this.game || !this.game.grid) return;

        // Force loss condition: Locked stacks
        this.game.grid.forEach(stack => stack.locked = true);
        
        // Ensure deck is NOT empty if we want early loss, OR empty deck + locked stacks
        // Let's go with early loss (cards remaining but stacks locked)
        if (this.game.deck.length === 0) {
            // If deck is empty, this is also a loss, so we are good
        }
        
        this.game.updateStats();
        this.game.checkGameOver();
        console.log("Simulating Loss");
    }
}

new DevTools();
