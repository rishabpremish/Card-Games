import { useEffect } from "react";
import { usePoker } from "./usePoker";
import { useWallet } from "../hooks/useWallet";
import PokerLobby from "./PokerLobby";
import PokerGame from "./PokerGame";
import "./poker.css";

export default function PokerPage() {
  const poker = usePoker();
  const { placeBet, addWinnings } = useWallet();

  // When user creates/joins a room, deduct buy-in from wallet
  const handleCreate = async (name: string, buyIn: number) => {
    try {
      await placeBet(buyIn, "Poker");
      poker.createRoom(name, buyIn);
    } catch (e) {
      console.error("Failed to buy in:", e);
    }
  };

  const handleJoin = async (code: string, name: string, buyIn: number) => {
    try {
      await placeBet(buyIn, "Poker");
      poker.joinRoom(code, name, buyIn);
    } catch (e) {
      console.error("Failed to buy in:", e);
    }
  };

  // When user leaves room, return remaining chips to wallet
  const handleLeave = async () => {
    const me = poker.gameState?.players.find((p) => p.id === poker.playerId);
    const chips = me?.chips ?? 0;
    poker.leaveRoom();
    if (chips > 0) {
      try {
        await addWinnings(chips, "Poker", "Cash out from poker");
      } catch (e) {
        console.error("Failed to cash out:", e);
      }
    }
  };

  // Also cash out if the user navigates away or closes the tab
  useEffect(() => {
    const handleUnload = () => {
      if (poker.screen !== "lobby") {
        poker.leaveRoom();
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [poker.screen]);

  // Lobby / Room screen
  if (poker.screen === "lobby" || poker.screen === "room") {
    return (
      <PokerLobby
        onCreateRoom={handleCreate}
        onJoinRoom={handleJoin}
        onStartGame={poker.startGame}
        onLeaveRoom={handleLeave}
        screen={poker.screen}
        roomCode={poker.roomCode}
        playerId={poker.playerId}
        gameState={poker.gameState}
        error={poker.error}
        isConnected={poker.isConnected}
      />
    );
  }

  // Game screen
  if (poker.screen === "game" && poker.gameState && poker.playerId) {
    return (
      <PokerGame
        gameState={poker.gameState}
        playerId={poker.playerId}
        onAction={poker.doAction}
        onNewHand={poker.newHand}
        onLeave={handleLeave}
      />
    );
  }

  return null;
}
