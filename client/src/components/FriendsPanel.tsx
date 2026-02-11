import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEconomy } from "../hooks/useEconomy";
import { useAuth } from "../hooks/useAuth";

export default function FriendsPanel() {
  const { user } = useAuth();
  const { friends, friendRequests, sendFriendRequest, acceptFriendRequest } =
    useEconomy();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const searchResults = useQuery(
    api.economy.searchUsers,
    search.length >= 2 ? { search } : "skip",
  );

  const handleAdd = async (targetId: any) => {
    setBusy(true);
    setMsg(null);
    try {
      await sendFriendRequest(targetId);
      setMsg("Request sent!");
    } catch (e: any) {
      setMsg(e.message || "Failed");
    }
    setBusy(false);
  };

  const handleAccept = async (fromId: any) => {
    setBusy(true);
    try {
      await acceptFriendRequest(fromId);
    } catch (e: any) {
      console.error(e);
    }
    setBusy(false);
  };

  if (!user) return null;

  const pendingCount = friendRequests.length;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: "var(--bg-secondary, #1a1a3e)",
          border: `3px solid ${pendingCount > 0 ? "#ff8c00" : "var(--retro-yellow, #ffd700)"}`,
          color: pendingCount > 0 ? "#ff8c00" : "var(--retro-yellow, #ffd700)",
          padding: "12px 20px",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "0.6rem",
          cursor: "pointer",
          boxShadow: "3px 3px 0px rgba(255,215,0,0.3)",
          width: "100%",
          textAlign: "center" as const,
        }}
      >
        👥 {pendingCount > 0 ? `${pendingCount}!` : `${friends.length}`}
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
      onClick={() => setIsOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-primary, #0f0f23)",
          border: "3px solid var(--retro-yellow, #ffd700)",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "420px",
          width: "90vw",
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
            👥 Friends
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "#ff4444",
              fontFamily: "'Press Start 2P', cursive",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setMsg(null);
          }}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: "2px solid rgba(255,255,255,0.2)",
            color: "#fff",
            padding: "10px 14px",
            fontFamily: "'Press Start 2P', cursive",
            fontSize: "0.52rem",
            borderRadius: "4px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        {searchResults && searchResults.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.38rem",
                marginBottom: "8px",
              }}
            >
              Results
            </h3>
            {searchResults.map((u: any) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 8px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "4px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: "#fff", fontSize: "0.52rem" }}>
                  {u.username}{" "}
                  <span
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "0.44rem",
                    }}
                  >
                    Lv{u.level}
                  </span>
                </span>
                {u.id !== user.userId && (
                  <button
                    onClick={() => handleAdd(u.id)}
                    disabled={busy}
                    style={{
                      background: "#00ff88",
                      color: "#000",
                      border: "none",
                      padding: "3px 8px",
                      fontFamily: "'Press Start 2P', cursive",
                      fontSize: "0.3rem",
                      cursor: "pointer",
                      borderRadius: "3px",
                    }}
                  >
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {msg && (
          <p
            style={{
              color: "#ffd700",
              fontSize: "0.35rem",
              marginBottom: "8px",
            }}
          >
            {msg}
          </p>
        )}

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{
                color: "#ff8c00",
                fontSize: "0.4rem",
                marginBottom: "8px",
              }}
            >
              Pending Requests
            </h3>
            {friendRequests.map((r: any) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px",
                  background: "rgba(255,140,0,0.1)",
                  border: "1px solid rgba(255,140,0,0.3)",
                  borderRadius: "4px",
                  marginBottom: "6px",
                }}
              >
                <span style={{ color: "#fff", fontSize: "0.52rem" }}>
                  {r.username}
                </span>
                <button
                  onClick={() => handleAccept(r.id)}
                  disabled={busy}
                  style={{
                    background: "#00ff88",
                    color: "#000",
                    border: "none",
                    padding: "6px 12px",
                    fontFamily: "'Press Start 2P', cursive",
                    fontSize: "0.44rem",
                    cursor: "pointer",
                    borderRadius: "3px",
                  }}
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        <h3
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.4rem",
            marginBottom: "8px",
          }}
        >
          Friends ({friends.length})
        </h3>
        {friends.length === 0 && (
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.35rem" }}>
            No friends yet. Search above to add!
          </p>
        )}
        {friends.map((f: any) => (
          <div
            key={f.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "4px",
              marginBottom: "4px",
            }}
          >
            <span style={{ color: "#fff", fontSize: "0.52rem" }}>
              {f.username}
            </span>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span
                style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.44rem" }}
              >
                Lv{f.level}
              </span>
              <span style={{ color: "#00ff88", fontSize: "0.44rem" }}>
                ${f.wallet?.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
