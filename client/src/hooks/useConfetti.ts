import { useCallback } from "react";
import confetti from "canvas-confetti";
import { useAuth } from "./useAuth";

export function useConfetti() {
  const { user } = useAuth();
  const reduceMotion = user?.settings?.reduceMotion === true;

  const triggerConfetti = useCallback((options?: { 
    intensity?: "low" | "medium" | "high";
    origin?: { x: number; y: number };
  }) => {
    if (reduceMotion) return;

    const intensity = options?.intensity || "medium";
    const origin = options?.origin || { x: 0.5, y: 0.5 };

    const particleCount = intensity === "high" ? 150 : intensity === "medium" ? 100 : 50;
    const spread = intensity === "high" ? 100 : intensity === "medium" ? 70 : 50;

    confetti({
      particleCount,
      spread,
      origin,
      colors: ["#00fff7", "#ff00ff", "#ffff00", "#00ff00", "#ff3333"],
      disableForReducedMotion: true,
    });

    if (intensity === "high") {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x: origin.x - 0.2, y: origin.y },
          colors: ["#00fff7", "#ff00ff", "#ffff00"],
          disableForReducedMotion: true,
        });
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x: origin.x + 0.2, y: origin.y },
          colors: ["#00ff00", "#ff3333", "#ffff00"],
          disableForReducedMotion: true,
        });
      }, 250);
    }
  }, [reduceMotion]);

  return { triggerConfetti };
}
