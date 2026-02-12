import { useState } from "react";
import { useEconomy } from "../hooks/useEconomy";
import { useAuth } from "../hooks/useAuth";
import { useWallet } from "../hooks/useWallet";

const LOAN_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export default function LoanPanel() {
  const { user } = useAuth();
  const { wallet: balance } = useWallet();
  const { activeLoans, takeLoan, repayLoan, extendLoan, reduceLoanPenalty } =
    useEconomy();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const hasLoan = activeLoans.length > 0;
  const currentLoan = hasLoan ? activeLoans[0] : null;

  const handleTakeLoan = async (amount: number) => {
    setBusy(true);
    setMsg(null);
    try {
      const result = await takeLoan(amount);
      setMsg(`Received $${amount}! Owe $${(result as any).totalOwed}`);
    } catch (e: any) {
      setMsg(e.message || "Failed");
    }
    setBusy(false);
  };

  const handleRepay = async (amount: number) => {
    if (!currentLoan) return;
    setBusy(true);
    setMsg(null);
    try {
      const result = await repayLoan(currentLoan._id, amount);
      if ((result as any).fullyPaid) setMsg("Loan fully repaid! 🎉");
      else
        setMsg(
          `Repaid $${(result as any).repaid}. Remaining: $${(result as any).remaining}`,
        );
    } catch (e: any) {
      setMsg(e.message || "Failed");
    }
    setBusy(false);
  };

  const handleExtend = async () => {
    if (!currentLoan) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await extendLoan(currentLoan._id);
      setMsg(`Extended 7 days. Fee: $${(res as any).fee}`);
    } catch (e: any) {
      setMsg(e.message || "Failed");
    }
    setBusy(false);
  };

  const handleReducePenalty = async () => {
    if (!currentLoan) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await reduceLoanPenalty(currentLoan._id);
      setMsg(`Penalty reduced to 5%. Fee: $${(res as any).fee}`);
    } catch (e: any) {
      setMsg(e.message || "Failed");
    }
    setBusy(false);
  };

  if (!user) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: "var(--bg-secondary, #1a1a3e)",
          border: `3px solid ${hasLoan ? "#ff4444" : "var(--retro-yellow, #ffd700)"}`,
          color: hasLoan ? "#ff4444" : "var(--retro-yellow, #ffd700)",
          padding: "12px 20px",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "0.6rem",
          cursor: "pointer",
          boxShadow: "3px 3px 0px rgba(255,215,0,0.3)",
          width: "100%",
          textAlign: "center" as const,
          position: "relative" as const,
        }}
      >
        🏦 {hasLoan ? "Loan" : "Bank"}
        {hasLoan && (
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: "#ff0000",
              border: "2px solid #ff4444",
              boxShadow: "0 0 6px rgba(255,0,0,0.6)",
            }}
          />
        )}
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
            🏦 Loan Shark
          </h2>
          <button onClick={() => setIsOpen(false)} className="retro-close-btn">
            ✕
          </button>
        </div>

        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.5rem",
            marginBottom: "16px",
          }}
        >
          10% interest • 7 day term • 1 loan at a time
        </p>

        {!hasLoan ? (
          <>
            <p
              style={{
                color: "#fff",
                fontSize: "0.58rem",
                marginBottom: "12px",
              }}
            >
              Choose loan amount:
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "8px",
              }}
            >
              {LOAN_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleTakeLoan(amt)}
                  disabled={busy}
                  style={{
                    background: "rgba(0,255,136,0.15)",
                    border: "2px solid #00ff88",
                    color: "#00ff88",
                    padding: "10px 8px",
                    fontFamily: "'Press Start 2P', cursive",
                    fontSize: "0.52rem",
                    cursor: busy ? "not-allowed" : "pointer",
                    borderRadius: "4px",
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  ${amt.toLocaleString()}
                </button>
              ))}
            </div>
          </>
        ) : currentLoan ? (
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "2px solid rgba(255,255,255,0.15)",
              borderRadius: "6px",
              padding: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.5rem" }}
              >
                Borrowed
              </span>
              <span style={{ color: "#fff", fontSize: "0.58rem" }}>
                ${currentLoan.amount}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.5rem" }}
              >
                Total Owed
              </span>
              <span style={{ color: "#ff4444", fontSize: "0.58rem" }}>
                ${currentLoan.totalOwed}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.5rem" }}
              >
                Repaid
              </span>
              <span style={{ color: "#00ff88", fontSize: "0.58rem" }}>
                ${currentLoan.repaid}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.5rem" }}
              >
                Remaining
              </span>
              <span style={{ color: "#ffd700", fontSize: "0.58rem" }}>
                ${currentLoan.totalOwed - currentLoan.repaid}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.5rem" }}
              >
                Due
              </span>
              <span
                style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.5rem" }}
              >
                {new Date(currentLoan.dueAt).toLocaleDateString()}
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <button
                onClick={handleExtend}
                disabled={busy}
                style={{
                  flex: 1,
                  background: "rgba(0,255,247,0.12)",
                  border: "2px solid var(--retro-cyan)",
                  color: "var(--retro-cyan)",
                  padding: "8px",
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.45rem",
                  cursor: busy ? "not-allowed" : "pointer",
                  borderRadius: "4px",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                +7 DAYS
              </button>
              <button
                onClick={handleReducePenalty}
                disabled={busy}
                style={{
                  flex: 1,
                  background: "rgba(255,215,0,0.12)",
                  border: "2px solid #ffd700",
                  color: "#ffd700",
                  padding: "8px",
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.45rem",
                  cursor: busy ? "not-allowed" : "pointer",
                  borderRadius: "4px",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                REDUCE FEE
              </button>
            </div>
            {currentLoan.dueAt < Date.now() && (
              <div
                style={{
                  background: "rgba(255,0,0,0.15)",
                  border: "2px solid #ff4444",
                  borderRadius: "4px",
                  padding: "8px",
                  marginBottom: "12px",
                  textAlign: "center",
                }}
              >
                <span style={{ color: "#ff4444", fontSize: "0.45rem" }}>
                  ⚠️ OVERDUE! 10% of your balance is deducted daily until
                  repaid.
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() =>
                  handleRepay(
                    Math.min(100, currentLoan.totalOwed - currentLoan.repaid),
                  )
                }
                disabled={busy || balance < 1}
                style={{
                  flex: 1,
                  background: "rgba(255,215,0,0.15)",
                  border: "2px solid #ffd700",
                  color: "#ffd700",
                  padding: "8px",
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.5rem",
                  cursor: busy ? "not-allowed" : "pointer",
                  borderRadius: "4px",
                }}
              >
                Pay $100
              </button>
              <button
                onClick={() =>
                  handleRepay(currentLoan.totalOwed - currentLoan.repaid)
                }
                disabled={
                  busy || balance < currentLoan.totalOwed - currentLoan.repaid
                }
                style={{
                  flex: 1,
                  background: "rgba(0,255,136,0.15)",
                  border: "2px solid #00ff88",
                  color: "#00ff88",
                  padding: "8px",
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.5rem",
                  cursor: busy ? "not-allowed" : "pointer",
                  borderRadius: "4px",
                }}
              >
                Pay All
              </button>
            </div>
          </div>
        ) : null}

        {msg && (
          <p
            style={{
              color: "#ffd700",
              fontSize: "0.38rem",
              textAlign: "center",
              marginTop: "12px",
            }}
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
