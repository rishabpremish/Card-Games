import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../hooks/useAuth";

export default function NotificationsPanel() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const unread = useQuery(
    api.notifications.unreadCount,
    user ? { userId: user.userId } : "skip",
  );

  const notifications = useQuery(
    api.notifications.listNotifications,
    user ? { userId: user.userId, limit: 50 } : "skip",
  );

  const markAllRead = useMutation(api.notifications.markAllRead);

  if (!user) return null;

  const unreadCount = unread?.count ?? 0;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: "var(--bg-secondary, #1a1a3e)",
          border: `3px solid ${unreadCount > 0 ? "#ff8c00" : "var(--retro-yellow, #ffd700)"}`,
          color: unreadCount > 0 ? "#ff8c00" : "var(--retro-yellow, #ffd700)",
          padding: "12px 20px",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "0.6rem",
          cursor: "pointer",
          boxShadow:
            unreadCount > 0
              ? "0 0 12px rgba(255,140,0,0.45)"
              : "3px 3px 0px rgba(255,215,0,0.3)",
          animation: unreadCount > 0 ? "pulse 1.5s infinite" : "none",
          width: "100%",
          textAlign: "center" as const,
        }}
      >
        🔔 {unreadCount > 0 ? `Alerts ${unreadCount}!` : "Alerts"}
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 15, 35, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
      }}
      onClick={async () => {
        setIsOpen(false);
        try {
          await markAllRead({ userId: user.userId });
        } catch {
          // ignore
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-primary, #0f0f23)",
          border: "3px solid var(--retro-yellow, #ffd700)",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "520px",
          width: "92vw",
          maxHeight: "70vh",
          overflowY: "auto",
          fontFamily: "'Press Start 2P', cursive",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              color: "var(--retro-yellow, #ffd700)",
              fontSize: "1.05rem",
              margin: 0,
            }}
          >
            🔔 Notifications
          </h2>
          <button onClick={() => setIsOpen(false)} className="retro-close-btn">
            ✕
          </button>
        </div>

        {!notifications || notifications.length === 0 ? (
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.6rem",
              textAlign: "center",
            }}
          >
            No notifications yet.
          </p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {notifications.map((n: any) => (
              <div
                key={n._id}
                style={{
                  background: n.read
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(255,140,0,0.08)",
                  border: `2px solid ${n.read ? "rgba(255,255,255,0.12)" : "rgba(255,140,0,0.35)"}`,
                  borderRadius: "6px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    style={{
                      color: n.read ? "rgba(255,255,255,0.6)" : "#ff8c00",
                      fontSize: "0.42rem",
                    }}
                  >
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                  {!n.read && (
                    <span style={{ color: "#ff8c00", fontSize: "0.42rem" }}>
                      NEW
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: "1.1rem",
                    color: "#fff",
                  }}
                >
                  {n.message}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <button
            onClick={async () => {
              try {
                await markAllRead({ userId: user.userId });
              } catch {
                // ignore
              }
            }}
            style={{
              background: "rgba(0,255,136,0.12)",
              border: "2px solid #00ff88",
              color: "#00ff88",
              padding: "10px 14px",
              fontFamily: "'Press Start 2P', cursive",
              fontSize: "0.45rem",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            MARK ALL READ
          </button>
        </div>
      </div>
    </div>
  );
}
