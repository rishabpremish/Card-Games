import { WebSocketServer } from "ws";
import { createServer } from "http";
import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { join, extname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 3001;

// ── MIME types for static file serving ──
const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

// ── Locate built client files ──
// Try multiple possible locations for client/dist
const candidates = [
  join(__dirname, "..", "client", "dist"), // from server/ → ../client/dist
  join(process.cwd(), "..", "client", "dist"), // from cwd (server/) → ../client/dist
  join(process.cwd(), "client", "dist"), // from repo root → client/dist
  resolve("client", "dist"), // resolve from cwd
  resolve("..", "client", "dist"), // resolve up one level
];

let CLIENT_DIST = candidates[0]; // default fallback

console.log("── Path diagnostics ──");
console.log("  __dirname:", __dirname);
console.log("  cwd:", process.cwd());

for (const candidate of candidates) {
  const idx = join(candidate, "index.html");
  const found = existsSync(idx);
  console.log(
    `  ${found ? "✓" : "✗"} ${candidate} ${found ? "(index.html found)" : ""}`,
  );
  if (
    (found && CLIENT_DIST === candidates[0]) ||
    (found && !existsSync(join(CLIENT_DIST, "index.html")))
  ) {
    CLIENT_DIST = candidate;
  }
}

console.log("  → Using CLIENT_DIST:", CLIENT_DIST);

// Cache index.html in memory once at startup so SPA fallback is instant
let indexHtml = null;
const indexPath = join(CLIENT_DIST, "index.html");
if (existsSync(indexPath)) {
  indexHtml = readFileSync(indexPath);
  console.log("✓ Loaded index.html from", indexPath);
} else {
  console.warn("⚠ index.html not found at", indexPath);
  // Log what IS at the parent directories to help debug
  try {
    const parentDir = join(CLIENT_DIST, "..");
    if (existsSync(parentDir)) {
      console.warn(
        "  Contents of",
        parentDir,
        ":",
        readdirSync(parentDir).join(", "),
      );
    }
    const grandparent = join(CLIENT_DIST, "..", "..");
    if (existsSync(grandparent)) {
      console.warn(
        "  Contents of",
        grandparent,
        ":",
        readdirSync(grandparent).join(", "),
      );
    }
  } catch (e) {
    console.warn("  Could not list directories:", e.message);
  }
}

const httpServer = createServer((req, res) => {
  // Health check endpoint for Render
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  // Parse the URL to strip query strings and decode percent-encoding
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
  } catch {
    pathname = req.url;
  }

  // Try to serve static file from client/dist
  const filePath = join(
    CLIENT_DIST,
    pathname === "/" ? "index.html" : pathname,
  );

  // Security: prevent directory traversal
  if (!filePath.startsWith(CLIENT_DIST)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath);
    const contentType = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(readFileSync(filePath));
  } else {
    // SPA fallback — serve index.html for all client-side routes
    if (indexHtml) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(indexHtml);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found — index.html missing from build output");
    }
  }
});

const wss = new WebSocketServer({ server: httpServer });

// ============================================
// CONSTANTS
// ============================================
const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = [
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
  "A",
];
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const TURN_TIMEOUT_MS = 25000;
const RECONNECT_WINDOW_MS = 45000;
const SPECTATOR_DELAY_MS = 2500;
const BIG_POT_THRESHOLD = 200;
const RUN_IT_TWICE_FEE_PERCENT = 0.01;
const INSURANCE_FEE_PERCENT = 0.05;
const INSURANCE_PAYOUT_RATIO = 0.5;

// House profit model: pot rake
// 5% rake, capped at $5, only when pot reaches $40+ (2 big blinds)
const RAKE_PERCENT = 0.05;
const RAKE_CAP = 5;
const RAKE_MIN_POT = BIG_BLIND * 2;

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
  HIGH_CARD: 1,
};

// ============================================
// ROOM & CONNECTION STATE
// ============================================
const rooms = new Map();
const playerSockets = new Map();
const disconnectTimers = new Map();
const turnTimers = new Map();

function clearDisconnectTimer(playerId) {
  const t = disconnectTimers.get(playerId);
  if (t) {
    clearTimeout(t);
    disconnectTimers.delete(playerId);
  }
}

function clearTurnTimer(roomCode) {
  const t = turnTimers.get(roomCode);
  if (t) {
    clearTimeout(t);
    turnTimers.delete(roomCode);
  }
}

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * 26)];
  return rooms.has(code) ? generateRoomCode() : code;
}

let _pid = 0;
function generatePlayerId() {
  return "p_" + ++_pid + "_" + Math.random().toString(36).slice(2, 8);
}

function generateReconnectKey() {
  return (
    "rk_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
  );
}

// ============================================
// DECK & CARD UTILITIES
// ============================================
function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const value of VALUES) deck.push({ suit, value });
  return deck;
}

function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardNumericValue(value) {
  const map = { J: 11, Q: 12, K: 13, A: 14 };
  return map[value] || parseInt(value);
}

// ============================================
// HAND EVALUATION
// ============================================
function getCombinations(arr, k) {
  const result = [];
  (function go(start, combo) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      go(i + 1, combo);
      combo.pop();
    }
  })(0, []);
  return result;
}

function evaluateHand(cards) {
  if (cards.length < 5) return { rank: 0, name: "Invalid", highCards: [] };
  const combos = getCombinations(cards, 5);
  let best = { rank: 0, name: "High Card", highCards: [] };
  for (const combo of combos) {
    const h = evalFive(combo);
    if (
      h.rank > best.rank ||
      (h.rank === best.rank && cmpHigh(h.highCards, best.highCards) > 0)
    )
      best = h;
  }
  return best;
}

function evalFive(cards) {
  const vals = cards
    .map((c) => cardNumericValue(c.value))
    .sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  // Straight detection (including A-low)
  let isStraight = false;
  let straightHigh = 0;
  const unique = [...new Set(vals)].sort((a, b) => b - a);
  if (unique.length >= 5 && unique[0] - unique[4] === 4) {
    isStraight = true;
    straightHigh = unique[0];
  }
  // Ace-low straight (A-2-3-4-5)
  if (
    !isStraight &&
    unique.includes(14) &&
    unique.includes(5) &&
    unique.includes(4) &&
    unique.includes(3) &&
    unique.includes(2)
  ) {
    isStraight = true;
    straightHigh = 5; // 5-high straight
  }

  const counts = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([v, c]) => ({ val: +v, count: c }))
    .sort((a, b) => b.count - a.count || b.val - a.val);

  const sortedByGroups = groups.flatMap((g) => Array(g.count).fill(g.val));

  if (isFlush && isStraight && straightHigh === 14)
    return {
      rank: HAND_RANKS.ROYAL_FLUSH,
      name: "Royal Flush",
      highCards: vals,
    };
  if (isFlush && isStraight)
    return {
      rank: HAND_RANKS.STRAIGHT_FLUSH,
      name: "Straight Flush",
      highCards: [straightHigh],
    };
  if (groups[0].count === 4)
    return {
      rank: HAND_RANKS.FOUR_OF_A_KIND,
      name: "Four of a Kind",
      highCards: sortedByGroups,
    };
  if (groups[0].count === 3 && groups[1]?.count === 2)
    return {
      rank: HAND_RANKS.FULL_HOUSE,
      name: "Full House",
      highCards: sortedByGroups,
    };
  if (isFlush)
    return { rank: HAND_RANKS.FLUSH, name: "Flush", highCards: vals };
  if (isStraight)
    return {
      rank: HAND_RANKS.STRAIGHT,
      name: "Straight",
      highCards: [straightHigh],
    };
  if (groups[0].count === 3)
    return {
      rank: HAND_RANKS.THREE_OF_A_KIND,
      name: "Three of a Kind",
      highCards: sortedByGroups,
    };
  if (groups[0].count === 2 && groups[1]?.count === 2)
    return {
      rank: HAND_RANKS.TWO_PAIR,
      name: "Two Pair",
      highCards: sortedByGroups,
    };
  if (groups[0].count === 2)
    return {
      rank: HAND_RANKS.ONE_PAIR,
      name: "One Pair",
      highCards: sortedByGroups,
    };
  return { rank: HAND_RANKS.HIGH_CARD, name: "High Card", highCards: vals };
}

function cmpHigh(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// ============================================
// GAME STATE MANAGEMENT
// ============================================
function createRoom(hostId, hostName, buyIn) {
  const code = generateRoomCode();
  const now = Date.now();
  const room = {
    code,
    hostId,
    players: [
      {
        id: hostId,
        reconnectKey: generateReconnectKey(),
        name: hostName,
        chips: buyIn,
        cards: [],
        bet: 0,
        totalBet: 0,
        folded: false,
        isAllIn: false,
        isConnected: true,
        seatIndex: 0,
        buyIn,
        autoInsurance: false,
        runItTwiceOptIn: false,
        insurancePayout: 0,
        lastActiveAt: now,
      },
    ],
    spectators: [],
    roomOptions: {
      runItTwiceEnabled: true,
      insuranceEnabled: true,
    },
    gameState: "waiting",
    deck: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    minRaise: BIG_BLIND,
    dealerIndex: -1,
    currentPlayerIndex: 0,
    lastRaiserIndex: -1,
    actedThisRound: [],
    winners: null,
    handNumber: 0,
    actionLog: [],
    totalRake: 0,
  };
  rooms.set(code, room);
  return room;
}

function joinRoom(roomCode, playerId, playerName, buyIn) {
  const room = rooms.get(roomCode);
  if (!room) return { error: "Room not found" };
  if (room.players.length >= 8) return { error: "Room is full (max 8)" };
  if (room.gameState !== "waiting" && room.gameState !== "showdown")
    return { error: "Game in progress" };

  const usedSeats = new Set(room.players.map((p) => p.seatIndex));
  let seat = 0;
  while (usedSeats.has(seat)) seat++;

  room.players.push({
    id: playerId,
    reconnectKey: generateReconnectKey(),
    name: playerName,
    chips: buyIn,
    cards: [],
    bet: 0,
    totalBet: 0,
    folded: false,
    isAllIn: false,
    isConnected: true,
    seatIndex: seat,
    buyIn,
    autoInsurance: false,
    runItTwiceOptIn: false,
    insurancePayout: 0,
    lastActiveAt: Date.now(),
  });
  return { success: true, room };
}

function spectateRoom(roomCode, spectatorId, spectatorName = "Spectator") {
  const room = rooms.get(roomCode);
  if (!room) return { error: "Room not found" };

  const existing = room.spectators.find((s) => s.id === spectatorId);
  if (existing) {
    existing.isConnected = true;
    existing.name = spectatorName || existing.name;
    return { success: true, room };
  }

  room.spectators.push({
    id: spectatorId,
    name: spectatorName,
    isConnected: true,
    joinedAt: Date.now(),
  });
  return { success: true, room };
}

function reconnectPlayer(roomCode, reconnectKey) {
  const room = rooms.get(roomCode);
  if (!room) return { error: "Room not found" };
  const player = room.players.find((p) => p.reconnectKey === reconnectKey);
  if (!player) return { error: "Reconnect token invalid" };

  player.isConnected = true;
  player.lastActiveAt = Date.now();
  clearDisconnectTimer(player.id);
  return { success: true, room, player };
}

function leaveRoom(roomCode, playerId) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return null;
  clearDisconnectTimer(playerId);

  const player = room.players[idx];
  const cashOutAmount = player.chips;

  if (room.gameState === "waiting" || room.gameState === "showdown") {
    room.players.splice(idx, 1);
    if (room.players.length === 0) {
      clearTurnTimer(roomCode);
      rooms.delete(roomCode);
      return { roomDeleted: true, cashOutAmount };
    }
    if (room.hostId === playerId) room.hostId = room.players[0].id;
    // Fix indices
    if (room.dealerIndex >= room.players.length) room.dealerIndex = 0;
    if (room.currentPlayerIndex >= room.players.length)
      room.currentPlayerIndex = 0;
  } else {
    player.isConnected = false;
    player.folded = true;
    const active = room.players.filter((p) => !p.folded);
    if (active.length === 0) {
      // Everyone left/folded — just reset to waiting
      room.gameState = "waiting";
      room.pot = 0;
    } else if (active.length === 1) {
      endHand(room);
    } else if (room.currentPlayerIndex === idx) {
      advanceToNextPlayer(room);
    }
  }
  return { room, cashOutAmount };
}

function leaveSpectator(roomCode, spectatorId) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  const idx = room.spectators.findIndex((s) => s.id === spectatorId);
  if (idx === -1) return null;
  room.spectators.splice(idx, 1);
  return { room };
}

function startGame(room) {
  const eligible = room.players.filter((p) => p.chips > 0 && p.isConnected);
  if (eligible.length < 2)
    return { error: "Need at least 2 players with chips" };
  startNewHand(room);
  return { success: true };
}

function startNewHand(room) {
  room.deck = shuffleDeck(createDeck());
  room.communityCards = [];
  room.pot = 0;
  room.currentBet = 0;
  room.minRaise = BIG_BLIND;
  room.lastRaiserIndex = -1;
  room.actedThisRound = [];
  room.winners = null;
  room.actionLog = [];
  room.handNumber++;

  // Remove busted disconnected players
  room.players = room.players.filter((p) => p.chips > 0 || p.isConnected);
  const eligible = room.players.filter((p) => p.chips > 0 && p.isConnected);
  if (eligible.length < 2) {
    room.gameState = "waiting";
    return;
  }

  for (const p of room.players) {
    p.cards = [];
    p.bet = 0;
    p.totalBet = 0;
    p.folded = p.chips <= 0;
    p.isAllIn = false;
    p.runItTwiceOptIn = false;
    p.insurancePayout = 0;
  }

  // Move dealer
  room.dealerIndex = nextActiveIndex(room, room.dealerIndex);

  // Deal 2 cards each
  for (const p of room.players) {
    if (!p.folded) {
      p.cards = [room.deck.pop(), room.deck.pop()];
    }
  }

  // Post blinds
  const sbIdx = nextActiveIndex(room, room.dealerIndex);
  const bbIdx = nextActiveIndex(room, sbIdx);
  postBlind(room, sbIdx, SMALL_BLIND);
  postBlind(room, bbIdx, BIG_BLIND);

  room.currentBet = BIG_BLIND;
  room.currentPlayerIndex = nextActiveIndex(room, bbIdx);
  room.lastRaiserIndex = bbIdx;
  room.gameState = "preflop";

  room.actionLog.push({
    type: "blind",
    player: room.players[sbIdx].name,
    amount: Math.min(
      SMALL_BLIND,
      room.players[sbIdx].chips +
        Math.min(SMALL_BLIND, room.players[sbIdx].bet),
    ),
  });
  room.actionLog.push({
    type: "blind",
    player: room.players[bbIdx].name,
    amount: Math.min(
      BIG_BLIND,
      room.players[bbIdx].chips + Math.min(BIG_BLIND, room.players[bbIdx].bet),
    ),
  });

  skipIfCantAct(room);
  scheduleTurnTimeout(room);
}

function nextActiveIndex(room, fromIndex) {
  let idx = (fromIndex + 1) % room.players.length;
  let safety = 0;
  while (safety < room.players.length) {
    if (
      !room.players[idx].folded &&
      room.players[idx].chips >= 0 &&
      room.players[idx].isConnected
    )
      return idx;
    idx = (idx + 1) % room.players.length;
    safety++;
  }
  return fromIndex;
}

function postBlind(room, playerIndex, amount) {
  const p = room.players[playerIndex];
  const actual = Math.min(amount, p.chips);
  p.chips -= actual;
  p.bet = actual;
  p.totalBet = actual;
  room.pot += actual;
  if (p.chips === 0) p.isAllIn = true;
}

function skipIfCantAct(room) {
  let tries = 0;
  while (tries < room.players.length) {
    const p = room.players[room.currentPlayerIndex];
    if (!p.folded && !p.isAllIn && p.isConnected) break;
    room.currentPlayerIndex =
      (room.currentPlayerIndex + 1) % room.players.length;
    tries++;
  }
  // If no one can act, advance state
  if (tries >= room.players.length) {
    advanceGameState(room);
  }
}

function scheduleTurnTimeout(room) {
  clearTurnTimer(room.code);
  if (room.gameState === "waiting" || room.gameState === "showdown") return;

  const current = room.players[room.currentPlayerIndex];
  if (!current || current.folded || current.isAllIn) return;

  room.turnDeadline = Date.now() + TURN_TIMEOUT_MS;
  const timer = setTimeout(() => {
    const freshRoom = rooms.get(room.code);
    if (!freshRoom) return;
    if (
      freshRoom.gameState === "waiting" ||
      freshRoom.gameState === "showdown"
    ) {
      return;
    }

    const p = freshRoom.players[freshRoom.currentPlayerIndex];
    if (!p || p.folded || p.isAllIn) {
      scheduleTurnTimeout(freshRoom);
      return;
    }

    freshRoom.actionLog.push({ type: "timeout", player: p.name });
    handlePlayerAction(freshRoom, p.id, "fold", 0);
    broadcastRoom(freshRoom, (pid, isSpectator) => ({
      type: "GAME_UPDATE",
      gameState: publicState(
        freshRoom,
        pid,
        isSpectator ? "spectator" : "player",
      ),
      lastAction: { playerId: p.id, action: "timeout" },
    }));
  }, TURN_TIMEOUT_MS);

  turnTimers.set(room.code, timer);
}

// ============================================
// PLAYER ACTIONS
// ============================================
function handlePlayerAction(room, playerId, action, amount = 0) {
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return { error: "Player not found" };
  if (idx !== room.currentPlayerIndex) return { error: "Not your turn" };
  if (room.gameState === "waiting" || room.gameState === "showdown")
    return { error: "No active hand" };

  const player = room.players[idx];
  player.lastActiveAt = Date.now();
  if (player.folded || player.isAllIn) return { error: "Cannot act" };

  switch (action) {
    case "fold":
      player.folded = true;
      room.actionLog.push({ type: "fold", player: player.name });
      break;

    case "check":
      if (room.currentBet > player.bet)
        return { error: "Cannot check — must call or fold" };
      room.actionLog.push({ type: "check", player: player.name });
      break;

    case "call": {
      const callAmt = Math.min(room.currentBet - player.bet, player.chips);
      player.chips -= callAmt;
      player.bet += callAmt;
      player.totalBet += callAmt;
      room.pot += callAmt;
      if (player.chips === 0) player.isAllIn = true;
      room.actionLog.push({
        type: "call",
        player: player.name,
        amount: callAmt,
      });
      break;
    }

    case "raise": {
      const minTotal = room.currentBet + room.minRaise;
      const wantTotal = Math.max(amount, minTotal);
      const needed = Math.min(wantTotal - player.bet, player.chips);
      const newBet = player.bet + needed;
      const raiseBy = newBet - room.currentBet;

      player.chips -= needed;
      player.bet = newBet;
      player.totalBet += needed;
      room.pot += needed;

      if (raiseBy >= room.minRaise) room.minRaise = raiseBy;
      room.currentBet = newBet;
      room.lastRaiserIndex = idx;
      room.actedThisRound = [idx]; // reset — everyone else needs to act again
      if (player.chips === 0) player.isAllIn = true;
      room.actionLog.push({
        type: "raise",
        player: player.name,
        amount: newBet,
      });
      break;
    }

    case "allin": {
      const allAmt = player.chips;
      const newBet = player.bet + allAmt;
      if (newBet > room.currentBet) {
        const raiseBy = newBet - room.currentBet;
        if (raiseBy >= room.minRaise) room.minRaise = raiseBy;
        room.currentBet = newBet;
        room.lastRaiserIndex = idx;
        room.actedThisRound = [idx];
      }
      player.chips = 0;
      player.totalBet += allAmt;
      player.bet = newBet;
      room.pot += allAmt;
      player.isAllIn = true;
      room.actionLog.push({
        type: "allin",
        player: player.name,
        amount: newBet,
      });
      break;
    }

    default:
      return { error: "Invalid action" };
  }

  if (!room.actedThisRound.includes(idx)) room.actedThisRound.push(idx);

  // Check outcomes
  const active = room.players.filter((p) => !p.folded);
  if (active.length === 1) {
    endHand(room);
    return { success: true };
  }

  const canAct = active.filter((p) => !p.isAllIn);
  if (canAct.length <= 1 && isBettingDone(room)) {
    advanceGameState(room);
  } else if (isBettingDone(room)) {
    advanceGameState(room);
  } else {
    advanceToNextPlayer(room);
  }

  if (room.gameState === "waiting" || room.gameState === "showdown") {
    clearTurnTimer(room.code);
  } else {
    scheduleTurnTimeout(room);
  }

  return { success: true };
}

function isBettingDone(room) {
  const active = room.players.filter(
    (p) => !p.folded && !p.isAllIn && p.isConnected,
  );
  for (const p of active) {
    const idx = room.players.indexOf(p);
    if (!room.actedThisRound.includes(idx)) return false;
    if (p.bet < room.currentBet) return false;
  }
  return true;
}

function advanceToNextPlayer(room) {
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  skipIfCantAct(room);
}

function advanceGameState(room) {
  // Reset bets for new street
  for (const p of room.players) p.bet = 0;
  room.currentBet = 0;
  room.minRaise = BIG_BLIND;
  room.actedThisRound = [];
  room.lastRaiserIndex = -1;

  switch (room.gameState) {
    case "preflop":
      room.communityCards = [room.deck.pop(), room.deck.pop(), room.deck.pop()];
      room.gameState = "flop";
      room.actionLog.push({ type: "street", street: "Flop" });
      break;
    case "flop":
      room.communityCards.push(room.deck.pop());
      room.gameState = "turn";
      room.actionLog.push({ type: "street", street: "Turn" });
      break;
    case "turn":
      room.communityCards.push(room.deck.pop());
      room.gameState = "river";
      room.actionLog.push({ type: "street", street: "River" });
      break;
    case "river":
      endHand(room);
      return;
  }

  // First active player after dealer
  room.currentPlayerIndex = nextActiveIndex(room, room.dealerIndex);

  // If only <=1 can act, skip to next street
  const canAct = room.players.filter(
    (p) => !p.folded && !p.isAllIn && p.isConnected,
  );
  if (canAct.length <= 1) {
    advanceGameState(room);
  } else {
    skipIfCantAct(room);
  }
}

// ============================================
// END HAND & POT DISTRIBUTION
// ============================================
function endHand(room) {
  clearTurnTimer(room.code);
  room.gameState = "showdown";

  // Deal remaining community cards for all-in situations
  // Guard against missing or empty deck
  if (room.deck && room.deck.length > 0) {
    while (room.communityCards.length < 5 && room.deck.length > 0) {
      room.communityCards.push(room.deck.pop());
    }
  }

  const active = room.players.filter((p) => !p.folded);

  // No active players — nothing to do
  if (active.length === 0) {
    room.pot = 0;
    room.winners = [];
    return;
  }

  // Apply pot rake (house profit) before awarding pot
  // Only rake if at least two players contributed to the pot.
  const contributors = room.players.filter((p) => (p.totalBet || 0) > 0);
  if (room.pot >= RAKE_MIN_POT && contributors.length >= 2) {
    const rake = Math.min(RAKE_CAP, Math.floor(room.pot * RAKE_PERCENT));
    if (rake > 0) {
      room.pot -= rake;
      room.totalRake = (room.totalRake || 0) + rake;
      room.actionLog.push({ type: "rake", amount: rake });
    }
  }

  const potAfterRake = room.pot;

  // Optional Run It Twice for heads-up all-in pots
  if (
    room.roomOptions?.runItTwiceEnabled &&
    active.length === 2 &&
    active.every((p) => p.isAllIn || p.chips === 0) &&
    active.every((p) => p.runItTwiceOptIn) &&
    potAfterRake >= BIG_POT_THRESHOLD
  ) {
    const runTwiceFee = Math.max(
      1,
      Math.floor(potAfterRake * RUN_IT_TWICE_FEE_PERCENT),
    );
    room.pot = Math.max(0, potAfterRake - runTwiceFee);
    room.actionLog.push({ type: "run_it_twice_fee", amount: runTwiceFee });

    const baseBoard = [...room.communityCards];
    const drawDeck = shuffleDeck([...(room.deck || [])]);
    const board1 = [...baseBoard];
    const board2 = [...baseBoard];
    while (board1.length < 5 && drawDeck.length) board1.push(drawDeck.pop());
    while (board2.length < 5 && drawDeck.length) board2.push(drawDeck.pop());
    room.communityCards = board2;

    const half1 = Math.floor(room.pot / 2);
    const half2 = room.pot - half1;
    const winAcc = new Map();

    const awardBoard = (board, boardPot, boardNo) => {
      const evaluated = active.map((p) => ({
        player: p,
        hand: evaluateHand([...(p.cards || []), ...board]),
      }));
      evaluated.sort((a, b) => {
        if (b.hand.rank !== a.hand.rank) return b.hand.rank - a.hand.rank;
        return cmpHigh(b.hand.highCards, a.hand.highCards);
      });
      const best = evaluated[0];
      const winners = evaluated.filter(
        (e) =>
          e.hand.rank === best.hand.rank &&
          cmpHigh(e.hand.highCards, best.hand.highCards) === 0,
      );
      const share = Math.floor(boardPot / winners.length);
      const remainder = boardPot - share * winners.length;
      winners.forEach((w, index) => {
        const amount = share + (index === 0 ? remainder : 0);
        w.player.chips += amount;
        const prev = winAcc.get(w.player.id) || {
          playerId: w.player.id,
          name: w.player.name,
          amount: 0,
          hand: w.hand,
        };
        prev.amount += amount;
        winAcc.set(w.player.id, prev);
      });
      room.actionLog.push({ type: "run_it_twice_board", amount: boardNo });
    };

    awardBoard(board1, half1, 1);
    awardBoard(board2, half2, 2);

    room.winners = Array.from(winAcc.values());
    for (const w of room.winners) {
      room.actionLog.push({
        type: "win",
        player: w.name,
        amount: w.amount,
        hand: w.hand?.name,
      });
    }

    room.pot = 0;
    return;
  }

  if (active.length === 1) {
    active[0].chips += room.pot;
    room.winners = [
      {
        playerId: active[0].id,
        name: active[0].name,
        amount: room.pot,
        hand: null,
      },
    ];
    room.actionLog.push({
      type: "win",
      player: active[0].name,
      amount: room.pot,
    });
  } else {
    // Evaluate hands — skip players with no cards (shouldn't happen but guard)
    const evaluable = active.filter(
      (p) => p.cards && p.cards.length > 0 && room.communityCards.length >= 3,
    );

    if (evaluable.length === 0) {
      // Can't evaluate — give pot to first active player
      active[0].chips += room.pot;
      room.winners = [
        {
          playerId: active[0].id,
          name: active[0].name,
          amount: room.pot,
          hand: null,
        },
      ];
      room.actionLog.push({
        type: "win",
        player: active[0].name,
        amount: room.pot,
      });
    } else {
      // Evaluate hands
      const evaluated = evaluable.map((p) => ({
        player: p,
        hand: evaluateHand([...p.cards, ...room.communityCards]),
      }));
      evaluated.sort((a, b) => {
        if (b.hand.rank !== a.hand.rank) return b.hand.rank - a.hand.rank;
        return cmpHigh(b.hand.highCards, a.hand.highCards);
      });

      // Side pot logic
      const allInAmounts = active
        .filter((p) => p.isAllIn)
        .map((p) => p.totalBet)
        .sort((a, b) => a - b);
      const levels = [...new Set([...allInAmounts, Infinity])];

      let remaining = room.pot;
      room.winners = [];
      let distributed = 0;

      for (const level of levels) {
        if (remaining <= 0) break;

        // Players eligible at this level: those whose totalBet reaches this level
        const eligible = evaluated.filter(
          (e) => !e.player.isAllIn || e.player.totalBet >= level,
        );

        if (eligible.length === 0) continue;

        // Calculate pot for this level
        let potForLevel = 0;
        const prevLevel = levels[levels.indexOf(level) - 1] || 0;
        for (const p of room.players) {
          if (!p.folded || p.totalBet > 0) {
            potForLevel +=
              Math.min(p.totalBet, level) - Math.min(p.totalBet, prevLevel);
          }
        }

        if (potForLevel <= 0) continue;

        // Find winner(s) among eligible
        const best = eligible[0];
        const winners = eligible.filter(
          (e) =>
            e.hand.rank === best.hand.rank &&
            cmpHigh(e.hand.highCards, best.hand.highCards) === 0,
        );

        const share = Math.floor(potForLevel / winners.length);
        for (const w of winners) {
          w.player.chips += share;
          distributed += share;
          const existing = room.winners.find((x) => x.playerId === w.player.id);
          if (existing) {
            existing.amount += share;
          } else {
            room.winners.push({
              playerId: w.player.id,
              name: w.player.name,
              amount: share,
              hand: w.hand,
            });
          }
        }
        remaining -= potForLevel;
      }

      // Any remainder due to rounding goes to first winner
      const leftover = room.pot - distributed;
      if (leftover > 0 && room.winners.length > 0) {
        room.winners[0].amount += leftover;
        const wp = active.find((p) => p.id === room.winners[0].playerId);
        if (wp) wp.chips += leftover;
      }

      for (const w of room.winners) {
        room.actionLog.push({
          type: "win",
          player: w.name,
          amount: w.amount,
          hand: w.hand?.name,
        });
      }
    } // end evaluable else
  }

  // Optional insurance payout for losing insured players in big pots
  if (room.roomOptions?.insuranceEnabled && potAfterRake >= BIG_POT_THRESHOLD) {
    const winnerIds = new Set((room.winners || []).map((w) => w.playerId));
    for (const p of room.players) {
      if (!p.autoInsurance || p.totalBet <= 0 || winnerIds.has(p.id)) continue;
      const grossCover = Math.floor(p.totalBet * INSURANCE_PAYOUT_RATIO);
      const fee = Math.ceil(grossCover * INSURANCE_FEE_PERCENT);
      const payout = Math.max(0, grossCover - fee);
      if (payout > 0) {
        p.chips += payout;
        p.insurancePayout = payout;
        room.actionLog.push({
          type: "insurance",
          player: p.name,
          amount: payout,
        });
      }
    }
  }

  room.pot = 0;
}

// ============================================
// BROADCASTING
// ============================================
function sendTo(playerId, msg) {
  const ws = playerSockets.get(playerId);
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcastRoom(room, msgFn) {
  for (const p of room.players) {
    sendTo(p.id, typeof msgFn === "function" ? msgFn(p.id, false) : msgFn);
  }

  for (const s of room.spectators || []) {
    if (!s.isConnected) continue;
    const msg = typeof msgFn === "function" ? msgFn(s.id, true) : msgFn;
    setTimeout(() => {
      sendTo(s.id, msg);
    }, SPECTATOR_DELAY_MS);
  }
}

function publicState(room, forPlayerId, viewerType = "player") {
  const isShowdown = room.gameState === "showdown";
  const isSpectator = viewerType === "spectator";
  return {
    roomCode: room.code,
    hostId: room.hostId,
    isSpectator,
    spectatorCount: (room.spectators || []).filter((s) => s.isConnected).length,
    roomOptions: room.roomOptions,
    turnDeadline: room.turnDeadline || null,
    turnTimeoutMs: TURN_TIMEOUT_MS,
    gameState: room.gameState,
    communityCards: room.communityCards,
    pot: room.pot,
    currentBet: room.currentBet,
    minRaise: room.minRaise,
    dealerIndex: room.dealerIndex,
    currentPlayerIndex: room.currentPlayerIndex,
    winners: room.winners,
    handNumber: room.handNumber,
    actionLog: room.actionLog.slice(-20),
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
    players: room.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      bet: p.bet,
      totalBet: p.totalBet,
      folded: p.folded,
      isAllIn: p.isAllIn,
      isConnected: p.isConnected,
      autoInsurance: !!p.autoInsurance,
      runItTwiceOptIn: !!p.runItTwiceOptIn,
      seatIndex: p.seatIndex,
      cards:
        !isSpectator && (p.id === forPlayerId || (isShowdown && !p.folded))
          ? p.cards
          : p.cards.map(() => null),
      isCurrentPlayer:
        i === room.currentPlayerIndex &&
        room.gameState !== "waiting" &&
        room.gameState !== "showdown",
    })),
  };
}

// ============================================
// WEBSOCKET HANDLING
// ============================================
wss.on("connection", (ws) => {
  let playerId = null;
  let currentRoomCode = null;
  let isSpectator = false;

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case "RECONNECT": {
          const roomCode = (msg.roomCode || "").toUpperCase();
          const reconnectKey = msg.reconnectKey || "";
          if (!roomCode || !reconnectKey) {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                error: "Missing reconnect credentials",
              }),
            );
            return;
          }
          const result = reconnectPlayer(roomCode, reconnectKey);
          if (result.error) {
            ws.send(JSON.stringify({ type: "ERROR", error: result.error }));
            return;
          }

          playerId = result.player.id;
          currentRoomCode = roomCode;
          isSpectator = false;
          playerSockets.set(playerId, ws);
          ws.send(
            JSON.stringify({
              type: "RECONNECTED",
              playerId,
              roomCode,
              reconnectKey: result.player.reconnectKey,
              gameState: publicState(result.room, playerId, "player"),
            }),
          );
          broadcastRoom(result.room, (pid, forSpectator) => ({
            type: "PLAYER_RECONNECTED",
            playerId,
            gameState: publicState(
              result.room,
              pid,
              forSpectator ? "spectator" : "player",
            ),
          }));
          break;
        }

        case "CREATE_ROOM": {
          playerId = generatePlayerId();
          playerSockets.set(playerId, ws);
          isSpectator = false;
          const buyIn = msg.buyIn || 1000;
          const room = createRoom(playerId, msg.playerName || "Player", buyIn);
          currentRoomCode = room.code;
          ws.send(
            JSON.stringify({
              type: "ROOM_CREATED",
              playerId,
              reconnectKey: room.players[0].reconnectKey,
              roomCode: room.code,
              gameState: publicState(room, playerId, "player"),
            }),
          );
          break;
        }

        case "JOIN_ROOM": {
          playerId = generatePlayerId();
          playerSockets.set(playerId, ws);
          isSpectator = false;
          const buyIn = msg.buyIn || 1000;
          const result = joinRoom(
            (msg.roomCode || "").toUpperCase(),
            playerId,
            msg.playerName || "Player",
            buyIn,
          );
          if (result.error) {
            ws.send(JSON.stringify({ type: "ERROR", error: result.error }));
            playerSockets.delete(playerId);
            playerId = null;
            return;
          }
          currentRoomCode = msg.roomCode.toUpperCase();
          const room = result.room;
          ws.send(
            JSON.stringify({
              type: "ROOM_JOINED",
              playerId,
              reconnectKey: room.players.find((p) => p.id === playerId)
                ?.reconnectKey,
              roomCode: currentRoomCode,
              gameState: publicState(room, playerId, "player"),
            }),
          );
          broadcastRoom(room, (pid, forSpectator) => ({
            type: "PLAYER_JOINED",
            gameState: publicState(
              room,
              pid,
              forSpectator ? "spectator" : "player",
            ),
          }));
          break;
        }

        case "SPECTATE_ROOM": {
          const roomCode = (msg.roomCode || "").toUpperCase();
          if (!roomCode) {
            ws.send(
              JSON.stringify({ type: "ERROR", error: "Room code required" }),
            );
            return;
          }
          const spectatorId = "s_" + generatePlayerId();
          playerSockets.set(spectatorId, ws);
          playerId = spectatorId;
          currentRoomCode = roomCode;
          isSpectator = true;

          const result = spectateRoom(
            roomCode,
            spectatorId,
            msg.playerName || "Spectator",
          );
          if (result.error) {
            ws.send(JSON.stringify({ type: "ERROR", error: result.error }));
            playerSockets.delete(spectatorId);
            playerId = null;
            currentRoomCode = null;
            isSpectator = false;
            return;
          }

          ws.send(
            JSON.stringify({
              type: "ROOM_SPECTATING",
              spectatorId,
              roomCode,
              gameState: publicState(result.room, spectatorId, "spectator"),
            }),
          );

          broadcastRoom(result.room, (pid, forSpectator) => ({
            type: "SPECTATOR_JOINED",
            gameState: publicState(
              result.room,
              pid,
              forSpectator ? "spectator" : "player",
            ),
          }));
          break;
        }

        case "START_GAME": {
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          if (room.hostId !== playerId) {
            ws.send(
              JSON.stringify({ type: "ERROR", error: "Only host can start" }),
            );
            return;
          }
          const result = startGame(room);
          if (result.error) {
            ws.send(JSON.stringify({ type: "ERROR", error: result.error }));
            return;
          }
          broadcastRoom(room, (pid, forSpectator) => ({
            type: "GAME_STARTED",
            gameState: publicState(
              room,
              pid,
              forSpectator ? "spectator" : "player",
            ),
          }));
          break;
        }

        case "PLAYER_ACTION": {
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          const result = handlePlayerAction(
            room,
            playerId,
            msg.action,
            msg.amount,
          );
          if (result.error) {
            ws.send(JSON.stringify({ type: "ERROR", error: result.error }));
            return;
          }
          broadcastRoom(room, (pid, forSpectator) => ({
            type: "GAME_UPDATE",
            gameState: publicState(
              room,
              pid,
              forSpectator ? "spectator" : "player",
            ),
            lastAction: { playerId, action: msg.action, amount: msg.amount },
          }));
          break;
        }

        case "SET_PLAYER_OPTIONS": {
          const room = rooms.get(currentRoomCode);
          if (!room || isSpectator) return;
          const player = room.players.find((p) => p.id === playerId);
          if (!player) return;

          if (typeof msg.autoInsurance === "boolean") {
            player.autoInsurance = msg.autoInsurance;
          }
          if (typeof msg.runItTwiceOptIn === "boolean") {
            player.runItTwiceOptIn = msg.runItTwiceOptIn;
          }

          broadcastRoom(room, (pid, forSpectator) => ({
            type: "GAME_UPDATE",
            gameState: publicState(
              room,
              pid,
              forSpectator ? "spectator" : "player",
            ),
          }));
          break;
        }

        case "UPDATE_ROOM_OPTIONS": {
          const room = rooms.get(currentRoomCode);
          if (!room || room.hostId !== playerId || isSpectator) return;

          if (typeof msg.runItTwiceEnabled === "boolean") {
            room.roomOptions.runItTwiceEnabled = msg.runItTwiceEnabled;
          }
          if (typeof msg.insuranceEnabled === "boolean") {
            room.roomOptions.insuranceEnabled = msg.insuranceEnabled;
          }

          broadcastRoom(room, (pid, forSpectator) => ({
            type: "GAME_UPDATE",
            gameState: publicState(
              room,
              pid,
              forSpectator ? "spectator" : "player",
            ),
          }));
          break;
        }

        case "NEW_HAND": {
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          if (room.hostId !== playerId) {
            ws.send(
              JSON.stringify({ type: "ERROR", error: "Only host can deal" }),
            );
            return;
          }
          if (room.gameState !== "showdown") {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                error: "Hand still in progress",
              }),
            );
            return;
          }
          startNewHand(room);
          broadcastRoom(room, (pid, forSpectator) => ({
            type: "GAME_UPDATE",
            gameState: publicState(
              room,
              pid,
              forSpectator ? "spectator" : "player",
            ),
          }));
          break;
        }

        case "LEAVE_ROOM": {
          if (!currentRoomCode) return;
          const result = isSpectator
            ? leaveSpectator(currentRoomCode, playerId)
            : leaveRoom(currentRoomCode, playerId);
          ws.send(
            JSON.stringify({
              type: "LEFT_ROOM",
              cashOutAmount: result?.cashOutAmount || 0,
            }),
          );
          if (result && result.room) {
            broadcastRoom(result.room, (pid, forSpectator) => ({
              type: "PLAYER_LEFT",
              leftPlayerId: playerId,
              gameState: publicState(
                result.room,
                pid,
                forSpectator ? "spectator" : "player",
              ),
            }));
          }
          currentRoomCode = null;
          break;
        }

        case "PING":
          ws.send(JSON.stringify({ type: "PONG" }));
          break;
      }
    } catch (err) {
      console.error("WS error:", err);
    }
  });

  ws.on("close", () => {
    if (playerId) {
      playerSockets.delete(playerId);
      if (!currentRoomCode) return;

      if (isSpectator) {
        const result = leaveSpectator(currentRoomCode, playerId);
        if (result?.room) {
          broadcastRoom(result.room, (pid, forSpectator) => ({
            type: "SPECTATOR_LEFT",
            leftPlayerId: playerId,
            gameState: publicState(
              result.room,
              pid,
              forSpectator ? "spectator" : "player",
            ),
          }));
        }
        return;
      }

      const room = rooms.get(currentRoomCode);
      const player = room?.players.find((p) => p.id === playerId);
      if (!room || !player) return;

      player.isConnected = false;
      player.folded = player.folded || room.gameState !== "waiting";

      const idx = room.players.findIndex((p) => p.id === playerId);
      if (idx === room.currentPlayerIndex && room.gameState !== "waiting") {
        handlePlayerAction(room, playerId, "fold", 0);
      }

      broadcastRoom(room, (pid, forSpectator) => ({
        type: "PLAYER_DISCONNECTED",
        leftPlayerId: playerId,
        reconnectWindowMs: RECONNECT_WINDOW_MS,
        gameState: publicState(
          room,
          pid,
          forSpectator ? "spectator" : "player",
        ),
      }));

      clearDisconnectTimer(playerId);
      const timer = setTimeout(() => {
        const result = leaveRoom(currentRoomCode, playerId);
        if (result?.room) {
          broadcastRoom(result.room, (pid, forSpectator) => ({
            type: "PLAYER_LEFT",
            leftPlayerId: playerId,
            gameState: publicState(
              result.room,
              pid,
              forSpectator ? "spectator" : "player",
            ),
          }));
        }
      }, RECONNECT_WINDOW_MS);
      disconnectTimers.set(playerId, timer);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Poker server (HTTP + WS) listening on port ${PORT}`);
});
