import { useCallback } from "react";

export function useConfetti() {
  const triggerConfetti = useCallback(
    (_options?: {
      intensity?: "low" | "medium" | "high";
      origin?: { x: number; y: number };
    }) => {
      // Confetti celebrations are disabled across the platform.
      return;
    },
    [],
  );

  return { triggerConfetti };
}
