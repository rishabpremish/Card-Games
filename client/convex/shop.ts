import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

type ShopItemKind = "cardback";

type ShopItem = {
  id: string;
  kind: ShopItemKind;
  name: string;
  description: string;
  price: number;
};

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

    if (itemId !== "default") {
      const item = findItem(itemId);
      if (!item || item.kind !== "cardback")
        throw new Error("Card back not found");
      const owned = user.ownedItems ?? [];
      if (!owned.includes(item.id))
        throw new Error("You don't own this card back");
    }

    await ctx.db.patch(userId, {
      equippedCardBack: itemId === "default" ? undefined : itemId,
    });

    return { success: true, equippedCardBack: itemId };
  },
});
