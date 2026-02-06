import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [prizePotAmount, setPrizePotAmount] = useState("");
  const [prizeDescription, setPrizeDescription] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<string>("current");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const updatePrizePot = useMutation(api.leaderboard.updatePrizePot);
  const currentLeaderboard = useQuery(api.leaderboard.getCurrentLeaderboard);
  const historicalLeaderboards = useQuery(
    api.leaderboard.getHistoricalLeaderboards,
    {},
  );

  // Redirect if not admin
  if (!user?.isAdmin) {
    navigate("/");
    return null;
  }

  const handleUpdatePrizePot = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const amount = parseFloat(prizePotAmount);
    if (isNaN(amount) || amount < 0) {
      setMessage({ type: "error", text: "Please enter a valid amount" });
      return;
    }

    try {
      let weekStart: number;

      if (selectedWeek === "current" && currentLeaderboard) {
        weekStart = currentLeaderboard.weekStart;
      } else {
        const selectedLb = historicalLeaderboards?.find(
          (lb: any) => String(lb.weekStart) === selectedWeek,
        );
        if (!selectedLb) {
          setMessage({ type: "error", text: "Invalid week selected" });
          return;
        }
        weekStart = selectedLb.weekStart;
      }

      await updatePrizePot({
        userId: user.userId,
        weekStart,
        amount,
        description: prizeDescription.trim() || undefined,
      });

      setMessage({
        type: "success",
        text: `Prize pot updated to $${amount.toFixed(2)}`,
      });
      setPrizePotAmount("");
      setPrizeDescription("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update prize pot",
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <Link to="/" className="back-button">
          ← Back to Home
        </Link>
        <h1 className="admin-title">🔧 Admin Panel</h1>
      </div>

      <div className="admin-container">
        <div className="admin-card">
          <h2 className="section-title">Update Prize Pot</h2>

          <form onSubmit={handleUpdatePrizePot} className="prize-form">
            <div className="form-group">
              <label htmlFor="week-select" className="form-label">
                Select Week
              </label>
              <select
                id="week-select"
                className="form-select"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
              >
                <option value="current">
                  Current Week
                  {currentLeaderboard &&
                    ` (${formatDate(currentLeaderboard.weekStart)} - ${formatDate(currentLeaderboard.weekEnd)})`}
                </option>
                {historicalLeaderboards?.map((lb: any) => (
                  <option key={lb.weekStart} value={String(lb.weekStart)}>
                    {formatDate(lb.weekStart)} - {formatDate(lb.weekEnd)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="prize-amount" className="form-label">
                Prize Pot Amount ($)
              </label>
              <input
                type="number"
                id="prize-amount"
                className="form-input"
                value={prizePotAmount}
                onChange={(e) => setPrizePotAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Enter amount"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="prize-description" className="form-label">
                Description (Optional)
              </label>
              <textarea
                id="prize-description"
                className="form-textarea"
                value={prizeDescription}
                onChange={(e) => setPrizeDescription(e.target.value)}
                placeholder="E.g., Top 3 players win cash prizes"
                rows={4}
              />
            </div>

            {message && (
              <div className={`message ${message.type}`}>{message.text}</div>
            )}

            <button type="submit" className="submit-btn">
              Update Prize Pot
            </button>
          </form>
        </div>

        <div className="admin-info">
          <h3 className="info-title">Admin Functions</h3>
          <ul className="info-list">
            <li>Set prize pot amounts for any week</li>
            <li>Add descriptions for prize details</li>
            <li>Leaderboard updates hourly automatically</li>
            <li>Winners are top 10 players each week</li>
            <li>Week runs Sunday 00:00 - Saturday 23:59:59</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
