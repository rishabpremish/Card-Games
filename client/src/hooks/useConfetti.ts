import { useCallback } from "react";

export function useConfetti() {
  const triggerConfetti = useCallback(
    (_options?: {
      intensity?: "low" | "medium" | "high";
      origin?: { x: number; y: number };
    }) => {
      void _options;
      // Confetti celebrations are disabled across the platform.
      return;
    },
    [],
  );

  return { triggerConfetti };
}
