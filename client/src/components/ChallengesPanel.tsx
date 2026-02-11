import { useState, useEffect } from "react";
import { useEconomy } from "../hooks/useEconomy";
import { useAuth } from "../hooks/useAuth";

export default function ChallengesPanel() {
  const { user } = useAuth();
  const { challenges, generateDailyChallenges, claimChallengeReward } =
    useEconomy();
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      generateDailyChallenges().catch(() => {});
    }
  }, [user]);

  const activeChallenges = Array.isArray(challenges)
    ? challenges.filter((c: any) => c && c._id)
    : [];
  const claimable = activeChallenges.filter(
    (c: any) => c.completed && !c.claimed,
  ).length;

  const handleClaim = async (id: any) => {
    setClaiming(id);
    try {
      await claimChallengeReward(id);
    } catch (e) {
      console.error(e);
    }
    setClaiming(null);
  };

  if (!user) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "110px",
          right: "20px",
          background: "var(--bg-secondary, #1a1a3e)",
          border: `3px solid ${claimable > 0 ? "#00ff88" : "var(--retro-yellow, #ffd700)"}`,
          color: claimable > 0 ? "#00ff88" : "var(--retro-yellow, #ffd700)",
          padding: "14px 24px",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "0.72rem",
          cursor: "pointer",
          zIndex: 100,
          boxShadow:
            claimable > 0
              ? "0 0 12px rgba(0,255,136,0.5)"
              : "3px 3px 0px rgba(255,215,0,0.3)",
          animation: claimable > 0 ? "pulse 1.5s infinite" : "none",
        }}
      >
        📋 {claimable > 0 ? `${claimable}!` : "Tasks"}
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 15, 35, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-primary, #0f0f23)",
          border: "3px solid var(--retro-yellow, #ffd700)",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "480px",
          width: "90vw",
          maxHeight: "70vh",
          overflowY: "auto",
          fontFamily: "'Press Start 2P', cursive",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              color: "var(--retro-yellow, #ffd700)",
              fontSize: "1.05rem",
              margin: 0,
            }}
          >
            📋 Daily Challenges
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "#ff4444",
              fontFamily: "'Press Start 2P', cursive",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {activeChallenges.length === 0 && (
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.6rem",
              textAlign: "center",
            }}
          >
            No active challenges. Check back tomorrow!
          </p>
        )}

        {activeChallenges.map((ch: any) => {
          const pct =
            ch.target > 0
              ? Math.min(100, Math.round((ch.progress / ch.target) * 100))
              : 0;
          return (
            <div
              key={ch._id}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `2px solid ${ch.completed ? (ch.claimed ? "#555" : "#00ff88") : "rgba(255,255,255,0.15)"}`,
                borderRadius: "6px",
                padding: "12px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <span style={{ color: "#fff", fontSize: "0.58rem" }}>
                  {ch.title}
                </span>
                <span
                  style={{
                    color: ch.rewardType === "money" ? "#00ff88" : "#ffd700",
                    fontSize: "0.52rem",
                  }}
                >
                  {ch.rewardType === "money"
                    ? `$${ch.reward}`
                    : `${ch.reward} XP`}
                </span>
              </div>
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.48rem",
                  margin: "0 0 8px 0",
                }}
              >
                {ch.description}
              </p>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                  overflow: "hidden",
                  marginBottom: "6px",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: ch.completed
                      ? "#00ff88"
                      : "linear-gradient(90deg, #ffd700, #ff8c00)",
                    borderRadius: "4px",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.35rem",
                  }}
                >
                  {ch.progress}/{ch.target} ({pct}%)
                </span>
                {ch.completed && !ch.claimed && (
                  <button
                    onClick={() => handleClaim(ch._id)}
                    disabled={claiming === ch._id}
                    style={{
                      background: "#00ff88",
                      color: "#000",
                      border: "none",
                      padding: "4px 10px",
                      fontFamily: "'Press Start 2P', cursive",
                      fontSize: "0.35rem",
                      cursor: "pointer",
                      borderRadius: "3px",
                    }}
                  >
                    {claiming === ch._id ? "..." : "CLAIM"}
                  </button>
                )}
                {ch.claimed && (
                  <span style={{ color: "#555", fontSize: "0.35rem" }}>
                    ✓ Claimed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
