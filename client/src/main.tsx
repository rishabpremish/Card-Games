import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "./hooks/AuthContext";
import "./index.css";
import App from "./App";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

// If the Convex URL is missing, render a friendly error instead of crashing the app.
const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root container missing");
}

if (!convexUrl) {
  createRoot(rootEl).render(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        color: "var(--retro-red)",
        fontFamily: "'Press Start 2P', cursive",
        textAlign: "center",
        padding: "20px",
      }}
    >
      Missing VITE_CONVEX_URL. Set it in Render env vars and redeploy.
    </div>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);

  createRoot(rootEl).render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ConvexProvider>
    </StrictMode>,
  );
}
