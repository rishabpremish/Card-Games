import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../hooks/useAuth";

export default function Profile() {
  const navigate = useNavigate();
  const { username = "" } = useParams();
  const { user } = useAuth();
  const profile = useQuery(api.auth.getPublicProfile, {
    username: username.toLowerCase(),
  });
  const updateProfile = useMutation(api.auth.updateProfile);

  const isOwn =
    !!user && user.username?.toLowerCase() === username.toLowerCase();
  const [avatarDraft, setAvatarDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");

  const points = useMemo(() => {
    const data = profile?.bankrollMini ?? [];
    if (data.length < 2) return null;
    const width = 360;
    const height = 90;
    const pad = 8;
    const values = data.map((d: any) => d.balance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    const step = (width - pad * 2) / (data.length - 1);
    const pts = data
      .map((d: any, i: number) => {
        const x = pad + i * step;
        const y = pad + (height - pad * 2) * (1 - (d.balance - min) / range);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return { width, height, pts, min, max };
  }, [profile?.bankrollMini]);

  if (profile === null) {
    return (
      <div className="game-container" style={{ paddingTop: 80 }}>
        <button className="home-btn" onClick={() => navigate("/")}>
          🏠 HOME
        </button>
        <div
          className="retro-card"
          style={{ maxWidth: 500, margin: "90px auto", padding: 20 }}
        >
          <h2 style={{ marginBottom: 12 }}>Profile not found</h2>
          <p>@{username}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="game-container" style={{ paddingTop: 80 }}>
        <button className="home-btn" onClick={() => navigate("/")}>
          🏠 HOME
        </button>
        <div
          style={{
            textAlign: "center",
            color: "var(--retro-cyan)",
            marginTop: 80,
          }}
        >
          Loading profile...
        </div>
      </div>
    );
  }

  const avatar = avatarDraft || profile.avatar || "🎲";
  const bio = bioDraft || profile.bio || "";

  const saveProfile = async () => {
    await updateProfile({
      userId: user!.userId,
      avatar: avatar.trim(),
      bio: bio.trim(),
    });
    setAvatarDraft("");
    setBioDraft("");
  };

  return (
    <div
      className="game-container"
      style={{ minHeight: "100vh", padding: "80px 20px 20px" }}
    >
      <button className="home-btn" onClick={() => navigate("/")}>
        🏠 HOME
      </button>

      <div className="lobby-card" style={{ maxWidth: 920, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 72, lineHeight: 1.1 }}>
              {profile.avatar || "🎲"}
            </div>
            <div
              style={{
                color: "var(--retro-yellow)",
                marginTop: 8,
                fontFamily: "'Press Start 2P'",
                fontSize: "0.55rem",
              }}
            >
              @{profile.username}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: "0.5rem",
                color: "var(--text-secondary)",
              }}
            >
              Lv {profile.level} • {profile.vipTier}
            </div>
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                color: "var(--retro-cyan)",
                fontSize: "1rem",
              }}
            >
              Public Profile
            </h2>
            <p
              style={{
                marginTop: 10,
                color: "var(--text-primary)",
                fontFamily: "'VT323'",
                fontSize: "1.15rem",
              }}
            >
              {profile.bio || "No bio set yet."}
            </p>

            {isOwn && (
              <div
                style={{
                  marginTop: 12,
                  borderTop: "1px dashed rgba(255,255,255,0.25)",
                  paddingTop: 12,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <label className="lobby-label" style={{ margin: 0 }}>
                    Avatar
                  </label>
                  <input
                    className="lobby-input"
                    maxLength={8}
                    placeholder="🎲"
                    value={avatarDraft}
                    onChange={(e) => setAvatarDraft(e.target.value)}
                  />
                  <label className="lobby-label" style={{ margin: 0 }}>
                    Bio
                  </label>
                  <input
                    className="lobby-input"
                    maxLength={220}
                    placeholder="Tell players about your style"
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                  />
                </div>
                <button
                  className="action-btn btn-hit"
                  style={{ marginTop: 10, fontSize: "0.6rem" }}
                  onClick={saveProfile}
                >
                  SAVE PROFILE
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            borderTop: "1px solid rgba(255,255,255,0.16)",
            paddingTop: 14,
          }}
        >
          <h3
            style={{
              color: "var(--retro-yellow)",
              fontSize: "0.65rem",
              marginBottom: 8,
            }}
          >
            Bankroll Mini Graph
          </h3>
          {points ? (
            <svg
              width={points.width}
              height={points.height}
              viewBox={`0 0 ${points.width} ${points.height}`}
            >
              <polyline
                fill="none"
                stroke="var(--retro-cyan)"
                strokeWidth="3"
                points={points.pts}
              />
            </svg>
          ) : (
            <div
              style={{ color: "var(--text-secondary)", fontSize: "0.55rem" }}
            >
              Not enough history yet.
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.16)",
            paddingTop: 14,
          }}
        >
          <h3
            style={{
              color: "var(--retro-yellow)",
              fontSize: "0.65rem",
              marginBottom: 8,
            }}
          >
            Recent Results
          </h3>
          {(profile.recentResults ?? []).length === 0 ? (
            <div
              style={{ color: "var(--text-secondary)", fontSize: "0.55rem" }}
            >
              No recent rounds.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {profile.recentResults.map((row: any) => (
                <div
                  key={row._id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 10,
                    fontSize: "0.55rem",
                  }}
                >
                  <span>{row.game}</span>
                  <span
                    style={{
                      color:
                        row.net >= 0
                          ? "var(--retro-green)"
                          : "var(--retro-red)",
                    }}
                  >
                    {row.net >= 0 ? "+" : ""}${row.net}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {new Date(row.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
