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

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XSmallIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: "Weak", color: "var(--danger-400)" };
  if (score <= 2) return { score, label: "Fair", color: "var(--warning-400)" };
  if (score <= 3) return { score, label: "Good", color: "var(--brand-400)" };
  return { score, label: "Strong", color: "var(--success-400)" };
}

export function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendMode, setBackendMode] = useState<"demo" | "blockchain" | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((d) => setBackendMode(d.mode || "demo"))
      .catch(() => setBackendMode("demo"));
  }, []);

  const switchMode = (mode: boolean) => {
    setIsRegister(mode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (!acceptedTerms) {
        setError("You must accept the terms to create an account");
        return;
      }
    }

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

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="bg-animation" />

      <div style={{
        position: "relative", zIndex: 10, width: "100%",
        maxWidth: isRegister ? 440 : 400, padding: "var(--space-6)"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <img src="/chainshield.png" alt="ChainShield"
            style={{ width: 160, height: "auto", margin: "0 auto var(--space-3)", display: "block", borderRadius: "var(--radius-lg)" }} />
          <p style={{ color: "var(--gray-500)", fontSize: "0.75rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Self-Sovereign Identity Platform
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          {/* Toggle tabs */}
          <div style={{
            display: "flex", marginBottom: "var(--space-5)",
            background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-md)", padding: 3
          }}>
            <button onClick={() => switchMode(false)} style={{
              flex: 1, padding: "var(--space-2)", border: "none", borderRadius: "var(--radius-sm)",
              background: !isRegister ? "var(--brand-700)" : "transparent",
              color: !isRegister ? "var(--ivory-100)" : "var(--gray-500)",
              fontWeight: 500, fontSize: "0.875rem", cursor: "pointer",
              transition: "all 150ms ease", fontFamily: "inherit"
            }}>
              Sign In
            </button>
            <button onClick={() => switchMode(true)} style={{
              flex: 1, padding: "var(--space-2)", border: "none", borderRadius: "var(--radius-sm)",
              background: isRegister ? "var(--brand-700)" : "transparent",
              color: isRegister ? "var(--ivory-100)" : "var(--gray-500)",
              fontWeight: 500, fontSize: "0.875rem", cursor: "pointer",
              transition: "all 150ms ease", fontFamily: "inherit"
            }}>
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Full Name — register only */}
            {isRegister && (
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                    color: "var(--gray-600)", width: 16, height: 16
                  }}>
                    <UserIcon />
                  </span>
                  <input type="text" className="input" value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe" required
                    style={{ paddingLeft: 34 }} />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--gray-600)", width: 16, height: 16
                }}>
                  <MailIcon />
                </span>
                <input type="email" className="input" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  style={{ paddingLeft: 34 }} />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--gray-600)", width: 16, height: 16
                }}>
                  <LockIcon />
                </span>
                <input type="password" className="input" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  style={{ paddingLeft: 34 }} />
              </div>
              {/* Password strength — register only */}
              {isRegister && password.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength.score ? strength.color : "rgba(255,255,255,0.06)",
                        transition: "background 200ms ease"
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: strength.color, fontWeight: 500 }}>
                    {strength.label}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password — register only */}
            {isRegister && (
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                    color: "var(--gray-600)", width: 16, height: 16
                  }}>
                    <LockIcon />
                  </span>
                  <input type="password" className="input" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" required minLength={6}
                    style={{
                      paddingLeft: 34,
                      borderColor: passwordsMismatch ? "var(--danger-400)" : passwordsMatch ? "var(--success-400)" : undefined
                    }} />
                  {/* Match indicator */}
                  {confirmPassword.length > 0 && (
                    <span style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      width: 16, height: 16,
                      color: passwordsMatch ? "var(--success-400)" : "var(--danger-400)"
                    }}>
                      {passwordsMatch ? <CheckIcon /> : <XSmallIcon />}
                    </span>
                  )}
                </div>
                {passwordsMismatch && (
                  <div style={{ fontSize: "0.6875rem", color: "var(--danger-400)", marginTop: 4 }}>
                    Passwords do not match
                  </div>
                )}
              </div>
            )}

            {/* Terms checkbox — register only */}
            {isRegister && (
              <label style={{
                display: "flex", alignItems: "flex-start", gap: "var(--space-2)",
                marginBottom: "var(--space-4)", cursor: "pointer", fontSize: "0.75rem",
                color: "var(--gray-400)", lineHeight: 1.4
              }}>
                <input type="checkbox" checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  style={{ marginTop: 2, accentColor: "var(--brand-500)" }} />
                <span>
                  I agree to the Terms of Service and Privacy Policy.
                  My identity data will be secured on the blockchain.
                </span>
              </label>
            )}

            {error && (
              <div className="error-message" style={{ marginBottom: "var(--space-3)" }}>
                <AlertCircleIcon />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full"
              disabled={loading || (isRegister && (!acceptedTerms || passwordsMismatch))}
              style={{ marginTop: "var(--space-2)" }}>
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

          {/* Demo credentials */}
          {!isRegister && (
            <div className="info-box" style={{ marginTop: "var(--space-5)" }}>
              <div style={{ fontSize: "0.75rem", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "var(--gray-300)" }}>Demo Login</strong>
                  <button onClick={() => { setEmail("admin@chainshield.io"); setPassword("admin123"); }}
                    style={{
                      background: "none", border: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--brand-400)", cursor: "pointer", fontSize: "0.6875rem",
                      padding: "2px 8px", borderRadius: "var(--radius-sm)", fontFamily: "inherit"
                    }}>
                    Auto-fill
                  </button>
                </div>
                <div style={{ marginTop: 4, color: "var(--gray-500)" }}>
                  <code>admin@chainshield.io</code> / <code>admin123</code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mode indicator */}
        {backendMode && (
          <div style={{
            marginTop: "var(--space-4)", textAlign: "center",
            fontSize: "0.6875rem", color: "var(--gray-600)"
          }}>
            {backendMode === "blockchain" ? (
              <span style={{ color: "var(--brand-400)" }}>Connected to Polygon Amoy</span>
            ) : (
              <span>Running in Demo Mode</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
