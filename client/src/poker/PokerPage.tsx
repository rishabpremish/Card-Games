import { useEffect, useRef } from "react";
import { usePoker } from "./usePoker";
import { useWallet } from "../hooks/useWallet";
import PokerLobby from "./PokerLobby";
import PokerGame from "./PokerGame";
import "./poker.css";

export default function PokerPage() {
  const poker = usePoker();
  const { placeBet, addWinnings, recordMatchRound } = useWallet();
  const lastRecordedHandRef = useRef<number>(0);

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
    if (poker.isSpectator) {
      poker.leaveRoom();
      return;
    }
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

  useEffect(() => {
    const state = poker.gameState;
    if (!state || state.gameState !== "showdown") return;
    if (!poker.playerId || poker.isSpectator) return;
    if (lastRecordedHandRef.current === state.handNumber) return;

    const me = state.players.find((p) => p.id === poker.playerId);
    if (!me) return;

    const wonEntry = state.winners?.find((w) => w.playerId === poker.playerId);
    const payout = wonEntry?.amount ?? 0;
    const bet = me.totalBet ?? 0;
    lastRecordedHandRef.current = state.handNumber;

    recordMatchRound("Poker", bet, payout, {
      roomCode: state.roomCode,
      handNumber: state.handNumber,
      notes: wonEntry ? "Showdown" : "Fold/Eliminated",
    }).catch(() => {});
  }, [poker.gameState, poker.playerId, poker.isSpectator, recordMatchRound]);

  // Lobby / Room screen
  if (poker.screen === "lobby" || poker.screen === "room") {
    return (
      <PokerLobby
        onCreateRoom={handleCreate}
        onJoinRoom={handleJoin}
        onSpectateRoom={poker.spectateRoom}
        onStartGame={poker.startGame}
        onUpdateRoomOptions={poker.updateRoomOptions}
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
        onSetOptions={poker.setPlayerOptions}
        onNewHand={poker.newHand}
        onLeave={handleLeave}
      />
    );
  }

  return null;
}
