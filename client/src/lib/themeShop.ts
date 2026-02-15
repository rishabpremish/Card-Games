export const SHOP_THEME_IDS = [
  "blackwhite",
  "dracula",
  "monokai",
  "nord",
  "solarized",
  "synthwave",
  "gruvbox",
  "catppuccin",
  "cyberpunk",
  "gameboy",
  "retrowave",
  "oceanic",
  "volcano",
  "forest",
  "midnight",
  "sakura",
  "amber",
  "arctic",
  "neonnight",
  "desert",
] as const;

const SHOP_THEME_SET = new Set<string>(SHOP_THEME_IDS);

export function applyThemeToDocument(themeName: string | undefined): void {
  const body = document.body;
  const classes = body.className
    .split(" ")
    .filter((c) => !c.startsWith("theme-"));
  body.className = classes.join(" ");

  if (!themeName || themeName === "default") {
    return;
  }

  if (SHOP_THEME_SET.has(themeName)) {
    body.classList.add(`theme-${themeName}`);
  }
}
