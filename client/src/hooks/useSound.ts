import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "./useAuth";

// Sound effect URLs - using simple beep/tone generation via AudioContext
// For a production app, you'd want actual sound files

export type SoundType = 
  | "deal" 
  | "win" 
  | "lose" 
  | "cashout" 
  | "chip" 
  | "button";

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  deal: { frequency: 400, duration: 0.1, type: "sine", volume: 0.3 },
  win: { frequency: 800, duration: 0.3, type: "square", volume: 0.4 },
  lose: { frequency: 200, duration: 0.4, type: "sawtooth", volume: 0.3 },
  cashout: { frequency: 600, duration: 0.5, type: "triangle", volume: 0.5 },
  chip: { frequency: 300, duration: 0.05, type: "sine", volume: 0.2 },
  button: { frequency: 500, duration: 0.08, type: "sine", volume: 0.2 },
};

export function useSound() {
  const { user } = useAuth();
  const audioContextRef = useRef<AudioContext | null>(null);

  const isEnabled = user?.settings?.soundEnabled !== false;

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSound = useCallback((soundType: SoundType) => {
    if (!isEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const config = SOUND_CONFIGS[soundType];

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

      // Add some variation for win sound
      if (soundType === "win") {
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 1.5, ctx.currentTime + config.duration * 0.5);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.5, ctx.currentTime + config.duration);
      }

      gainNode.gain.setValueAtTime(config.volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration);
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  }, [isEnabled]);

  return { playSound, isEnabled };
}
