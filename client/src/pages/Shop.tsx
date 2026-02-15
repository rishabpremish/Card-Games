import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../hooks/useAuth";
import { useWallet } from "../hooks/useWallet";
import { useEconomy } from "../hooks/useEconomy";

type ShopFilter = "cardback" | "theme";

const DEFAULT_THEME_PREVIEW = [
  "#0f0f23",
  "#00fff7",
  "#ff00ff",
  "#ffd700",
  "#00ff00",
  "#f8f8f2",
];

export default function Shop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet } = useWallet();
  const { playerStats } = useEconomy();

  const catalog = useQuery(api.shop.getCatalog);
  const purchaseItem = useMutation(api.shop.purchaseItem);
  const equipCardBack = useMutation(api.shop.equipCardBack);

  const [filter, setFilter] = useState<ShopFilter>("cardback");
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const owned = useMemo(
    () => new Set<string>(playerStats?.ownedItems ?? []),
    [playerStats?.ownedItems],
  );

  const equippedCardBack = playerStats?.equippedCardBack ?? "default";
  const equippedTheme =
    playerStats?.equippedTheme ?? user?.settings?.theme ?? "default";

  const items = useMemo(() => {
    if (!catalog) return [];
    return catalog.filter((i) => i.kind === filter);
  }, [catalog, filter]);

  const handleBuy = async (itemId: string) => {
    if (!user) return;
    setBusyItem(itemId);
    setMsg(null);
    try {
      await purchaseItem({ userId: user.userId, itemId });
      setMsg("Purchased!");
    } catch (e: any) {
      setMsg(e?.message ?? "Purchase failed");
    }
    setBusyItem(null);
  };

  const handleEquip = async (itemId: string) => {
    if (!user) return;
    setBusyItem(itemId);
    setMsg(null);
    try {
      await equipCardBack({ userId: user.userId, itemId });
      setMsg("Equipped!");
    } catch (e: any) {
      setMsg(e?.message ?? "Equip failed");
    }
    setBusyItem(null);
  };

  return (
    <div className="shop-page">
      <style>{`
        .shop-page {
          min-height: 100vh;
          background: var(--bg-primary, #0f0f23);
          padding: 44px 20px 30px;
          font-family: 'Press Start 2P', cursive;
          color: #fff;
          max-width: 1250px;
          margin: 0 auto;
        }
        .shop-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .shop-title {
          margin: 0;
          color: var(--retro-yellow, #ffd700);
          text-shadow: 3px 3px 0 var(--retro-magenta, #ff00ff);
          font-size: clamp(1.2rem, 3vw, 1.8rem);
        }
        .shop-balance {
          background: var(--bg-secondary);
          border: 3px solid var(--retro-yellow);
          padding: 10px 16px;
          font-size: 0.55rem;
          color: var(--retro-yellow);
          text-align: center;
        }
        .shop-controls {
          display: flex;
          justify-content: center;
          margin: 10px 0 18px;
        }
        .shop-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .shop-card {
          background: rgba(255,255,255,0.04);
          border: 3px solid rgba(255,255,255,0.12);
          padding: 16px;
        }
        .shop-row {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .theme-preview {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 4px;
          width: 88px;
          height: 52px;
          border: 2px solid rgba(255,255,255,0.2);
          background: rgba(0,0,0,0.24);
          padding: 4px;
        }
        .theme-preview span {
          border-radius: 1px;
        }
        .shop-item-name {
          font-size: 0.7rem;
          color: var(--retro-cyan);
          margin: 0 0 8px 0;
        }
        .shop-item-desc {
          font-family: 'VT323', monospace;
          font-size: 1.05rem;
          color: rgba(255,255,255,0.7);
          margin: 0;
        }
        .shop-price {
          margin-top: 10px;
          font-size: 0.6rem;
          color: var(--retro-green);
        }
        .shop-actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .shop-btn {
          font-family: 'Press Start 2P', cursive;
          font-size: 0.45rem;
          padding: 8px 10px;
          cursor: pointer;
          border: 2px solid;
          background: var(--bg-secondary);
        }
        .shop-btn.buy { border-color: var(--retro-green); color: var(--retro-green); }
        .shop-btn.buy:disabled { opacity: 0.5; cursor: not-allowed; }
        .shop-btn.equip { border-color: var(--retro-yellow); color: var(--retro-yellow); }
        .shop-btn.equip.on { background: var(--retro-yellow); color: #000; }
        .shop-msg {
          text-align: center;
          margin: 6px 0 16px;
          color: var(--retro-yellow);
          font-size: 0.55rem;
        }
      `}</style>

      <div className="shop-header">
        <button
          type="button"
          className="back-button"
          onClick={() =>
            window.history.length > 1 ? navigate(-1) : navigate("/")
          }
        >
          ← Back
        </button>
        <h1 className="shop-title">🛒 Shop</h1>
        <div className="shop-balance">
          Balance
          <br />${wallet.toLocaleString()}
        </div>
      </div>

      {msg && <div className="shop-msg">{msg}</div>}

      <div className="shop-controls">
        <select
          className="week-selector"
          value={filter}
          onChange={(e) => setFilter(e.target.value as ShopFilter)}
        >
          <option value="cardback">Card Backs</option>
          <option value="theme">Themes</option>
        </select>
      </div>

      <div className="shop-grid">
        {filter === "cardback" ? (
          <div className="shop-card">
            <div className="shop-row">
              <div
                className={`cardback-preview ${equippedCardBack === "default" ? "cardback-equipped" : ""}`}
              />
              <div style={{ flex: 1 }}>
                <h3 className="shop-item-name">Default</h3>
                <p className="shop-item-desc">
                  The classic back you start with.
                </p>
                <div className="shop-price">Price: $0</div>
                <div className="shop-actions">
                  <button
                    className={`shop-btn equip ${equippedCardBack === "default" ? "on" : ""}`}
                    onClick={() => handleEquip("default")}
                    disabled={busyItem !== null}
                  >
                    {equippedCardBack === "default" ? "EQUIPPED" : "EQUIP"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="shop-card">
            <div className="shop-row">
              <div className="theme-preview">
                {DEFAULT_THEME_PREVIEW.map((color, idx) => (
                  <span key={idx} style={{ background: color }} />
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="shop-item-name">Default Arcade</h3>
                <p className="shop-item-desc">Original app theme.</p>
                <div className="shop-price">Price: $0</div>
                <div className="shop-actions">
                  <button
                    className={`shop-btn equip ${equippedTheme === "default" ? "on" : ""}`}
                    onClick={() => handleEquip("theme_default")}
                    disabled={busyItem !== null}
                  >
                    {equippedTheme === "default" ? "EQUIPPED" : "EQUIP"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {items.map((item) => {
          const isOwned = owned.has(item.id);
          const isEquipped =
            filter === "theme"
              ? equippedTheme === item.id
              : equippedCardBack === item.id;
          const canAfford = wallet >= item.price;
          const previewColors =
            ((item as any).previewColors as string[] | undefined) ?? [];
          return (
            <div className="shop-card" key={item.id}>
              <div className="shop-row">
                {filter === "theme" ? (
                  <div className="theme-preview">
                    {(previewColors ?? []).map((color, idx) => (
                      <span key={idx} style={{ background: color }} />
                    ))}
                  </div>
                ) : (
                  <div className={`cardback-preview ${item.id}`} />
                )}
                <div style={{ flex: 1 }}>
                  <h3 className="shop-item-name">{item.name}</h3>
                  <p className="shop-item-desc">{item.description}</p>
                  <div className="shop-price">
                    Price: ${item.price.toLocaleString()}
                  </div>
                  <div className="shop-actions">
                    {!isOwned ? (
                      <button
                        className="shop-btn buy"
                        onClick={() => handleBuy(item.id)}
                        disabled={busyItem !== null || !canAfford}
                        title={!canAfford ? "Not enough money" : undefined}
                      >
                        {busyItem === item.id ? "…" : "BUY"}
                      </button>
                    ) : (
                      <button
                        className={`shop-btn equip ${isEquipped ? "on" : ""}`}
                        onClick={() => handleEquip(item.id)}
                        disabled={busyItem !== null}
                      >
                        {isEquipped ? "EQUIPPED" : "EQUIP"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
