import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

interface SettingsProps {
  onLogout?: () => void;
}

export default function Settings({ onLogout }: SettingsProps) {
  const { user, updateSettings } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [theme, setTheme] = useState("default");
  const [gameplaySettings, setGameplaySettings] = useState({
    cardSpeed: "normal",
    pushed: true,
    confirmNewGame: true,
    aceValue: "1",
  });
  const [visualSettings, setVisualSettings] = useState({
    scanlines: true,
    vignette: true,
    bgAnimation: true,
    highContrast: false,
    reduceMotion: false,
  });

  // Initialize settings from Convex user on mount/update
  useEffect(() => {
    if (!user?.settings) return;

    const newTheme = user.settings.theme || "default";
    setTheme(newTheme);
    applyTheme(newTheme);

    const newGameplay = {
      cardSpeed: user.settings.cardSpeed || "normal",
      pushed: user.settings.pushed !== false,
      confirmNewGame: user.settings.confirmNewGame !== false,
      aceValue: String(user.settings.aceValue ?? "1"),
    };
    setGameplaySettings(newGameplay);

    const newVisuals = {
      scanlines: user.settings.scanlines !== false,
      vignette: user.settings.vignette !== false,
      bgAnimation: user.settings.bgAnimation !== false,
      highContrast: user.settings.highContrast === true,
      reduceMotion: user.settings.reduceMotion === true,
    };
    setVisualSettings(newVisuals);

    toggleBodyClass("no-scanlines", !newVisuals.scanlines);
    toggleBodyClass("no-vignette", !newVisuals.vignette);
    toggleBodyClass("no-bg-animation", !newVisuals.bgAnimation);
    toggleBodyClass("high-contrast", newVisuals.highContrast);
    toggleBodyClass("reduce-motion", newVisuals.reduceMotion);
  }, [user?.settings]);

  // Keyboard shortcut (Ctrl+/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
      if (e.key === "Escape" && isVisible) {
        setIsVisible(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible]);

  const applyTheme = (themeName: string) => {
    // Remove existing theme classes
    const classes = document.body.className
      .split(" ")
      .filter((c) => !c.startsWith("theme-"));
    document.body.className = classes.join(" ");

    if (themeName !== "default") {
      document.body.classList.add(`theme-${themeName}`);
    }
  };

  const toggleBodyClass = (className: string, shouldAdd: boolean) => {
    if (shouldAdd) document.body.classList.add(className);
    else document.body.classList.remove(className);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    updateSettings({ theme: newTheme });
  };

  const handleVisualToggle = (key: keyof typeof visualSettings) => {
    const newValue = !visualSettings[key];
    const updated = { ...visualSettings, [key]: newValue };
    setVisualSettings(updated);
    updateSettings({ [key]: newValue });

    // Apply effects immediately
    if (key === "scanlines") toggleBodyClass("no-scanlines", !newValue);
    if (key === "vignette") toggleBodyClass("no-vignette", !newValue);
    if (key === "bgAnimation") toggleBodyClass("no-bg-animation", !newValue);
    if (key === "highContrast") toggleBodyClass("high-contrast", newValue);
    if (key === "reduceMotion") toggleBodyClass("reduce-motion", newValue);
  };

  const handleGameplayChange = (
    key: keyof typeof gameplaySettings,
    value: string | boolean,
  ) => {
    const updated = { ...gameplaySettings, [key]: value };
    setGameplaySettings(updated);
    updateSettings({
      [key]:
        typeof value === "string" && key === "aceValue" ? Number(value) : value,
    });
  };

  const handleReset = () => {
    if (confirm("Reset all settings to default?")) {
      const defaults = {
        theme: "default",
        cardSpeed: "normal",
        pushed: true,
        confirmNewGame: true,
        aceValue: 1,
        scanlines: true,
        vignette: true,
        bgAnimation: true,
        highContrast: false,
        reduceMotion: false,
      };
      setTheme("default");
      setGameplaySettings({
        cardSpeed: "normal",
        pushed: true,
        confirmNewGame: true,
        aceValue: "1",
      });
      setVisualSettings({
        scanlines: true,
        vignette: true,
        bgAnimation: true,
        highContrast: false,
        reduceMotion: false,
      });
      applyTheme("default");
      toggleBodyClass("no-scanlines", false);
      toggleBodyClass("no-vignette", false);
      toggleBodyClass("no-bg-animation", false);
      toggleBodyClass("high-contrast", false);
      toggleBodyClass("reduce-motion", false);
      updateSettings(defaults);
    }
  };

  const themes = [
    {
      id: "default",
      name: "Arcade",
      colors: [
        "#0f0f23",
        "#00fff7",
        "#ff00ff",
        "#ffff00",
        "#00ff00",
        "#ff3333",
      ],
    },
    {
      id: "blackwhite",
      name: "B&W",
      colors: [
        "#111111",
        "#333333",
        "#666666",
        "#999999",
        "#cccccc",
        "#ffffff",
      ],
    },
    {
      id: "dracula",
      name: "Dracula",
      colors: [
        "#282a36",
        "#bd93f9",
        "#ff79c6",
        "#50fa7b",
        "#8be9fd",
        "#f1fa8c",
      ],
    },
    {
      id: "monokai",
      name: "Monokai",
      colors: [
        "#272822",
        "#f92672",
        "#a6e22e",
        "#fd971f",
        "#66d9ef",
        "#ae81ff",
      ],
    },
    {
      id: "nord",
      name: "Nord",
      colors: [
        "#2e3440",
        "#88c0d0",
        "#81a1c1",
        "#b48ead",
        "#a3be8c",
        "#ebcb8b",
      ],
    },
    {
      id: "solarized",
      name: "Solarized",
      colors: [
        "#002b36",
        "#268bd2",
        "#2aa198",
        "#859900",
        "#d33682",
        "#cb4b16",
      ],
    },
    {
      id: "synthwave",
      name: "Synthwave",
      colors: [
        "#241b2f",
        "#ff7edb",
        "#36f9f6",
        "#fede5d",
        "#72f1b8",
        "#fe4450",
      ],
    },
    {
      id: "gruvbox",
      name: "Gruvbox",
      colors: [
        "#282828",
        "#fb4934",
        "#b8bb26",
        "#fabd2f",
        "#83a598",
        "#d3869b",
      ],
    },
    {
      id: "catppuccin",
      name: "Catppuccin",
      colors: [
        "#1e1e2e",
        "#cba6f7",
        "#f5c2e7",
        "#a6e3a1",
        "#89dceb",
        "#f9e2af",
      ],
    },
    {
      id: "cyberpunk",
      name: "Cyberpunk",
      colors: [
        "#0d0221",
        "#ff2a6d",
        "#05d9e8",
        "#d1f7ff",
        "#01ff70",
        "#9d4edd",
      ],
    },
    {
      id: "gameboy",
      name: "GameBoy",
      colors: [
        "#0f380f",
        "#306230",
        "#4a7c4a",
        "#8bac0f",
        "#9bbc0f",
        "#c4cf04",
      ],
    },
    {
      id: "retrowave",
      name: "Retrowave",
      colors: [
        "#1a0a2e",
        "#e040fb",
        "#00e5ff",
        "#ffea00",
        "#76ff03",
        "#ff1744",
      ],
    },
    {
      id: "oceanic",
      name: "Oceanic",
      colors: [
        "#1b2838",
        "#4fc3f7",
        "#0097a7",
        "#80cbc4",
        "#c5e1a5",
        "#ffcc80",
      ],
    },
    {
      id: "volcano",
      name: "Volcano",
      colors: [
        "#1a0000",
        "#ff3d00",
        "#ff6e40",
        "#ffab40",
        "#ffd740",
        "#fff176",
      ],
    },
    {
      id: "forest",
      name: "Forest",
      colors: [
        "#1b2d1b",
        "#2e7d32",
        "#66bb6a",
        "#a5d6a7",
        "#c8e6c9",
        "#fff9c4",
      ],
    },
    {
      id: "midnight",
      name: "Midnight",
      colors: [
        "#0a0a1a",
        "#1a237e",
        "#3949ab",
        "#7986cb",
        "#c5cae9",
        "#e8eaf6",
      ],
    },
    {
      id: "sakura",
      name: "Sakura",
      colors: [
        "#1a0a14",
        "#f48fb1",
        "#f06292",
        "#ec407a",
        "#ffcdd2",
        "#fce4ec",
      ],
    },
    {
      id: "amber",
      name: "Amber",
      colors: [
        "#1a1400",
        "#ff8f00",
        "#ffa000",
        "#ffb300",
        "#ffca28",
        "#fff8e1",
      ],
    },
    {
      id: "arctic",
      name: "Arctic",
      colors: [
        "#0d1b2a",
        "#90caf9",
        "#42a5f5",
        "#e1f5fe",
        "#b3e5fc",
        "#81d4fa",
      ],
    },
    {
      id: "neonnight",
      name: "Neon Night",
      colors: [
        "#0a0014",
        "#e040fb",
        "#7c4dff",
        "#18ffff",
        "#69f0ae",
        "#ffff00",
      ],
    },
    {
      id: "desert",
      name: "Desert",
      colors: [
        "#2c1a0e",
        "#d4a574",
        "#e8c39e",
        "#f5deb3",
        "#c19a6b",
        "#8b6914",
      ],
    },
  ];

  return (
    <>
      <button className="settings-hint" onClick={() => setIsVisible(true)}>
        Settings
      </button>

      {isVisible && (
        <div
          className="settings-overlay visible"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsVisible(false);
          }}
        >
          <div className="settings-modal">
            <div className="settings-header">
              <h2>SETTINGS</h2>
              <button
                className="settings-close"
                onClick={() => setIsVisible(false)}
              >
                ✕
              </button>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  background: "rgba(255, 0, 0, 0.1)",
                  border: "2px solid var(--retro-red)",
                  color: "var(--retro-red)",
                  padding: "12px 16px",
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.55rem",
                  cursor: "pointer",
                  transition: "0.15s",
                  margin: "0 auto 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  width: "auto",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--retro-red)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 0, 0, 0.1)";
                  e.currentTarget.style.color = "var(--retro-red)";
                }}
              >
                🚪 LOG OUT
              </button>
            )}

            <div className="settings-content">
              <div className="settings-section">
                <h3>THEME</h3>
                <div className="theme-grid">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      className={`theme-btn ${theme === t.id ? "active" : ""}`}
                      onClick={() => handleThemeChange(t.id)}
                      data-theme={t.id}
                    >
                      <span className="theme-preview">
                        {t.colors.map((color, i) => (
                          <span key={i} style={{ background: color }}></span>
                        ))}
                      </span>
                      <span className="theme-name">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <h3>GAMEPLAY</h3>
                <div className="settings-row">
                  <span className="settings-label">Card Animation Speed</span>
                  <select
                    className="settings-select"
                    value={gameplaySettings.cardSpeed}
                    onChange={(e) =>
                      handleGameplayChange("cardSpeed", e.target.value)
                    }
                  >
                    <option value="fast">Fast</option>
                    <option value="normal">Normal</option>
                    <option value="slow">Slow</option>
                  </select>
                </div>
                <div className="settings-row">
                  <span className="settings-label">
                    Pushed (Equal Values Accepted)
                  </span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={gameplaySettings.pushed}
                      onChange={(e) =>
                        handleGameplayChange("pushed", e.target.checked)
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Confirm New Game</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={gameplaySettings.confirmNewGame}
                      onChange={(e) =>
                        handleGameplayChange("confirmNewGame", e.target.checked)
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Ace Value</span>
                  <select
                    className="settings-select"
                    value={gameplaySettings.aceValue}
                    onChange={(e) =>
                      handleGameplayChange("aceValue", e.target.value)
                    }
                  >
                    <option value="1">Low (1)</option>
                    <option value="14">High (14)</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h3>DISPLAY</h3>
                <div className="settings-row">
                  <span className="settings-label">Scanlines Effect</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={visualSettings.scanlines}
                      onChange={() => handleVisualToggle("scanlines")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="settings-row">
                  <span className="settings-label">CRT Vignette</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={visualSettings.vignette}
                      onChange={() => handleVisualToggle("vignette")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Background Animation</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={visualSettings.bgAnimation}
                      onChange={() => handleVisualToggle("bgAnimation")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-section">
                <h3>ACCESSIBILITY</h3>
                <div className="settings-row">
                  <span className="settings-label">High Contrast Cards</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={visualSettings.highContrast}
                      onChange={() => handleVisualToggle("highContrast")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Reduce Motion</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={visualSettings.reduceMotion}
                      onChange={() => handleVisualToggle("reduceMotion")}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-section">
                <h3>DATA</h3>
                <div className="settings-row">
                  <span className="settings-label">Reset All Settings</span>
                  <button className="settings-btn danger" onClick={handleReset}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
