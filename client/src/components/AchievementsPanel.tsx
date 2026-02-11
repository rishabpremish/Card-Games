import { useState } from "react";
import { useAchievements } from "../hooks/useAchievements";
import { ACHIEVEMENTS, getRarityColor } from "../utils/achievements";

export default function AchievementsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { achievements, hasAchievement } = useAchievements();

  const unlockedCount = achievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const progress = Math.round((unlockedCount / totalCount) * 100);

  if (!isOpen) {
    return (
      <button
        className="achievements-toggle"
        onClick={() => setIsOpen(true)}
        style={{
          background: "var(--bg-secondary)",
          border: "3px solid var(--retro-yellow)",
          color: "var(--retro-yellow)",
          padding: "10px 20px",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "0.5rem",
          cursor: "pointer",
          boxShadow: "3px 3px 0px rgba(255, 215, 0, 0.3)",
          width: "100%",
          textAlign: "center",
        }}
      >
        🏆 {unlockedCount}/{totalCount}
      </button>
    );
  }

  return (
    <div
      className="achievements-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 15, 35, 0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
    >
      <div
        className="achievements-modal"
        style={{
          background: "var(--bg-secondary)",
          border: "4px solid var(--retro-cyan)",
          padding: "30px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "8px 8px 0px var(--retro-magenta)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontFamily: "'Press Start 2P', cursive",
              color: "var(--retro-cyan)",
              fontSize: "1.2rem",
            }}
          >
            🏆 Achievements
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "transparent",
              border: "2px solid var(--retro-red)",
              color: "var(--retro-red)",
              padding: "5px 10px",
              fontFamily: "'Press Start 2P', cursive",
              fontSize: "0.5rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              background: "var(--bg-primary)",
              border: "2px solid var(--retro-purple)",
              height: "20px",
              position: "relative",
            }}
          >
            <div
              style={{
                background: "var(--retro-green)",
                height: "100%",
                width: `${progress}%`,
                transition: "width 0.5s",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontFamily: "'Press Start 2P', cursive",
                fontSize: "0.6rem",
                color: "white",
                textShadow: "1px 1px 0 #000",
              }}
            >
              {progress}%
            </span>
          </div>
        </div>

        {/* Achievement List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = hasAchievement(achievement.id);
            const rarityColor = getRarityColor(achievement.rarity);

            return (
              <div
                key={achievement.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  padding: "15px",
                  background: unlocked
                    ? "rgba(0, 255, 0, 0.1)"
                    : "rgba(0, 0, 0, 0.3)",
                  border: `2px solid ${unlocked ? rarityColor : "#444"}`,
                  opacity: unlocked ? 1 : 0.6,
                }}
              >
                <span style={{ fontSize: "2rem" }}>{achievement.icon}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: "0.7rem",
                        color: unlocked ? rarityColor : "#666",
                      }}
                    >
                      {achievement.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: "0.4rem",
                        color: rarityColor,
                        textTransform: "uppercase",
                      }}
                    >
                      {achievement.rarity}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "'VT323', monospace",
                      fontSize: "1rem",
                      color: unlocked ? "#aaa" : "#666",
                      marginTop: "5px",
                    }}
                  >
                    {achievement.description}
                  </p>
                </div>
                {unlocked && <span style={{ fontSize: "1.5rem" }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
