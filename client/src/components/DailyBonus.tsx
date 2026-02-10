import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../hooks/useAuth";
import { useConfetti } from "../hooks/useConfetti";
import { useSound } from "../hooks/useSound";

export default function DailyBonus() {
  const { user } = useAuth();
  const { triggerConfetti } = useConfetti();
  const { playSound } = useSound();
  const [showModal, setShowModal] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);

  const bonusStatus = useQuery(
    api.auth.checkDailyBonus,
    user ? { userId: user.userId } : "skip"
  );

  const claimBonus = useMutation(api.auth.claimDailyBonus);

  useEffect(() => {
    if (bonusStatus && !bonusStatus.available && !claimedToday) {
      // Already claimed today
    }
  }, [bonusStatus, claimedToday]);

  const handleClaim = async () => {
    if (!user || claimedToday) return;

    try {
      await claimBonus({ userId: user.userId });
      setClaimedToday(true);
      setShowModal(false);
      playSound("win");
      triggerConfetti({ intensity: "medium" });
    } catch (error) {
      console.error("Failed to claim bonus:", error);
    }
  };

  // Show modal on first load if bonus is available
  useEffect(() => {
    if (bonusStatus?.available && !claimedToday) {
      const hasShown = sessionStorage.getItem("dailyBonusShown");
      if (!hasShown) {
        setShowModal(true);
        sessionStorage.setItem("dailyBonusShown", "true");
      }
    }
  }, [bonusStatus, claimedToday]);

  if (!user || !bonusStatus) return null;

  const streak = bonusStatus.streak || 0;
  const canClaim = bonusStatus.available && !claimedToday;

  return (
    <>
      {/* Bonus Button */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          position: "fixed",
          bottom: "85px",
          left: "20px",
          background: canClaim ? "var(--retro-green)" : "var(--bg-secondary)",
          border: `3px solid ${canClaim ? "var(--retro-green)" : "var(--text-secondary)"}`,
          color: canClaim ? "var(--bg-primary)" : "var(--text-secondary)",
          padding: "10px 20px",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "0.5rem",
          cursor: "pointer",
          zIndex: 100,
          boxShadow: canClaim ? "3px 3px 0px rgba(0, 255, 0, 0.3)" : "none",
          animation: canClaim ? "pulse 2s infinite" : "none",
        }}
      >
        🎁 Daily Bonus {streak > 0 && `(Day ${streak})`}
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay visible"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: "400px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>🎁</div>
            <h2 style={{ fontFamily: "'Press Start 2P', cursive", color: "var(--retro-cyan)", marginBottom: "15px" }}>
              Daily Bonus
            </h2>

            {canClaim ? (
              <>
                <p style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem", marginBottom: "20px" }}>
                  Come back every day for bigger rewards!
                </p>

                {/* Streak Display */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    padding: "15px",
                    marginBottom: "20px",
                    border: "2px solid var(--retro-yellow)",
                  }}
                >
                  <div style={{ fontFamily: "'Press Start 2P', cursive", fontSize: "0.6rem", color: "var(--text-secondary)" }}>
                    Current Streak
                  </div>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P', cursive",
                      fontSize: "1.5rem",
                      color: streak >= 7 ? "var(--retro-orange)" : "var(--retro-yellow)",
                      marginTop: "10px",
                    }}
                  >
                    Day {streak + 1}
                  </div>
                  {streak >= 7 && (
                    <div style={{ fontFamily: "'VT323', monospace", color: "var(--retro-orange)", marginTop: "5px" }}>
                      🔥 Max streak bonus!
                    </div>
                  )}
                </div>

                {/* Reward Preview */}
                <div style={{ marginBottom: "20px" }}>
                  <span style={{ fontFamily: "'VT323', monospace", fontSize: "1rem" }}>Today's Reward: </span>
                  <span
                    style={{
                      fontFamily: "'Press Start 2P', cursive",
                      fontSize: "1rem",
                      color: "var(--retro-green)",
                    }}
                  >
                    ${10 + Math.min(streak * 2, 14)}
                  </span>
                </div>

                <button
                  onClick={handleClaim}
                  style={{
                    background: "var(--retro-green)",
                    border: "3px solid var(--retro-green)",
                    color: "var(--bg-primary)",
                    padding: "15px 30px",
                    fontFamily: "'Press Start 2P', cursive",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    boxShadow: "4px 4px 0px rgba(0, 255, 0, 0.3)",
                  }}
                >
                  Claim Bonus
                </button>
              </>
            ) : (
              <>
                <p style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem", marginBottom: "20px" }}>
                  You've already claimed today's bonus!
                </p>
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    padding: "15px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ fontFamily: "'Press Start 2P', cursive", fontSize: "0.6rem", color: "var(--text-secondary)" }}>
                    Current Streak
                  </div>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P', cursive",
                      fontSize: "1.5rem",
                      color: "var(--retro-yellow)",
                      marginTop: "10px",
                    }}
                  >
                    Day {streak}
                  </div>
                </div>
                <p style={{ fontFamily: "'VT323', monospace", fontSize: "1rem", color: "var(--text-secondary)" }}>
                  Come back tomorrow for more!
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
