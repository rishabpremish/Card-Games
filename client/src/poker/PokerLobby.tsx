import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import type { PokerGameState } from "./usePoker";

interface Props {
  onCreateRoom: (name: string, buyIn: number) => void;
  onJoinRoom: (code: string, name: string, buyIn: number) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  screen: "lobby" | "room" | "game";
  roomCode: string | null;
  playerId: string | null;
  gameState: PokerGameState | null;
  error: string | null;
  isConnected: boolean;
}

export default function PokerLobby({
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
  screen,
  roomCode,
  playerId,
  gameState,
  error,
  isConnected,
}: Props) {
  const navigate = useNavigate();
  const { wallet, username } = useWallet();

  const [joinCode, setJoinCode] = useState("");
  const [buyIn, setBuyIn] = useState(100);

  const playerName = username || "Player";
  const isHost = gameState?.hostId === playerId;

  if (screen === "room" && gameState) {
    return (
      <div className="game-container poker-lobby">
        <button
          className="home-btn"
          onClick={() => {
            onLeaveRoom();
            navigate("/");
          }}
        >
          🏠 HOME
        </button>
        <div className="bg-decoration" />

        <header className="game-header" style={{ marginTop: "20px" }}>
          <h1>POKER ROOM</h1>
          <p
            className="subtitle"
            style={{ fontSize: "1.2rem", letterSpacing: "4px" }}
          >
            {roomCode}
          </p>
        </header>

        {error && <div className="poker-error">{error}</div>}

        <div
          className="lobby-card"
          style={{ maxWidth: 500, margin: "20px auto" }}
        >
          <div className="lobby-section">
            <h3
              style={{
                color: "var(--retro-cyan)",
                fontFamily: "'Press Start 2P'",
                fontSize: "0.7rem",
                marginBottom: 15,
              }}
            >
              Players ({gameState.players.length}/8)
            </h3>
            <div className="player-list">
              {gameState.players.map((p) => (
                <div key={p.id} className="player-row">
                  <span className="player-name-tag">
                    {p.name}
                    {p.id === gameState.hostId && (
                      <span className="host-badge">HOST</span>
                    )}
                    {p.id === playerId && (
                      <span className="you-badge">YOU</span>
                    )}
                  </span>
                  <span className="player-chips-tag">${p.chips}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <p
              style={{
                color: "var(--text-secondary)",
                fontFamily: "'Press Start 2P'",
                fontSize: "0.5rem",
                marginBottom: 10,
              }}
            >
              Share code:{" "}
              <span
                style={{ color: "var(--retro-yellow)", fontSize: "0.8rem" }}
              >
                {roomCode}
              </span>
            </p>
          </div>

          <div className="lobby-buttons">
            {isHost && (
              <button
                className="action-btn btn-hit"
                onClick={onStartGame}
                disabled={gameState.players.length < 2}
                style={{ fontSize: "0.8rem", padding: "15px 30px" }}
              >
                START GAME
              </button>
            )}
            {!isHost && (
              <p
                style={{
                  color: "var(--retro-yellow)",
                  fontFamily: "'Press Start 2P'",
                  fontSize: "0.55rem",
                }}
              >
                Waiting for host to start...
              </p>
            )}
            <button
              className="action-btn btn-stand"
              onClick={() => {
                onLeaveRoom();
              }}
              style={{ fontSize: "0.6rem" }}
            >
              LEAVE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lobby screen
  return (
    <div className="game-container poker-lobby">
      <button className="home-btn" onClick={() => navigate("/")}>
        🏠 HOME
      </button>
      <div className="bg-decoration" />

      <header className="game-header" style={{ marginTop: "40px" }}>
        <h1>POKER</h1>
        <p className="subtitle">Texas Hold'em</p>
      </header>

      {error && <div className="poker-error">{error}</div>}

      <div className="game-stats" style={{ marginBottom: 10 }}>
        <div className="stat-item wallet-stat">
          <span className="stat-label">Wallet</span>
          <span className="stat-value">${wallet ?? 0}</span>
        </div>
      </div>

      {!isConnected && (
        <div className="poker-error">Connecting to server...</div>
      )}

      <div
        className="lobby-card"
        style={{ maxWidth: 440, margin: "10px auto" }}
      >
        {/* Buy-in selector */}
        <div className="lobby-section">
          <label className="lobby-label">Buy-In Amount</label>
          <div className="buyin-chips">
            {[50, 100, 200, 500].map((v) => (
              <div
                key={v}
                className={`chip-select ${buyIn === v ? "selected" : ""} ${(wallet ?? 0) < v ? "disabled" : ""}`}
                onClick={() => (wallet ?? 0) >= v && setBuyIn(v)}
              >
                ${v}
              </div>
            ))}
          </div>
        </div>

        {/* Create Room */}
        <div className="lobby-section">
          <button
            className="action-btn btn-hit"
            style={{ width: "100%", fontSize: "0.7rem", padding: "14px" }}
            onClick={() => onCreateRoom(playerName, buyIn)}
            disabled={!isConnected || (wallet ?? 0) < buyIn}
          >
            CREATE ROOM
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            fontFamily: "'Press Start 2P'",
            fontSize: "0.5rem",
            margin: "10px 0",
          }}
        >
          — OR —
        </div>

        {/* Join Room */}
        <div className="lobby-section">
          <label className="lobby-label">Room Code</label>
          <input
            className="lobby-input"
            type="text"
            maxLength={4}
            placeholder="ABCD"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <button
            className="action-btn btn-double"
            style={{
              width: "100%",
              fontSize: "0.7rem",
              padding: "14px",
              marginTop: 10,
            }}
            onClick={() => onJoinRoom(joinCode, playerName, buyIn)}
            disabled={
              !isConnected || joinCode.length < 4 || (wallet ?? 0) < buyIn
            }
          >
            JOIN ROOM
          </button>
        </div>
      </div>
    </div>
  );
}
