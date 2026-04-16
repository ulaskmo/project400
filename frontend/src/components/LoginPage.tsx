import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

export function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendMode, setBackendMode] = useState<"demo" | "blockchain" | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((d) => setBackendMode(d.mode || "demo"))
      .catch(() => setBackendMode("demo"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, "holder");
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="bg-animation" />

      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: 400,
        padding: "var(--space-6)"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <img
            src="/chainshield.png"
            alt="ChainShield"
            style={{
              width: 180,
              height: "auto",
              margin: "0 auto var(--space-4)",
              display: "block",
              borderRadius: "var(--radius-lg)"
            }}
          />
          <p style={{ color: "var(--gray-500)", fontSize: "0.8125rem", letterSpacing: "0.02em" }}>
            Self-Sovereign Identity Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <h2 style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            textAlign: "center",
            marginBottom: "var(--space-5)",
            color: "var(--gray-100)"
          }}>
            {isRegister ? "Create Account" : "Sign In"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--gray-600)", width: 16, height: 16
                }}>
                  <MailIcon />
                </span>
                <input
                  type="email" className="input" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--gray-600)", width: 16, height: 16
                }}>
                  <LockIcon />
                </span>
                <input
                  type="password" className="input" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>

            {error && (
              <div className="error-message" style={{ marginBottom: "var(--space-3)" }}>
                <AlertCircleIcon />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit" className="btn btn-primary btn-lg w-full"
              disabled={loading} style={{ marginTop: "var(--space-3)" }}
            >
              {loading ? (
                <span className="loading">
                  <span className="spinner" />
                  {isRegister ? "Creating..." : "Signing in..."}
                </span>
              ) : (
                isRegister ? "Create Account" : "Sign In"
              )}
            </button>
          </form>

          <div style={{
            marginTop: "var(--space-5)", textAlign: "center",
            color: "var(--gray-500)", fontSize: "0.8125rem"
          }}>
            {isRegister ? (
              <>
                Already have an account?{" "}
                <button onClick={() => setIsRegister(false)}
                  style={{ background: "none", border: "none", color: "var(--brand-400)", cursor: "pointer", fontWeight: 500, fontSize: "0.8125rem" }}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to ChainShield?{" "}
                <button onClick={() => setIsRegister(true)}
                  style={{ background: "none", border: "none", color: "var(--brand-400)", cursor: "pointer", fontWeight: 500, fontSize: "0.8125rem" }}>
                  Create account
                </button>
              </>
            )}
          </div>

          {/* Admin credentials */}
          <div className="info-box" style={{ marginTop: "var(--space-5)" }}>
            <div style={{ fontSize: "0.75rem" }}>
              <strong style={{ color: "var(--gray-300)" }}>Demo Login:</strong><br />
              <code style={{ color: "var(--gray-400)" }}>admin@chainshield.io</code> / <code style={{ color: "var(--gray-400)" }}>admin123</code>
            </div>
          </div>

          {backendMode && (
            <div style={{
              marginTop: "var(--space-3)", textAlign: "center",
              fontSize: "0.6875rem", color: "var(--gray-600)"
            }}>
              {backendMode === "blockchain" ? (
                <span style={{ color: "var(--brand-400)" }}>Polygon Amoy</span>
              ) : (
                <span>Demo Mode</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
