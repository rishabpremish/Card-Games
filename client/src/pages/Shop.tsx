import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEconomy } from "../hooks/useEconomy";
import { useWallet } from "../hooks/useWallet";

const CAT_LABELS: Record<string, string> = { theme: "🎨 Themes", cardback: "🃏 Card Backs", emoji: "😎 Emojis" };
const CATEGORIES = ["theme", "cardback", "emoji"];

export default function Shop() {
  const navigate = useNavigate();
  const { wallet: balance } = useWallet();
  const { shopItems, ownedItems, buyShopItem, equipItem, playerStats } = useEconomy();
  const [selectedCat, setSelectedCat] = useState("theme");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handleBuy = async (itemId: string) => {
    setBusy(itemId);
    setMsg(null);
    try {
      await buyShopItem(itemId);
      setMsg("Purchased!");
    } catch (e: any) {
      setMsg(e.message || "Failed");
    }
    setBusy(null);
  };

  const handleEquip = async (itemId: string) => {
    setBusy(itemId);
    setMsg(null);
    try {
      await equipItem(itemId);
      setMsg("Equipped!");
    } catch (e: any) {
      setMsg(e.message || "Failed");
    }
    setBusy(null);
  };

  const isEquipped = (item: any) => {
    if (!playerStats) return false;
    if (item.category === "theme") return playerStats.equippedTheme === item.id;
    if (item.category === "cardback") return playerStats.equippedCardBack === item.id;
    if (item.category === "emoji") return playerStats.equippedEmoji === item.id;
    return false;
  };

  return (
    <>
      <style>{`
        .shop-page {
          min-height: 100vh;
          background: var(--bg-primary, #0f0f23);
          padding: 40px 20px 20px;
          font-family: 'Press Start 2P', cursive;
          color: #fff;
        }
        .shop-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .shop-header h1 {
          color: var(--retro-yellow, #ffd700);
          font-size: 1rem;
          margin: 0 0 8px 0;
        }
        .shop-balance {
          color: #00ff88;
          font-size: 0.55rem;
        }
        .shop-back {
          position: absolute;
          top: 40px;
          left: 20px;
          background: none;
          border: 2px solid var(--retro-yellow, #ffd700);
          color: var(--retro-yellow, #ffd700);
          padding: 6px 14px;
          font-family: 'Press Start 2P', cursive;
          font-size: 0.4rem;
          cursor: pointer;
        }
        .shop-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .shop-tab {
          background: rgba(255,255,255,0.05);
          border: 2px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.6);
          padding: 8px 16px;
          font-family: 'Press Start 2P', cursive;
          font-size: 0.4rem;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .shop-tab.active {
          border-color: var(--retro-yellow, #ffd700);
          color: var(--retro-yellow, #ffd700);
          background: rgba(255,215,0,0.1);
        }
        .shop-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
          max-width: 900px;
          margin: 0 auto;
        }
        .shop-card {
          background: rgba(255,255,255,0.05);
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          transition: border-color 0.2s;
        }
        .shop-card:hover { border-color: var(--retro-yellow, #ffd700); }
        .shop-card h3 { font-size: 0.45rem; color: #fff; margin: 0 0 6px 0; }
        .shop-card p { font-size: 0.35rem; color: rgba(255,255,255,0.5); margin: 0 0 10px 0; }
        .shop-price { color: #00ff88; font-size: 0.45rem; margin-bottom: 10px; }
        .shop-btn {
          padding: 6px 14px;
          font-family: 'Press Start 2P', cursive;
          font-size: 0.35rem;
          cursor: pointer;
          border-radius: 4px;
          border: none;
          transition: opacity 0.2s;
        }
        .shop-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .shop-btn-buy { background: #00ff88; color: #000; }
        .shop-btn-equip { background: var(--retro-yellow, #ffd700); color: #000; }
        .shop-btn-equipped { background: rgba(255,255,255,0.2); color: #fff; cursor: default; }
        .shop-msg {
          text-align: center;
          font-size: 0.4rem;
          margin-top: 12px;
          color: #00ff88;
        }
      `}</style>
      <div className="shop-page">
        <button className="shop-back" onClick={() => navigate("/")}>← Back</button>
        <div className="shop-header">
          <h1>🛒 Shop</h1>
          <span className="shop-balance">Balance: ${balance.toLocaleString()}</span>
        </div>

        <div className="shop-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`shop-tab ${selectedCat === cat ? "active" : ""}`}
              onClick={() => setSelectedCat(cat)}
            >
              {CAT_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="shop-grid">
          {shopItems
            .filter((item: any) => item.category === selectedCat)
            .map((item: any) => {
              const owned = ownedItems.includes(item.id);
              const equipped = isEquipped(item);
              return (
                <div key={item.id} className="shop-card" style={equipped ? { borderColor: "#00ff88" } : {}}>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  {!owned && <div className="shop-price">${item.price}</div>}
                  {!owned && (
                    <button
                      className="shop-btn shop-btn-buy"
                      disabled={busy === item.id || balance < item.price}
                      onClick={() => handleBuy(item.id)}
                    >
                      {busy === item.id ? "..." : balance < item.price ? "Can't Afford" : "BUY"}
                    </button>
                  )}
                  {owned && !equipped && (
                    <button
                      className="shop-btn shop-btn-equip"
                      disabled={busy === item.id}
                      onClick={() => handleEquip(item.id)}
                    >
                      {busy === item.id ? "..." : "EQUIP"}
                    </button>
                  )}
                  {equipped && (
                    <button className="shop-btn shop-btn-equipped" disabled>✓ Equipped</button>
                  )}
                </div>
              );
            })}
        </div>

        {msg && <div className="shop-msg">{msg}</div>}
      </div>
    </>
  );
}
