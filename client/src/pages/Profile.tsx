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
    const data = profile?.bankrollWeekly ?? profile?.bankrollMini ?? [];
    if (data.length < 2) return null;

    const width = 900;
    const height = 220;
    const pad = 10;
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

    return { width, height, pts };
  }, [profile?.bankrollWeekly, profile?.bankrollMini]);

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  if (profile === null) {
    return (
      <div className="game-container" style={{ paddingTop: 80 }}>
        <button className="home-btn" onClick={goBack}>
          ← BACK
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
        <button className="home-btn" onClick={goBack}>
          ← BACK
        </button>
        <div
          style={{
            textAlign: "center",
            color: "var(--retro-cyan)",
            marginTop: 80,
            fontSize: "clamp(0.95rem, 0.85rem + 0.2vw, 1.15rem)",
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
      style={{
        maxWidth: "none",
        width: "100%",
        minHeight: "100vh",
        padding: "80px 2.5vw 20px",
      }}
    >
      <button className="home-btn" onClick={goBack}>
        ← BACK
      </button>

      <div
        style={{
          width: "100%",
          minHeight: "calc(100vh - 110px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "clamp(200px, 24vw, 300px) minmax(0, 1fr)",
            gap: 22,
            alignItems: "start",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(70px, 9vw, 100px)", lineHeight: 1.1 }}>
              {profile.avatar || "🎲"}
            </div>
            <div
              style={{
                color: "var(--retro-yellow)",
                marginTop: 8,
                fontFamily: "'Press Start 2P'",
                fontSize: "clamp(0.78rem, 0.7rem + 0.25vw, 0.98rem)",
              }}
            >
              @{profile.username}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: "clamp(0.78rem, 0.7rem + 0.2vw, 0.95rem)",
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
                fontSize: "clamp(1.2rem, 1.08rem + 0.35vw, 1.45rem)",
              }}
            >
              Public Profile
            </h2>
            <p
              style={{
                marginTop: 12,
                color: "var(--text-primary)",
                fontFamily: "'VT323'",
                fontSize: "clamp(1.4rem, 1.2rem + 0.4vw, 1.75rem)",
                lineHeight: 1.35,
              }}
            >
              {profile.bio || "No bio set yet."}
            </p>

            {isOwn && (
              <div
                style={{
                  marginTop: 14,
                  borderTop: "1px dashed rgba(255,255,255,0.25)",
                  paddingTop: 14,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px minmax(0, 1fr)",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <label
                    className="lobby-label"
                    style={{
                      margin: 0,
                      fontSize: "clamp(0.78rem, 0.7rem + 0.2vw, 0.95rem)",
                    }}
                  >
                    Avatar
                  </label>
                  <input
                    className="lobby-input"
                    style={{
                      fontSize: "clamp(1rem, 0.92rem + 0.25vw, 1.2rem)",
                      letterSpacing: "0.05em",
                      textTransform: "none",
                      textAlign: "left",
                    }}
                    maxLength={8}
                    placeholder="🎲"
                    value={avatarDraft}
                    onChange={(e) => setAvatarDraft(e.target.value)}
                  />
                  <label
                    className="lobby-label"
                    style={{
                      margin: 0,
                      fontSize: "clamp(0.78rem, 0.7rem + 0.2vw, 0.95rem)",
                    }}
                  >
                    Bio
                  </label>
                  <input
                    className="lobby-input"
                    style={{
                      fontSize: "clamp(0.98rem, 0.9rem + 0.24vw, 1.15rem)",
                      letterSpacing: "0.03em",
                      textTransform: "none",
                      textAlign: "left",
                    }}
                    maxLength={220}
                    placeholder="Tell players about your style"
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                  />
                </div>
                <button
                  className="action-btn btn-hit"
                  style={{
                    marginTop: 12,
                    fontSize: "clamp(0.85rem, 0.78rem + 0.2vw, 1rem)",
                  }}
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
            marginTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.16)",
            paddingTop: 16,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3
            style={{
              color: "var(--retro-yellow)",
              fontSize: "clamp(0.95rem, 0.86rem + 0.24vw, 1.1rem)",
              marginBottom: 10,
            }}
          >
            Weekly Bankroll Graph
          </h3>
          {points ? (
            <svg
              width="100%"
              height="clamp(220px, 34vh, 420px)"
              viewBox={`0 0 ${points.width} ${points.height}`}
              preserveAspectRatio="xMidYMid meet"
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
              style={{
                color: "var(--text-secondary)",
                fontSize: "clamp(0.84rem, 0.78rem + 0.2vw, 1rem)",
              }}
            >
              Not enough history yet.
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.16)",
            paddingTop: 16,
          }}
        >
          <h3
            style={{
              color: "var(--retro-yellow)",
              fontSize: "clamp(0.95rem, 0.86rem + 0.24vw, 1.1rem)",
              marginBottom: 10,
            }}
          >
            Recent Results
          </h3>
          {(profile.recentResults ?? []).length === 0 ? (
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: "clamp(0.84rem, 0.78rem + 0.2vw, 1rem)",
              }}
            >
              No recent rounds.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {profile.recentResults.map((row: any) => (
                <div
                  key={row._id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 12,
                    fontSize: "clamp(0.84rem, 0.78rem + 0.2vw, 1rem)",
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
