class Connect4 {
    constructor() {
        this.rows = 6;
        this.cols = 7;
        this.board = []; // 0=empty, 1=red(p1), 2=yellow(p2)
        this.currentPlayer = 1; // 1 or 2
        this.myPlayerId = null; // 1 or 2 (assigned on connection)
        this.gameActive = false;
        this.peer = null;
        this.conn = null;
        this.isHost = false;

        // UI Elements
        this.menu = document.getElementById('menu');
        this.gameUI = document.getElementById('game-ui');
        this.boardEl = document.getElementById('board');
        this.statusEl = document.getElementById('game-status');
        this.roomInput = document.getElementById('room-input');
        this.connStatus = document.getElementById('connection-status');
        this.roomDisplay = document.getElementById('current-room-code');
        this.btnRestart = document.getElementById('btn-restart');
        
        this.badgeP1 = document.getElementById('badge-p1');
        this.badgeP2 = document.getElementById('badge-p2');

        // Check protocol
        if (location.protocol === 'file:') {
            document.getElementById('protocol-warning').style.display = 'block';
        }

        this.initBoard();
        this.bindEvents();
    }

    initBoard() {
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.boardEl.innerHTML = '';
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.addEventListener('click', () => this.handleCellClick(c));
                this.boardEl.appendChild(cell);
            }
        }
    }

    bindEvents() {
        document.getElementById('btn-create').addEventListener('click', () => this.createRoom());
        document.getElementById('btn-join').addEventListener('click', () => this.joinRoom());
        this.btnRestart.addEventListener('click', () => {
            this.resetGame();
            this.sendData({ type: 'restart' });
        });
    }

    // --- Networking (PeerJS) ---

    generateRoomCode() {
        // Generate random 6-char string
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return "C4-" + result;
    }

    initPeer(id = null) {
        if (this.peer) {
            this.peer.destroy();
        }

        this.connStatus.textContent = "Connecting to PeerServer...";
        this.connStatus.style.color = "var(--retro-yellow)";
        
        try {
            this.peer = new Peer(id, {
                debug: 2,
                config: {
                    'iceServers': [
                        { url: 'stun:stun.l.google.com:19302' },
                        { url: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });
        } catch (e) {
            this.connStatus.textContent = "PeerJS Error: " + e.message;
            return;
        }

        this.peer.on('open', (peerId) => {
            console.log('My peer ID is: ' + peerId);
            this.connStatus.textContent = "Server Connected. ID: " + peerId;
            this.connStatus.style.color = "var(--retro-green)";
            
            if (this.isHost) {
                this.startGameUI(peerId);
                this.statusEl.textContent = "Waiting for opponent to join...";
            } else {
                // If we are joining, NOW we connect to the host
                this.connectToHost();
            }
        });

        this.peer.on('connection', (conn) => {
            // Incoming connection (Host receives this)
            if (this.conn && this.conn.open) {
                console.log("Rejecting extra connection");
                conn.close(); 
                return;
            }
            console.log("Incoming connection from " + conn.peer);
            this.conn = conn;
            this.setupConnection();
            this.statusEl.textContent = "Opponent connected! Game starting...";
            this.gameActive = true;
            this.updateTurnIndicator();
        });

        this.peer.on('error', (err) => {
            console.error(err);
            this.connStatus.textContent = "Error: " + (err.type || err);
            this.connStatus.style.color = "var(--retro-red)";
            
            if (err.type === 'unavailable-id') {
                this.connStatus.textContent = "Room code taken. Try again.";
            } else if (err.type === 'peer-unavailable') {
                this.connStatus.textContent = "Room not found. Check code.";
                // Reset UI if we were trying to join
                if (!this.isHost) {
                     this.isJoining = false;
                }
            }
        });
        
        this.peer.on('disconnected', () => {
             this.connStatus.textContent = "Disconnected from server.";
             this.connStatus.style.color = "var(--retro-red)";
        });
    }

    createRoom() {
        this.isHost = true;
        this.myPlayerId = 1; // Host is Red
        const code = this.generateRoomCode();
        this.initPeer(code);
    }

    joinRoom() {
        const code = this.roomInput.value.toUpperCase().trim();
        if (!code) {
            this.connStatus.textContent = "Please enter a code.";
            return;
        }
        
        this.targetRoomCode = code;
        this.isHost = false;
        this.myPlayerId = 2; // Joiner is Yellow
        
        // Init peer with random ID, then connect in 'open' callback
        this.initPeer(); 
    }
    
    connectToHost() {
        if (!this.targetRoomCode) return;
        
        this.connStatus.textContent = "Connecting to room " + this.targetRoomCode + "...";
        
        const conn = this.peer.connect(this.targetRoomCode, {
            reliable: true
        });
        
        // Connection timeout safety
        const timeout = setTimeout(() => {
            if (!conn.open) {
                this.connStatus.textContent = "Connection timed out. Host offline?";
                this.connStatus.style.color = "var(--retro-red)";
            }
        }, 5000);

        conn.on('open', () => {
            clearTimeout(timeout);
            console.log("Connected to " + conn.peer);
            this.conn = conn;
            this.setupConnection();
            this.startGameUI(this.targetRoomCode);
            this.statusEl.textContent = "Connected! Game starting...";
            this.gameActive = true;
            this.updateTurnIndicator();
        });
        
        conn.on('error', (err) => {
             clearTimeout(timeout);
             console.error("Connection Error:", err);
             this.connStatus.textContent = "Connection failed: " + err;
             this.connStatus.style.color = "var(--retro-red)";
        });
        
        conn.on('close', () => {
             clearTimeout(timeout);
             this.connStatus.textContent = "Connection closed.";
        });
    }

    setupConnection() {
        this.conn.on('data', (data) => {
            console.log('Received:', data);
            this.handleData(data);
        });

        this.conn.on('close', () => {
            this.statusEl.textContent = "Opponent disconnected.";
            this.gameActive = false;
        });
    }

    handleData(data) {
        if (data.type === 'move') {
            this.dropPiece(data.col, data.player, false); // false = don't send back
        } else if (data.type === 'restart') {
            this.resetGame();
        }
    }

    sendData(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    startGameUI(code) {
        this.menu.style.display = 'none';
        this.gameUI.classList.add('visible');
        this.roomDisplay.textContent = code;
        
        if (this.myPlayerId === 1) {
            this.badgeP1.innerHTML = '<span class="p-dot" style="background: var(--retro-red);"></span> YOU (P1)';
            this.badgeP2.innerHTML = 'OPPONENT (P2) <span class="p-dot" style="background: var(--retro-yellow);"></span>';
        } else {
            this.badgeP1.innerHTML = '<span class="p-dot" style="background: var(--retro-red);"></span> OPPONENT (P1)';
            this.badgeP2.innerHTML = 'YOU (P2) <span class="p-dot" style="background: var(--retro-yellow);"></span>';
        }
    }

    // --- Game Logic ---

    updateTurnIndicator() {
        if (!this.gameActive) return;
        
        const isMyTurn = this.currentPlayer === this.myPlayerId;
        if (isMyTurn) {
            this.statusEl.textContent = "YOUR TURN";
            this.statusEl.style.color = this.myPlayerId === 1 ? "var(--retro-red)" : "var(--retro-yellow)";
        } else {
            this.statusEl.textContent = "OPPONENT'S TURN";
            this.statusEl.style.color = "var(--text-secondary)";
        }

        // Update badges
        if (this.currentPlayer === 1) {
            this.badgeP1.classList.add('active');
            this.badgeP2.classList.remove('active');
        } else {
            this.badgeP1.classList.remove('active');
            this.badgeP2.classList.add('active');
        }
    }

    handleCellClick(col) {
        if (!this.gameActive) return;
        if (this.currentPlayer !== this.myPlayerId) return;

        // Check if column is full
        if (this.board[0][col] !== 0) return;

        // Valid move
        this.dropPiece(col, this.myPlayerId, true);
    }

    dropPiece(col, player, isLocal) {
        // Find lowest empty row
        let row = -1;
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r][col] === 0) {
                row = r;
                break;
            }
        }

        if (row === -1) return; // Should not happen if checked

        // Update logic
        this.board[row][col] = player;
        
        // Update Visuals
        const cell = this.boardEl.querySelector(`.cell[data-r="${row}"][data-c="${col}"]`);
        cell.classList.add(player === 1 ? 'red' : 'yellow');
        
        // Animate drop (simple)
        // Check win
        if (this.checkWin(row, col, player)) {
            this.gameActive = false;
            this.statusEl.textContent = player === this.myPlayerId ? "YOU WIN!" : "OPPONENT WINS!";
            this.btnRestart.style.display = 'block';
            this.highlightWin(player);
        } else {
            // Switch turn
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            this.updateTurnIndicator();
        }

        // Send move if local
        if (isLocal) {
            this.sendData({ type: 'move', col: col, player: player });
        }
    }

    checkWin(r, c, player) {
        // Directions: [dr, dc]
        const directions = [
            [0, 1],  // Horizontal
            [1, 0],  // Vertical
            [1, 1],  // Diagonal \
            [1, -1]  // Diagonal /
        ];

        for (let [dr, dc] of directions) {
            let count = 1;
            
            // Check + direction
            for (let i = 1; i < 4; i++) {
                const nr = r + dr * i;
                const nc = c + dc * i;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === player) {
                    count++;
                } else break;
            }
            
            // Check - direction
            for (let i = 1; i < 4; i++) {
                const nr = r - dr * i;
                const nc = c - dc * i;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === player) {
                    count++;
                } else break;
            }

            if (count >= 4) return true;
        }
        return false;
    }

    highlightWin(player) {
        // Lazy highlight: just pulse all player pieces? 
        // Ideally we highlight the winning 4, but I didn't store them.
        // Let's just animate all of the winner's pieces for now for effect.
        const cells = this.boardEl.querySelectorAll(player === 1 ? '.cell.red' : '.cell.yellow');
        cells.forEach(c => c.classList.add('winner'));
    }

    resetGame() {
        this.initBoard();
        this.currentPlayer = 1;
        this.gameActive = true;
        this.btnRestart.style.display = 'none';
        this.updateTurnIndicator();
        this.statusEl.textContent = "Game Restarted!";
        setTimeout(() => this.updateTurnIndicator(), 1000);
    }
}

// Init
window.connect4 = new Connect4();
