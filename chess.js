// Chess Game Logic

// --- Constants & Config ---
const PIECES = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

const BOARD_SIZE = 8;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// Piece Values for AI
const PIECE_VALUES = {
    p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
};

// Simplified PST (Piece-Square Tables) for positional AI
// Flipped for black in evaluation
const PST = {
    p: [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5,  5, 10, 25, 25, 10,  5,  5],
        [0,  0,  0, 20, 20,  0,  0,  0],
        [5, -5,-10,  0,  0,-10, -5,  5],
        [5, 10, 10,-20,-20, 10, 10,  5],
        [0,  0,  0,  0,  0,  0,  0,  0]
    ],
    n: [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    b: [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    r: [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [0,  0,  0,  5,  5,  0,  0,  0]
    ],
    q: [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [-5,  0,  5,  5,  5,  5,  0, -5],
        [0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    k: [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [20, 20,  0,  0,  0,  0, 20, 20],
        [20, 30, 10,  0,  0, 10, 30, 20]
    ]
};


// --- State Variables ---
let board = [];
let turn = 'w'; // 'w' or 'b'
let selectedSquare = null;
let validMoves = []; // Moves for the selected piece
let gameMode = 'ai'; // 'pvp', 'ai'
let aiDifficulty = 2; // 1, 2, 3
let castlingRights = { w: { k: true, q: true }, b: { k: true, q: true } };
let enPassantTarget = null; // {r, c} or null
let gameActive = true;
let moveHistory = [];
let capturedPieces = { w: [], b: [] }; // Pieces captured BY white/black

// --- Initialization ---

function initGame() {
    createBoardArray();
    setupPieces();
    turn = 'w';
    gameActive = true;
    selectedSquare = null;
    validMoves = [];
    capturedPieces = { w: [], b: [] };
    castlingRights = { w: { k: true, q: true }, b: { k: true, q: true } };
    enPassantTarget = null;
    moveHistory = [];
    
    updateUI();
    renderBoard();
}

function createBoardArray() {
    board = Array(8).fill(null).map(() => Array(8).fill(null));
}

function setupPieces() {
    const setupRow = (row, color, pieces) => {
        pieces.forEach((p, col) => {
            board[row][col] = { type: p, color: color };
        });
    };

    const backRow = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    const pawnRow = Array(8).fill('p');

    setupRow(0, 'b', backRow);
    setupRow(1, 'b', pawnRow);
    setupRow(6, 'w', pawnRow);
    setupRow(7, 'w', backRow);
}

// --- Move Generation & Validation ---

function getValidMovesForPiece(r, c, checkCheck = true) {
    const piece = board[r][c];
    if (!piece) return [];
    
    let moves = [];
    
    // Logic for each piece type
    const directions = {
        n: [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]],
        b: [[-1,-1], [-1,1], [1,-1], [1,1]], // Sliding
        r: [[-1,0], [1,0], [0,-1], [0,1]],   // Sliding
        q: [[-1,-1], [-1,1], [1,-1], [1,1], [-1,0], [1,0], [0,-1], [0,1]], // Sliding
        k: [[-1,-1], [-1,1], [1,-1], [1,1], [-1,0], [1,0], [0,-1], [0,1]]
    };

    const isInside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

    if (piece.type === 'p') {
        const dir = piece.color === 'w' ? -1 : 1;
        const startRow = piece.color === 'w' ? 6 : 1;

        // Move forward 1
        if (isInside(r + dir, c) && !board[r + dir][c]) {
            moves.push({ r: r + dir, c: c });
            // Move forward 2
            if (r === startRow && !board[r + dir * 2][c]) {
                moves.push({ r: r + dir * 2, c: c, isDoublePawn: true });
            }
        }
        // Captures
        [[dir, -1], [dir, 1]].forEach(([dr, dc]) => {
            const tr = r + dr, tc = c + dc;
            if (isInside(tr, tc)) {
                const target = board[tr][tc];
                if (target && target.color !== piece.color) {
                    moves.push({ r: tr, c: tc });
                }
                // En Passant
                if (enPassantTarget && enPassantTarget.r === tr && enPassantTarget.c === tc) {
                    moves.push({ r: tr, c: tc, isEnPassant: true });
                }
            }
        });
    } else if (['b', 'r', 'q'].includes(piece.type)) {
        directions[piece.type].forEach(([dr, dc]) => {
            let tr = r + dr, tc = c + dc;
            while (isInside(tr, tc)) {
                const target = board[tr][tc];
                if (!target) {
                    moves.push({ r: tr, c: tc });
                } else {
                    if (target.color !== piece.color) moves.push({ r: tr, c: tc });
                    break;
                }
                tr += dr; tc += dc;
            }
        });
    } else if (piece.type === 'n') {
        directions.n.forEach(([dr, dc]) => {
            const tr = r + dr, tc = c + dc;
            if (isInside(tr, tc)) {
                const target = board[tr][tc];
                if (!target || target.color !== piece.color) {
                    moves.push({ r: tr, c: tc });
                }
            }
        });
    } else if (piece.type === 'k') {
        directions.k.forEach(([dr, dc]) => {
            const tr = r + dr, tc = c + dc;
            if (isInside(tr, tc)) {
                const target = board[tr][tc];
                if (!target || target.color !== piece.color) {
                    moves.push({ r: tr, c: tc });
                }
            }
        });
        
        // Castling
        if (checkCheck && castlingRights[piece.color].k && !isSquareAttacked(r, c, piece.color)) { // Kingside
            if (!board[r][c+1] && !board[r][c+2] && 
                !isSquareAttacked(r, c+1, piece.color) && !isSquareAttacked(r, c+2, piece.color)) {
                moves.push({ r: r, c: c+2, isCastling: 'k' });
            }
        }
        if (checkCheck && castlingRights[piece.color].q && !isSquareAttacked(r, c, piece.color)) { // Queenside
            if (!board[r][c-1] && !board[r][c-2] && !board[r][c-3] && 
                !isSquareAttacked(r, c-1, piece.color) && !isSquareAttacked(r, c-2, piece.color)) {
                moves.push({ r: r, c: c-2, isCastling: 'q' });
            }
        }
    }

    if (checkCheck) {
        // Filter moves that leave King in check
        moves = moves.filter(move => {
            const tempBoard = cloneBoard(board);
            applyMove(tempBoard, { from: {r, c}, to: move });
            // Must find King of current color
            const kingPos = findKing(tempBoard, piece.color);
            return !isSquareAttackedOnBoard(tempBoard, kingPos.r, kingPos.c, piece.color);
        });
    }

    return moves;
}

function isSquareAttacked(r, c, color) {
    return isSquareAttackedOnBoard(board, r, c, color);
}

function isSquareAttackedOnBoard(b, r, c, color) { // color is the DEFENDER's color
    const enemyColor = color === 'w' ? 'b' : 'w';
    // Check all enemy pieces to see if they can attack (r,c)
    // Optimization: check from the square outwards like a piece
    
    // Pawn attacks
    const pawnDir = color === 'w' ? -1 : 1; // Enemy pawns come from opposite dir
    // Wait, if I am White, enemy is Black (top), pawns move DOWN (+1). 
    // If checking if White King at (r,c) is attacked by Black Pawn, 
    // Black pawn must be at (r-1, c-1) or (r-1, c+1).
    const enemyPawnRow = color === 'w' ? r - 1 : r + 1;
    if (enemyPawnRow >= 0 && enemyPawnRow < 8) {
        if (b[enemyPawnRow][c-1] && b[enemyPawnRow][c-1].type === 'p' && b[enemyPawnRow][c-1].color === enemyColor) return true;
        if (b[enemyPawnRow][c+1] && b[enemyPawnRow][c+1].type === 'p' && b[enemyPawnRow][c+1].color === enemyColor) return true;
    }

    // Knight attacks
    const nDir = [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]];
    for (let d of nDir) {
        let tr = r + d[0], tc = c + d[1];
        if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
            const p = b[tr][tc];
            if (p && p.color === enemyColor && p.type === 'n') return true;
        }
    }

    // King attacks
    const kDir = [[-1,-1], [-1,1], [1,-1], [1,1], [-1,0], [1,0], [0,-1], [0,1]];
    for (let d of kDir) {
        let tr = r + d[0], tc = c + d[1];
        if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
            const p = b[tr][tc];
            if (p && p.color === enemyColor && p.type === 'k') return true;
        }
    }
    
    // Sliding (Rook/Queen)
    const rDir = [[-1,0], [1,0], [0,-1], [0,1]];
    for (let d of rDir) {
        let tr = r + d[0], tc = c + d[1];
        while (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
            const p = b[tr][tc];
            if (p) {
                if (p.color === enemyColor && (p.type === 'r' || p.type === 'q')) return true;
                break;
            }
            tr += d[0]; tc += d[1];
        }
    }

    // Sliding (Bishop/Queen)
    const bDir = [[-1,-1], [-1,1], [1,-1], [1,1]];
    for (let d of bDir) {
        let tr = r + d[0], tc = c + d[1];
        while (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
            const p = b[tr][tc];
            if (p) {
                if (p.color === enemyColor && (p.type === 'b' || p.type === 'q')) return true;
                break;
            }
            tr += d[0]; tc += d[1];
        }
    }

    return false;
}

function findKing(b, color) {
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if (b[r][c] && b[r][c].type === 'k' && b[r][c].color === color) {
                return {r, c};
            }
        }
    }
    return {r: 0, c: 0}; // Should not happen
}

function cloneBoard(b) {
    return b.map(row => row.map(p => p ? {...p} : null));
}

function applyMove(b, moveObj) {
    const { from, to } = moveObj;
    const piece = b[from.r][from.c];
    
    // Handle Capture
    // Note: applyMove in simulation doesn't track captured pieces list, only board state.
    // Real move handling handles list.
    
    // Move piece
    b[to.r][to.c] = piece;
    b[from.r][from.c] = null;

    // En Passant Capture
    if (to.isEnPassant) {
        b[from.r][to.c] = null; // Remove the pawn behind
    }

    // Castling
    if (to.isCastling) {
        if (to.isCastling === 'k') {
            const rook = b[from.r][7];
            b[from.r][5] = rook;
            b[from.r][7] = null;
        } else if (to.isCastling === 'q') {
            const rook = b[from.r][0];
            b[from.r][3] = rook;
            b[from.r][0] = null;
        }
    }

    // Promotion
    if (piece.type === 'p' && (to.r === 0 || to.r === 7)) {
        piece.type = 'q';
    }
}

// --- Game Loop & AI ---

function makeMove(from, to, isRealMove = true) {
    if (!gameActive) return;

    const piece = board[from.r][from.c];
    const target = board[to.r][to.c];
    
    // Update Castling Rights
    if (piece.type === 'k') {
        castlingRights[piece.color].k = false;
        castlingRights[piece.color].q = false;
    } else if (piece.type === 'r') {
        if (from.c === 0 && from.r === (piece.color === 'w' ? 7 : 0)) castlingRights[piece.color].q = false;
        if (from.c === 7 && from.r === (piece.color === 'w' ? 7 : 0)) castlingRights[piece.color].k = false;
    }

    // Update En Passant Target
    let nextEnPassant = null;
    if (to.isDoublePawn) {
        nextEnPassant = { r: (from.r + to.r) / 2, c: from.c };
    }
    
    // Execute Move on Real Board
    if (target) {
        capturedPieces[piece.color].push(target);
    }
    if (to.isEnPassant) {
        // Capture pawn
        const pawnRow = from.r;
        const pawnCol = to.c;
        const capturedPawn = board[pawnRow][pawnCol];
        capturedPieces[piece.color].push(capturedPawn);
        board[pawnRow][pawnCol] = null;
    }

    // Actual move
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;

    if (to.isCastling) {
        if (to.isCastling === 'k') {
            board[from.r][5] = board[from.r][7];
            board[from.r][7] = null;
        } else {
            board[from.r][3] = board[from.r][0];
            board[from.r][0] = null;
        }
    }

    if (piece.type === 'p' && (to.r === 0 || to.r === 7)) {
        piece.type = 'q';
    }

    enPassantTarget = nextEnPassant;

    // Switch Turn
    turn = turn === 'w' ? 'b' : 'w';

    if (isRealMove) {
        renderBoard();
        updateUI();
        
        // Check Game Over
        if (checkGameOver()) return;

        // Trigger AI
        if (gameMode === 'ai' && turn === 'b' && gameActive) {
            setTimeout(aiMove, 500);
        }
    }
}

function checkGameOver() {
    // Check if current player has moves
    let hasMoves = false;
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            if (board[r][c] && board[r][c].color === turn) {
                if (getValidMovesForPiece(r, c).length > 0) {
                    hasMoves = true;
                    break;
                }
            }
        }
        if (hasMoves) break;
    }

    const kingPos = findKing(board, turn);
    const isCheck = isSquareAttacked(kingPos.r, kingPos.c, turn);

    if (!hasMoves) {
        gameActive = false;
        if (isCheck) {
            showGameOver(turn === 'w' ? 'Black' : 'White', 'Checkmate');
        } else {
            showGameOver('Draw', 'Stalemate');
        }
        return true;
    }
    
    // Check Status Update
    document.getElementById('status-display').textContent = isCheck ? 'CHECK!' : 'Active';
    document.getElementById('status-display').style.color = isCheck ? 'var(--retro-red)' : 'var(--retro-yellow)';
    
    return false;
}

// --- AI Implementation ---

function aiMove() {
    // Simple Minimax
    const depth = aiDifficulty; 
    // Clone board is tricky with objects, need deep clone
    // Since we don't want to mess up main board state during search
    
    const bestMove = minimaxRoot(depth, 'b');
    if (bestMove) {
        makeMove(bestMove.from, bestMove.to);
    }
}

function evaluateBoard(b) {
    let score = 0;
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            const p = b[r][c];
            if (p) {
                let val = PIECE_VALUES[p.type];
                // Positional score
                let pstVal = 0;
                if (p.color === 'w') {
                    pstVal = PST[p.type][r][c];
                } else {
                    // Mirror for black
                    pstVal = PST[p.type][7-r][c];
                }
                
                if (p.color === 'w') score += (val + pstVal);
                else score -= (val + pstVal);
            }
        }
    }
    return score;
}

function getAllMoves(b, color) {
    let moves = [];
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            if (b[r][c] && b[r][c].color === color) {
                // We need to use the hypothetical board 'b' for move generation logic
                // But getValidMoves uses global 'board' variable.
                // Refactoring getValidMoves to accept board param is needed.
                // NOTE: For simplicity in this script, I'll temporarily swap global board or pass it.
                // Passing it is safer.
                const pieceMoves = getValidMovesForPieceOnBoard(b, r, c, color);
                pieceMoves.forEach(m => {
                    moves.push({ from: {r, c}, to: m });
                });
            }
        }
    }
    return moves;
}

// Duplicate of getValidMoves but accepting board
function getValidMovesForPieceOnBoard(b, r, c, color) {
    // ... Copy logic from getValidMovesForPiece but use 'b' ...
    // To save tokens, I will make getValidMovesForPiece use a passed board or default to global
    // Rewrite getValidMovesForPiece slightly above or here.
    
    // ACTUALLY, for the prototype, let's just use a simpler AI for "Easy/Medium" that doesn't do deep cloning of complex state like Castling rights perfectly, 
    // or just implement the board param support.
    
    return getValidMovesForPieceWithBoard(b, r, c, true);
}

// Rewritten helper that accepts board
function getValidMovesForPieceWithBoard(b, r, c, checkCheck) {
    const piece = b[r][c];
    if (!piece) return [];
    
    let moves = [];
    const directions = {
        n: [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]],
        b: [[-1,-1], [-1,1], [1,-1], [1,1]],
        r: [[-1,0], [1,0], [0,-1], [0,1]],
        q: [[-1,-1], [-1,1], [1,-1], [1,1], [-1,0], [1,0], [0,-1], [0,1]],
        k: [[-1,-1], [-1,1], [1,-1], [1,1], [-1,0], [1,0], [0,-1], [0,1]]
    };
    const isInside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

    if (piece.type === 'p') {
        const dir = piece.color === 'w' ? -1 : 1;
        const startRow = piece.color === 'w' ? 6 : 1;
        if (isInside(r + dir, c) && !b[r + dir][c]) {
            moves.push({ r: r + dir, c: c });
            if (r === startRow && !b[r + dir * 2][c]) moves.push({ r: r + dir * 2, c: c, isDoublePawn: true });
        }
        [[dir, -1], [dir, 1]].forEach(([dr, dc]) => {
            const tr = r + dr, tc = c + dc;
            if (isInside(tr, tc)) {
                const target = b[tr][tc];
                if (target && target.color !== piece.color) moves.push({ r: tr, c: tc });
                // En Passant check on simulation board is hard without history.
                // We will ignore En Passant for AI simulation deep moves to simplify, or only allow on depth 0.
            }
        });
    } else if (['b', 'r', 'q'].includes(piece.type)) {
        directions[piece.type].forEach(([dr, dc]) => {
            let tr = r + dr, tc = c + dc;
            while (isInside(tr, tc)) {
                const target = b[tr][tc];
                if (!target) moves.push({ r: tr, c: tc });
                else {
                    if (target.color !== piece.color) moves.push({ r: tr, c: tc });
                    break;
                }
                tr += dr; tc += dc;
            }
        });
    } else if (piece.type === 'n' || piece.type === 'k') {
        directions[piece.type].forEach(([dr, dc]) => {
            const tr = r + dr, tc = c + dc;
            if (isInside(tr, tc)) {
                const target = b[tr][tc];
                if (!target || target.color !== piece.color) moves.push({ r: tr, c: tc });
            }
        });
    }
    
    // Filter Checks
    if (checkCheck) {
        moves = moves.filter(move => {
            const tempBoard = cloneBoard(b);
            // Apply move logic inline simplified
            tempBoard[move.r][move.c] = tempBoard[r][c];
            tempBoard[r][c] = null;
            const kingPos = findKing(tempBoard, piece.color);
            return !isSquareAttackedOnBoard(tempBoard, kingPos.r, kingPos.c, piece.color);
        });
    }
    return moves;
}

function minimaxRoot(depth, playerColor) {
    const moves = getAllMoves(board, playerColor);
    let bestMove = null;
    let bestValue = -Infinity;

    // Randomize order for variety
    moves.sort(() => Math.random() - 0.5);

    for (let move of moves) {
        const tempBoard = cloneBoard(board);
        applyMove(tempBoard, move);
        const boardValue = minimax(tempBoard, depth - 1, -Infinity, Infinity, false);
        if (boardValue > bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    return bestMove;
}

function minimax(b, depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0) {
        return -evaluateBoard(b); // Negate because eval is from white's perspective usually, but here we want AI (Black) perspective? 
        // Actually eval is: White Positive, Black Negative.
        // If Black is maximizing in this function (isMaximizingPlayer=true for Black logic?), 
        // then we want smaller values (more negative).
        // Let's stick to: Eval returns (White - Black).
        // If isMaximizingPlayer (Black turn in recursive), we want to Minimize Eval.
        // Wait, standard minimax:
        // Root (Black): Wants to Minimize Eval.
        // But I wrote logic "if boardValue > bestValue".
        // Let's flip it. 
        // Root: Find move that gives LOWEST score (most black advantage).
        // My root logic used > bestValue (-Infinity). That implies I'm looking for Max.
        // So I should evaluate from Black's perspective?
        // Let's do: Eval = Black Score - White Score.
        // Then Maximize.
    }

    // Re-eval function:
    // White pieces positive, Black pieces negative.
    // If we want AI (Black) to win, we want MINIMUM score.
    // So Root should look for MIN value.
    
    // Let's fix Root:
    // bestValue = Infinity;
    // if (val < bestValue) ...
    
    // Or just invert Eval.
    // Let's use Inverted Eval: (Black - White).
    
    return isMaximizingPlayer ? -evaluateBoard(b) : evaluateBoard(b); 
    // This is getting confusing. Let's stick to standard:
    // White = Max, Black = Min.
    // Root is Black -> Minimize.
}

// Redoing Minimax Logic cleanly
function minimax_standard(b, depth, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard(b);

    const moves = getAllMoves(b, isMaximizing ? 'w' : 'b');
    if (moves.length === 0) return isMaximizing ? -10000 : 10000; // Checkmate or stalemate rough approx

    if (isMaximizing) { // White
        let maxEval = -Infinity;
        for (let move of moves) {
            const tempBoard = cloneBoard(b);
            applyMove(tempBoard, move);
            const eval = minimax_standard(tempBoard, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, eval);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else { // Black
        let minEval = Infinity;
        for (let move of moves) {
            const tempBoard = cloneBoard(b);
            applyMove(tempBoard, move);
            const eval = minimax_standard(tempBoard, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, eval);
            beta = Math.min(beta, eval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Root caller for Black AI
function minimaxRoot(depth, playerColor) {
    const moves = getAllMoves(board, playerColor); // playerColor is 'b'
    let bestMove = null;
    let bestValue = Infinity; // Black wants to minimize
    
    moves.sort(() => Math.random() - 0.5);

    for (let move of moves) {
        const tempBoard = cloneBoard(board);
        applyMove(tempBoard, move);
        // Next is White's turn (Maximizing)
        const boardValue = minimax_standard(tempBoard, depth - 1, -Infinity, Infinity, true);
        
        if (boardValue < bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    return bestMove;
}


// --- UI Functions ---

function renderBoard() {
    const boardEl = document.getElementById('chess-board');
    boardEl.innerHTML = '';
    
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            const square = document.createElement('div');
            square.className = `square ${(r+c)%2===0 ? 'white' : 'black'}`;
            square.dataset.r = r;
            square.dataset.c = c;
            
            const piece = board[r][c];
            if (piece) {
                const pDiv = document.createElement('div');
                pDiv.className = `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`;
                pDiv.textContent = PIECES[piece.color][piece.type];
                square.appendChild(pDiv);
            }
            
            if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
                square.classList.add('selected');
            }
            
            // Highlight valid moves
            const move = validMoves.find(m => m.r === r && m.c === c);
            if (move) {
                square.classList.add('valid-move');
            }
            
            // Highlight check
            if (piece && piece.type === 'k' && isSquareAttacked(r, c, piece.color)) {
                square.classList.add('check');
            }
            
            square.addEventListener('click', () => handleSquareClick(r, c));
            boardEl.appendChild(square);
        }
    }
    updateCapturedUI();
}

function handleSquareClick(r, c) {
    if (!gameActive) return;
    if (gameMode === 'ai' && turn === 'b') return; // AI Turn

    const clickedPiece = board[r][c];
    
    // Move Selection
    const move = validMoves.find(m => m.r === r && m.c === c);
    if (move) {
        makeMove(selectedSquare, move);
        selectedSquare = null;
        validMoves = [];
        return;
    }

    // Piece Selection
    if (clickedPiece && clickedPiece.color === turn) {
        if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
            // Deselect
            selectedSquare = null;
            validMoves = [];
        } else {
            selectedSquare = { r, c };
            validMoves = getValidMovesForPiece(r, c);
        }
        renderBoard();
    } else {
        selectedSquare = null;
        validMoves = [];
        renderBoard();
    }
}

function updateUI() {
    document.getElementById('turn-display').textContent = turn === 'w' ? 'White' : 'Black';
    document.getElementById('turn-display').style.color = turn === 'w' ? '#fff' : '#aaa';
}

function updateCapturedUI() {
    const wContainer = document.getElementById('captured-white');
    const bContainer = document.getElementById('captured-black');
    wContainer.innerHTML = '';
    bContainer.innerHTML = '';
    
    capturedPieces.w.forEach(p => { // Pieces captured BY White (Black pieces)
        const s = document.createElement('span');
        s.textContent = PIECES[p.color][p.type];
        s.className = 'piece black-piece';
        wContainer.appendChild(s);
    });
    
    capturedPieces.b.forEach(p => { // Pieces captured BY Black (White pieces)
        const s = document.createElement('span');
        s.textContent = PIECES[p.color][p.type];
        s.className = 'piece white-piece';
        bContainer.appendChild(s);
    });
}

function showGameOver(winner, reason) {
    const modal = document.getElementById('game-over-modal');
    document.getElementById('modal-title').textContent = winner + ' Wins!';
    document.getElementById('modal-message').textContent = reason;
    modal.classList.add('visible');
}

// --- Event Listeners ---

document.getElementById('new-game-btn').addEventListener('click', () => {
    initGame();
});

document.getElementById('game-mode').addEventListener('change', (e) => {
    gameMode = e.target.value;
    document.getElementById('difficulty-group').style.display = gameMode === 'ai' ? 'flex' : 'none';
    initGame();
});

document.getElementById('ai-difficulty').addEventListener('change', (e) => {
    aiDifficulty = parseInt(e.target.value);
});

document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.remove('visible');
    initGame();
});

// Settings Logic (Copied/Adapted from game.js)
const settingsOverlay = document.getElementById("settings-overlay");
const settingsClose = document.getElementById("settings-close");
const themeGrid = document.getElementById("theme-grid");
const settingsHintBtn = document.querySelector(".settings-hint");
const resetSettingsBtn = document.getElementById("reset-settings");

settingsHintBtn.addEventListener("click", () => settingsOverlay.classList.add("visible"));
settingsClose.addEventListener("click", () => settingsOverlay.classList.remove("visible"));
settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) settingsOverlay.classList.remove("visible");
});

themeGrid.addEventListener("click", (e) => {
    const themeBtn = e.target.closest(".theme-btn");
    if (!themeBtn) return;
    const theme = themeBtn.dataset.theme;
    document.body.classList.forEach(c => {
        if (c.startsWith('theme-')) document.body.classList.remove(c);
    });
    if (theme !== 'default') document.body.classList.add(`theme-${theme}`);
    
    themeGrid.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
    themeBtn.classList.add("active");
    localStorage.setItem("gameTheme", theme);
});

resetSettingsBtn.addEventListener("click", () => {
    if(confirm("Reset all settings?")) {
        localStorage.removeItem("gameTheme");
        location.reload();
    }
});

// Load Settings
const savedTheme = localStorage.getItem("gameTheme");
if (savedTheme) {
    document.body.classList.add(`theme-${savedTheme}`);
    const btn = themeGrid.querySelector(`[data-theme="${savedTheme}"]`);
    if (btn) {
        themeGrid.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    }
}

// --- Start ---
initGame();
