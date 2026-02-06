import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import "../styles.css";

export default function Auth() {
  const { register, login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const result = isLogin
        ? await login(username, password)
        : await register(username, password);

      if (!result.success) {
        setError(result.error || "An error occurred");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-container">
        <div className="auth-header">
          <h1>🎮 UgroundBetZ</h1>
          <p className="auth-subtitle">
            {isLogin ? "Welcome Back!" : "Join the Underground"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label className="auth-label">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
              placeholder="Enter username"
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="Enter password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              disabled={isLoading}
            />
          </div>

          {!isLogin && (
            <div className="auth-input-group">
              <label className="auth-label">CONFIRM PASSWORD</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
                placeholder="Confirm password"
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "..." : isLogin ? "🎮 LOGIN" : "🎲 CREATE ACCOUNT"}
          </button>

          <button
            type="button"
            className="auth-toggle-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setConfirmPassword("");
            }}
            disabled={isLoading}
          >
            {isLogin
              ? "Need an account? Sign up"
              : "Already have an account? Login"}
          </button>
        </form>

        <div className="auth-footer">
          <p>Start with $100 • Weekly Leaderboards • Real Prizes</p>
        </div>
      </div>
    </div>
  );
}
