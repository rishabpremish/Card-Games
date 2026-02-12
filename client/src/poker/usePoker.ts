import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────

export interface PokerCard {
  suit: string;
  value: string;
}

export interface PokerPlayer {
  id: string;
  name: string;
  chips: number;
  bet: number;
  totalBet: number;
  folded: boolean;
  isAllIn: boolean;
  isConnected: boolean;
  autoInsurance?: boolean;
  runItTwiceOptIn?: boolean;
  seatIndex: number;
  cards: (PokerCard | null)[];
  isCurrentPlayer: boolean;
}

export interface ActionLogEntry {
  type: string;
  player?: string;
  amount?: number;
  hand?: string;
  street?: string;
}

export interface Winner {
  playerId: string;
  name: string;
  amount: number;
  hand: { rank: number; name: string; highCards: number[] } | null;
}

export interface PokerGameState {
  roomCode: string;
  hostId: string;
  gameState: "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";
  communityCards: PokerCard[];
  pot: number;
  currentBet: number;
  minRaise: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  winners: Winner[] | null;
  handNumber: number;
  isSpectator?: boolean;
  spectatorCount?: number;
  turnDeadline?: number | null;
  turnTimeoutMs?: number;
  roomOptions?: {
    runItTwiceEnabled: boolean;
    insuranceEnabled: boolean;
  };
  actionLog: ActionLogEntry[];
  smallBlind: number;
  bigBlind: number;
  players: PokerPlayer[];
}

type Screen = "lobby" | "room" | "game";

interface UsePokerReturn {
  screen: Screen;
  playerId: string | null;
  roomCode: string | null;
  gameState: PokerGameState | null;
  error: string | null;
  isConnected: boolean;
  createRoom: (playerName: string, buyIn: number) => void;
  joinRoom: (roomCode: string, playerName: string, buyIn: number) => void;
  spectateRoom: (roomCode: string, playerName?: string) => void;
  startGame: () => void;
  doAction: (action: string, amount?: number) => void;
  setPlayerOptions: (opts: {
    autoInsurance?: boolean;
    runItTwiceOptIn?: boolean;
  }) => void;
  updateRoomOptions: (opts: {
    runItTwiceEnabled?: boolean;
    insuranceEnabled?: boolean;
  }) => void;
  newHand: () => void;
  leaveRoom: () => void;
  clearError: () => void;
  lastCashOut: number;
  isSpectator: boolean;
  reconnectKey: string | null;
}

// ─── Hook ────────────────────────────────────────────────

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? `ws://${window.location.hostname}:3001`
    : `wss://card-games-web.onrender.com`);

export function usePoker(): UsePokerReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | undefined>(undefined);
  const pingTimer = useRef<number | undefined>(undefined);

  const [screen, setScreen] = useState<Screen>("lobby");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameState, setGameState] = useState<PokerGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastCashOut, setLastCashOut] = useState(0);
  const [isSpectator, setIsSpectator] = useState(false);
  const [reconnectKey, setReconnectKey] = useState<string | null>(null);

  // Pending action to send once connected
  const pendingRef = useRef<object | null>(null);
  const reconnectRef = useRef<{
    roomCode: string;
    reconnectKey: string;
  } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("poker_reconnect");
    if (!raw) return;
    try {
      reconnectRef.current = JSON.parse(raw);
    } catch {
      reconnectRef.current = null;
    }
  }, []);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingRef.current = msg;
    }
  }, []);

  // ── Connect ──
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        if (reconnectRef.current) {
          ws.send(
            JSON.stringify({
              type: "RECONNECT",
              roomCode: reconnectRef.current.roomCode,
              reconnectKey: reconnectRef.current.reconnectKey,
            }),
          );
        }
        if (pendingRef.current) {
          ws.send(JSON.stringify(pendingRef.current));
          pendingRef.current = null;
        }
        // Keep-alive
        pingTimer.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: "PING" }));
        }, 25000);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          switch (msg.type) {
            case "ROOM_CREATED":
              setPlayerId(msg.playerId);
              setRoomCode(msg.roomCode);
              setGameState(msg.gameState);
              setIsSpectator(false);
              setReconnectKey(msg.reconnectKey ?? null);
              if (msg.reconnectKey) {
                const payload = {
                  roomCode: msg.roomCode,
                  reconnectKey: msg.reconnectKey,
                };
                reconnectRef.current = payload;
                localStorage.setItem(
                  "poker_reconnect",
                  JSON.stringify(payload),
                );
              }
              setScreen("room");
              break;
            case "ROOM_JOINED":
              setPlayerId(msg.playerId);
              setRoomCode(msg.roomCode);
              setGameState(msg.gameState);
              setIsSpectator(false);
              setReconnectKey(msg.reconnectKey ?? null);
              if (msg.reconnectKey) {
                const payload = {
                  roomCode: msg.roomCode,
                  reconnectKey: msg.reconnectKey,
                };
                reconnectRef.current = payload;
                localStorage.setItem(
                  "poker_reconnect",
                  JSON.stringify(payload),
                );
              }
              setScreen("room");
              break;
            case "ROOM_SPECTATING":
              setPlayerId(msg.spectatorId);
              setRoomCode(msg.roomCode);
              setGameState(msg.gameState);
              setIsSpectator(true);
              setScreen("game");
              break;
            case "RECONNECTED":
              setPlayerId(msg.playerId);
              setRoomCode(msg.roomCode);
              setGameState(msg.gameState);
              setIsSpectator(false);
              setReconnectKey(
                msg.reconnectKey ?? reconnectRef.current?.reconnectKey ?? null,
              );
              setScreen(
                msg.gameState?.gameState === "waiting" ? "room" : "game",
              );
              break;
            case "PLAYER_JOINED":
            case "PLAYER_LEFT":
            case "PLAYER_DISCONNECTED":
            case "PLAYER_RECONNECTED":
            case "SPECTATOR_JOINED":
            case "SPECTATOR_LEFT":
              setGameState(msg.gameState);
              break;
            case "GAME_STARTED":
              setGameState(msg.gameState);
              setScreen("game");
              break;
            case "GAME_UPDATE":
              setGameState(msg.gameState);
              if (msg.gameState.gameState !== "waiting") setScreen("game");
              break;
            case "LEFT_ROOM":
              setLastCashOut(msg.cashOutAmount || 0);
              setScreen("lobby");
              setRoomCode(null);
              setGameState(null);
              setPlayerId(null);
              setReconnectKey(null);
              setIsSpectator(false);
              reconnectRef.current = null;
              localStorage.removeItem("poker_reconnect");
              break;
            case "ERROR":
              setError(msg.error);
              setTimeout(() => setError(null), 4000);
              break;
            case "PONG":
              break;
          }
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        window.clearInterval(pingTimer.current);
        // Auto-reconnect if in a room
        if (roomCode && !isSpectator) {
          reconnectTimer.current = window.setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => ws.close();
    } catch {
      setIsConnected(false);
    }
  }, [roomCode, isSpectator]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      window.clearTimeout(reconnectTimer.current);
      window.clearInterval(pingTimer.current);
      wsRef.current?.close();
    };
  }, []);

  // ── Public API ──
  const createRoom = useCallback(
    (playerName: string, buyIn: number) => {
      connect();
      send({ type: "CREATE_ROOM", playerName, buyIn });
    },
    [connect, send],
  );

  const joinRoom = useCallback(
    (code: string, playerName: string, buyIn: number) => {
      connect();
      send({ type: "JOIN_ROOM", roomCode: code, playerName, buyIn });
    },
    [connect, send],
  );

  const startGame = useCallback(() => send({ type: "START_GAME" }), [send]);

  const spectateRoom = useCallback(
    (code: string, playerName = "Spectator") => {
      connect();
      send({ type: "SPECTATE_ROOM", roomCode: code, playerName });
    },
    [connect, send],
  );

  const doAction = useCallback(
    (action: string, amount?: number) => {
      send({ type: "PLAYER_ACTION", action, amount });
    },
    [send],
  );

  const setPlayerOptions = useCallback(
    (opts: { autoInsurance?: boolean; runItTwiceOptIn?: boolean }) => {
      send({ type: "SET_PLAYER_OPTIONS", ...opts });
    },
    [send],
  );

  const updateRoomOptions = useCallback(
    (opts: { runItTwiceEnabled?: boolean; insuranceEnabled?: boolean }) => {
      send({ type: "UPDATE_ROOM_OPTIONS", ...opts });
    },
    [send],
  );

  const newHand = useCallback(() => send({ type: "NEW_HAND" }), [send]);

  const leaveRoom = useCallback(() => send({ type: "LEAVE_ROOM" }), [send]);

  const clearError = useCallback(() => setError(null), []);

  return {
    screen,
    playerId,
    roomCode,
    gameState,
    error,
    isConnected,
    createRoom,
    joinRoom,
    spectateRoom,
    startGame,
    doAction,
    setPlayerOptions,
    updateRoomOptions,
    newHand,
    leaveRoom,
    clearError,
    lastCashOut,
    isSpectator,
    reconnectKey,
  };
}
