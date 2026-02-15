import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

type ShopItemKind = "cardback" | "theme";

type ShopItem = {
  id: string;
  kind: ShopItemKind;
  name: string;
  description: string;
  price: number;
  previewColors?: string[];
};

const SHOP_THEME_ITEMS: ShopItem[] = [
  {
    id: "blackwhite",
    kind: "theme",
    name: "B&W",
    description: "Minimal monochrome contrast.",
    price: 500,
    previewColors: [
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
    kind: "theme",
    name: "Dracula",
    description: "Dark purples with neon accents.",
    price: 1500,
    previewColors: [
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
    kind: "theme",
    name: "Monokai",
    description: "Editor-classic retro palette.",
    price: 2000,
    previewColors: [
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
    kind: "theme",
    name: "Nord",
    description: "Cool arctic blues and slate.",
    price: 2500,
    previewColors: [
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
    kind: "theme",
    name: "Solarized",
    description: "Balanced contrast with vintage hues.",
    price: 3000,
    previewColors: [
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
    kind: "theme",
    name: "Synthwave",
    description: "80s neon skyline energy.",
    price: 4000,
    previewColors: [
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
    kind: "theme",
    name: "Gruvbox",
    description: "Warm vintage terminal tones.",
    price: 4500,
    previewColors: [
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
    kind: "theme",
    name: "Catppuccin",
    description: "Soft mocha pastels in the dark.",
    price: 5000,
    previewColors: [
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
    kind: "theme",
    name: "Cyberpunk",
    description: "Electric pink + cyan future glow.",
    price: 6000,
    previewColors: [
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
    kind: "theme",
    name: "GameBoy",
    description: "Classic handheld green tint.",
    price: 6500,
    previewColors: [
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
    kind: "theme",
    name: "Retrowave",
    description: "Sunset neon with deep shadows.",
    price: 7000,
    previewColors: [
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
    kind: "theme",
    name: "Oceanic",
    description: "Calm sea blues and aqua highlights.",
    price: 7500,
    previewColors: [
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
    kind: "theme",
    name: "Volcano",
    description: "Molten reds and amber glow.",
    price: 8000,
    previewColors: [
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
    kind: "theme",
    name: "Forest",
    description: "Nature greens with soft light.",
    price: 8500,
    previewColors: [
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
    kind: "theme",
    name: "Midnight",
    description: "Deep navy gradient atmosphere.",
    price: 9000,
    previewColors: [
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
    kind: "theme",
    name: "Sakura",
    description: "Pink cherry blossom highlights.",
    price: 9500,
    previewColors: [
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
    kind: "theme",
    name: "Amber",
    description: "Golden warm retro arcade glow.",
    price: 10000,
    previewColors: [
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
    kind: "theme",
    name: "Arctic",
    description: "Cold blues with bright ice accents.",
    price: 11000,
    previewColors: [
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
    kind: "theme",
    name: "Neon Night",
    description: "High-contrast nightclub neons.",
    price: 12000,
    previewColors: [
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
    kind: "theme",
    name: "Desert",
    description: "Warm dunes and sandstone tones.",
    price: 13000,
    previewColors: [
      "#2c1a0e",
      "#d4a574",
      "#e8c39e",
      "#f5deb3",
      "#c19a6b",
      "#8b6914",
    ],
  },
];

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "cardback_neon_grid",
    kind: "cardback",
    name: "Neon Grid",
    description: "Classic arcade grid with neon trim.",
    price: 100,
  },
  {
    id: "cardback_cyber_circuit",
    kind: "cardback",
    name: "Cyber Circuit",
    description: "Circuit-board lines pulsing with retro energy.",
    price: 500,
  },
  {
    id: "cardback_arcade_sun",
    kind: "cardback",
    name: "Arcade Sun",
    description: "Synth sunrise stripes with a bold center badge.",
    price: 2500,
  },
  {
    id: "cardback_holo_diamond",
    kind: "cardback",
    name: "Holo Diamond",
    description: "Diamond facets with a holographic shimmer feel.",
    price: 10000,
  },
  {
    id: "cardback_royal_flush",
    kind: "cardback",
    name: "Royal Flush",
    description: "Regal pattern for high-rollers.",
    price: 25000,
  },
  {
    id: "cardback_glitch_wave",
    kind: "cardback",
    name: "Glitch Wave",
    description: "Scanline glitches and neon waves.",
    price: 50000,
  },
  {
    id: "cardback_void_vortex",
    kind: "cardback",
    name: "Void Vortex",
    description: "A swirling vortex that pulls the eye in.",
    price: 75000,
  },
  {
    id: "cardback_gold_vault",
    kind: "cardback",
    name: "Gold Vault",
    description: "A flashy vault-style back for big bankrolls.",
    price: 100000,
  },
  ...SHOP_THEME_ITEMS,
];

function findItem(itemId: string): ShopItem | null {
  return SHOP_ITEMS.find((i) => i.id === itemId) ?? null;
}

export const getCatalog = query({
  args: {},
  handler: async () => {
    return SHOP_ITEMS;
  },
});

export const purchaseItem = mutation({
  args: { userId: v.id("users"), itemId: v.string() },
  handler: async (ctx, { userId, itemId }) => {
    const item = findItem(itemId);
    if (!item) throw new Error("Item not found");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const owned = user.ownedItems ?? [];
    if (owned.includes(item.id)) {
      return { alreadyOwned: true, wallet: user.wallet };
    }

    if (user.wallet < item.price) throw new Error("Insufficient funds");

    const newWallet = Math.round((user.wallet - item.price) * 100) / 100;

    await ctx.db.patch(userId, {
      wallet: newWallet,
      ownedItems: [...owned, item.id],
    });

    await ctx.db.insert("transactions", {
      userId,
      type: "purchase",
      amount: item.price,
      balanceBefore: user.wallet,
      balanceAfter: newWallet,
      game: "Shop",
      description: `Purchased ${item.kind}: ${item.name}`,
      timestamp: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId,
      kind: "shop_purchase",
      message: `🛒 Purchased: ${item.name} (-$${item.price})`,
      createdAt: Date.now(),
      read: false,
    });

    return { success: true, wallet: newWallet, itemId: item.id };
  },
});

export const equipCardBack = mutation({
  args: { userId: v.id("users"), itemId: v.string() },
  handler: async (ctx, { userId, itemId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (itemId === "default") {
      await ctx.db.patch(userId, {
        equippedCardBack: undefined,
      });
      return { success: true, equippedCardBack: "default" };
    }

    if (itemId === "theme_default") {
      await ctx.db.patch(userId, {
        equippedTheme: undefined,
        settings: { ...user.settings, theme: "default" },
      });
      return { success: true, equippedTheme: "default" };
    }

    const item = findItem(itemId);
    if (!item) throw new Error("Item not found");

    const owned = user.ownedItems ?? [];
    if (!owned.includes(item.id)) {
      throw new Error("You don't own this item");
    }

    if (item.kind === "cardback") {
      await ctx.db.patch(userId, {
        equippedCardBack: item.id,
      });
      return { success: true, equippedCardBack: item.id };
    }

    await ctx.db.patch(userId, {
      equippedTheme: item.id,
      settings: { ...user.settings, theme: item.id },
    });

    return { success: true, equippedTheme: item.id };
  },
});
