import { useState } from "react";
import { useEconomy } from "../hooks/useEconomy";
import { useAuth } from "../hooks/useAuth";
import { useWallet } from "../hooks/useWallet";

const LOAN_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export default function LoanPanel() {
  const { user } = useAuth();
  const { wallet: balance } = useWallet();
  const { activeLoans, takeLoan, repayLoan } = useEconomy();
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
      else setMsg(`Repaid $${(result as any).repaid}. Remaining: $${(result as any).remaining}`);
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
          position: "fixed",
          bottom: "70px",
          right: "20px",
          background: "var(--bg-secondary, #1a1a3e)",
          border: `3px solid ${hasLoan ? "#ff4444" : "var(--retro-yellow, #ffd700)"}`,
          color: hasLoan ? "#ff4444" : "var(--retro-yellow, #ffd700)",
          padding: "10px 20px",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "0.5rem",
          cursor: "pointer",
          zIndex: 100,
          boxShadow: "3px 3px 0px rgba(255,215,0,0.3)",
        }}
      >
        🏦 {hasLoan ? "Loan" : "Bank"}
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ color: "var(--retro-yellow, #ffd700)", fontSize: "0.7rem", margin: 0 }}>🏦 Loan Shark</h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: "none", border: "none", color: "#ff4444", fontFamily: "'Press Start 2P', cursive", fontSize: "0.6rem", cursor: "pointer" }}
          >✕</button>
        </div>

        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.35rem", marginBottom: "16px" }}>
          10% interest • 7 day term • 1 loan at a time
        </p>

        {!hasLoan ? (
          <>
            <p style={{ color: "#fff", fontSize: "0.4rem", marginBottom: "12px" }}>Choose loan amount:</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
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
                    fontSize: "0.38rem",
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
          <div style={{ background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "6px", padding: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.35rem" }}>Borrowed</span>
              <span style={{ color: "#fff", fontSize: "0.4rem" }}>${currentLoan.amount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.35rem" }}>Total Owed</span>
              <span style={{ color: "#ff4444", fontSize: "0.4rem" }}>${currentLoan.totalOwed}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.35rem" }}>Repaid</span>
              <span style={{ color: "#00ff88", fontSize: "0.4rem" }}>${currentLoan.repaid}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.35rem" }}>Remaining</span>
              <span style={{ color: "#ffd700", fontSize: "0.4rem" }}>${currentLoan.totalOwed - currentLoan.repaid}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.35rem" }}>Due</span>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.35rem" }}>
                {new Date(currentLoan.dueAt).toLocaleDateString()}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleRepay(Math.min(100, currentLoan.totalOwed - currentLoan.repaid))}
                disabled={busy || balance < 1}
                style={{
                  flex: 1,
                  background: "rgba(255,215,0,0.15)",
                  border: "2px solid #ffd700",
                  color: "#ffd700",
                  padding: "8px",
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.35rem",
                  cursor: busy ? "not-allowed" : "pointer",
                  borderRadius: "4px",
                }}
              >
                Pay $100
              </button>
              <button
                onClick={() => handleRepay(currentLoan.totalOwed - currentLoan.repaid)}
                disabled={busy || balance < (currentLoan.totalOwed - currentLoan.repaid)}
                style={{
                  flex: 1,
                  background: "rgba(0,255,136,0.15)",
                  border: "2px solid #00ff88",
                  color: "#00ff88",
                  padding: "8px",
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.35rem",
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
          <p style={{ color: "#ffd700", fontSize: "0.38rem", textAlign: "center", marginTop: "12px" }}>{msg}</p>
        )}
      </div>
    </div>
  );
}
