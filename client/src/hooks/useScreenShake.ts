import { useCallback, useState } from "react";
import { useAuth } from "./useAuth";

export function useScreenShake() {
  const { user } = useAuth();
  const reduceMotion = user?.settings?.reduceMotion === true;
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = useCallback((intensity: "light" | "medium" | "heavy" = "medium") => {
    if (reduceMotion) return;

    const duration = intensity === "heavy" ? 400 : intensity === "medium" ? 300 : 200;
    
    setIsShaking(true);
    
    const gameContainer = document.querySelector(".game-container");
    if (gameContainer) {
      gameContainer.classList.add("shake-screen");
      
      setTimeout(() => {
        gameContainer.classList.remove("shake-screen");
        setIsShaking(false);
      }, duration);
    }
  }, [reduceMotion]);

  return { triggerShake, isShaking };
}
