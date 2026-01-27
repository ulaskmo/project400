import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// Icons
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

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
        maxWidth: 420,
        padding: "var(--space-6)"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <div className="logo-icon" style={{ margin: "0 auto var(--space-4)", width: 72, height: 72 }}>
            <ShieldIcon />
          </div>
          <h1 style={{ 
            fontSize: "2rem", 
            fontWeight: 700,
            background: "var(--gradient-primary)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            ChainShield
          </h1>
          <p style={{ color: "var(--gray-400)", marginTop: "var(--space-2)" }}>
            Self-Sovereign Identity Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding: "var(--space-8)" }}>
          <h2 style={{ 
            fontSize: "1.5rem", 
            fontWeight: 600, 
            textAlign: "center",
            marginBottom: "var(--space-6)"
          }}>
            {isRegister ? "Create Account" : "Welcome Back"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <div style={{ position: "relative" }}>
                <span style={{ 
                  position: "absolute", 
                  left: 12, 
                  top: "50%", 
                  transform: "translateY(-50%)",
                  color: "var(--gray-500)",
                  width: 20,
                  height: 20
                }}>
                  <MailIcon />
                </span>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{ paddingLeft: 44 }}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: "relative" }}>
                <span style={{ 
                  position: "absolute", 
                  left: 12, 
                  top: "50%", 
                  transform: "translateY(-50%)",
                  color: "var(--gray-500)",
                  width: 20,
                  height: 20
                }}>
                  <LockIcon />
                </span>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{ paddingLeft: 44 }}
                />
              </div>
            </div>

            {error && (
              <div className="error-message" style={{ marginBottom: "var(--space-4)" }}>
                <AlertCircleIcon />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: "var(--space-4)" }}
            >
              {loading ? (
                <span className="loading">
                  <span className="spinner" />
                  {isRegister ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                isRegister ? "Create Account" : "Sign In"
              )}
            </button>
          </form>

          <div style={{ 
            marginTop: "var(--space-6)", 
            textAlign: "center",
            color: "var(--gray-400)"
          }}>
            {isRegister ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setIsRegister(false)}
                  style={{ 
                    background: "none", 
                    border: "none", 
                    color: "var(--primary-400)",
                    cursor: "pointer",
                    fontWeight: 500
                  }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to ChainShield?{" "}
                <button
                  onClick={() => setIsRegister(true)}
                  style={{ 
                    background: "none", 
                    border: "none", 
                    color: "var(--primary-400)",
                    cursor: "pointer",
                    fontWeight: 500
                  }}
                >
                  Create account
                </button>
              </>
            )}
          </div>

          {/* Demo credentials */}
          <div className="info-box" style={{ marginTop: "var(--space-6)" }}>
            <div style={{ fontSize: "0.8125rem" }}>
              <strong>Demo Admin Login:</strong><br />
              Email: <code>admin@chainshield.io</code><br />
              Password: <code>admin123</code>
            </div>
          </div>

          <div style={{ 
            marginTop: "var(--space-4)", 
            padding: "var(--space-3)",
            background: "rgba(234, 179, 8, 0.1)",
            border: "1px solid rgba(234, 179, 8, 0.3)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.75rem",
            color: "var(--warning-400)"
          }}>
            <strong>Note:</strong> This is a demo. User accounts are stored in memory and reset when the server restarts. 
            Only the admin account persists.
          </div>
        </div>
      </div>
    </div>
  );
}
