import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { TechOrbit } from "./TechOrbit";

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

  if (score <= 1) return { score, label: "Weak", color: "var(--danger-500)" };
  if (score <= 2) return { score, label: "Fair", color: "var(--warning-500)" };
  if (score <= 3) return { score, label: "Good", color: "var(--brand-500)" };
  return { score, label: "Strong", color: "var(--success-600)" };
}

export function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendMode, setBackendMode] = useState<"demo" | "blockchain" | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [role, setRole] = useState<"holder" | "issuer" | "verifier">("holder");
  const [organizationName, setOrganizationName] = useState("");

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
        await register(email, password, role, (role !== "holder" && organizationName) ? organizationName : undefined);
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
    <div
      className="app-container"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="bg-animation" />

      <div
        className="login-shell"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 1200,
          padding: "var(--space-6)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: "var(--space-8)",
          alignItems: "center",
        }}
      >
        <style>{`
          @media (min-width: 960px) {
            .login-shell {
              grid-template-columns: minmax(0, 440px) minmax(0, 1fr) !important;
              gap: var(--space-10) !important;
            }
            .login-orbit {
              display: flex !important;
            }
          }
        `}</style>

        {/* Left column - form */}
        <div style={{ width: "100%", maxWidth: isRegister ? 440 : 400, justifySelf: "center" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <img src="/chainshield.png" alt="ChainShield"
            style={{ width: 140, height: "auto", margin: "0 auto var(--space-4)", display: "block", borderRadius: "var(--radius-lg)", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }} />
          <p style={{ color: "var(--gray-500)", fontSize: "0.6875rem", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
            Self-Sovereign Identity Platform
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "var(--space-8) var(--space-6)" }}>
          {/* Toggle tabs */}
          <div style={{
            display: "flex", marginBottom: "var(--space-6)",
            background: "var(--surface-inset)", borderRadius: "var(--radius-lg)", padding: 4
          }}>
            <button onClick={() => switchMode(false)} style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "var(--radius-md)",
              background: !isRegister ? "var(--brand-700)" : "transparent",
              color: !isRegister ? "#fff" : "var(--gray-500)",
              fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
              transition: "all 150ms ease", fontFamily: "inherit",
              boxShadow: !isRegister ? "var(--shadow-sm)" : "none"
            }}>
              Sign In
            </button>
            <button onClick={() => switchMode(true)} style={{
              flex: 1, padding: "10px", border: "none", borderRadius: "var(--radius-md)",
              background: isRegister ? "var(--brand-700)" : "transparent",
              color: isRegister ? "#fff" : "var(--gray-500)",
              fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
              transition: "all 150ms ease", fontFamily: "inherit",
              boxShadow: isRegister ? "var(--shadow-sm)" : "none"
            }}>
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Role — register only */}
            {isRegister && (
              <div className="input-group">
                <label className="input-label">I am registering as</label>
                <div style={{ display: "flex", gap: 4, background: "var(--surface-inset)", borderRadius: "var(--radius-md)", padding: 3 }}>
                  {([
                    { value: "holder" as const, label: "Holder", desc: "Store credentials" },
                    { value: "issuer" as const, label: "Issuer", desc: "Issue credentials" },
                    { value: "verifier" as const, label: "Verifier", desc: "Verify credentials" },
                  ]).map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setRole(opt.value)} style={{
                      flex: 1, padding: "8px 4px", border: "none", borderRadius: "var(--radius-sm)",
                      background: role === opt.value ? "var(--brand-700)" : "transparent",
                      color: role === opt.value ? "#fff" : "var(--gray-500)",
                      fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer",
                      transition: "all 150ms ease", fontFamily: "inherit",
                      boxShadow: role === opt.value ? "var(--shadow-sm)" : "none"
                    }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--gray-500)", marginTop: 4 }}>
                  {role === "holder" && "Store and manage your verifiable credentials"}
                  {role === "issuer" && "Issue credentials to holders (e.g. university, employer)"}
                  {role === "verifier" && "Verify credentials presented by holders"}
                </div>
              </div>
            )}

            {/* Organization Name — issuer/verifier only */}
            {isRegister && role !== "holder" && (
              <div className="input-group">
                <label className="input-label">Organization Name</label>
                <input type="text" className="input" value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={role === "issuer" ? "e.g., University of Dublin" : "e.g., VerifyTrust Ltd."}
                  required />
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
              {/* Forgot password — sign-in only */}
              {!isRegister && (
                <div style={{ marginTop: 6, textAlign: "right" }}>
                  <a href="#/forgot-password"
                    onClick={() => { window.location.hash = "/forgot-password"; }}
                    style={{
                      fontSize: "0.75rem", color: "var(--brand-600)",
                      textDecoration: "none", fontWeight: 500
                    }}>
                    Forgot password?
                  </a>
                </div>
              )}
              {/* Password strength — register only */}
              {isRegister && password.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength.score ? strength.color : "var(--gray-200)",
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
                color: "var(--gray-600)", lineHeight: 1.4
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
            <div style={{
              marginTop: "var(--space-5)", padding: "var(--space-3) var(--space-4)",
              background: "var(--brand-50)", borderRadius: "var(--radius-lg)",
              border: "1px solid var(--brand-200)"
            }}>
              <div style={{ fontSize: "0.75rem", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--gray-500)", fontWeight: 600, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Demo Credentials</span>
                  <button onClick={() => { setEmail("admin@chainshield.io"); setPassword("admin123"); }}
                    style={{
                      background: "var(--brand-700)",
                      border: "none",
                      color: "#fff", cursor: "pointer", fontSize: "0.6875rem",
                      padding: "3px 10px", borderRadius: "var(--radius-sm)", fontFamily: "inherit", fontWeight: 600
                    }}>
                    Auto-fill
                  </button>
                </div>
                <div style={{ marginTop: 6, color: "var(--gray-600)", fontFamily: "var(--font-mono)", fontSize: "0.6875rem" }}>
                  admin@chainshield.io / admin123
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mode indicator */}
        {backendMode && (
          <div style={{
            marginTop: "var(--space-5)", textAlign: "center",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: "0.6875rem", padding: "4px 12px",
              background: backendMode === "blockchain" ? "var(--brand-50)" : "var(--gray-100)",
              border: `1px solid ${backendMode === "blockchain" ? "var(--brand-200)" : "var(--gray-200)"}`,
              borderRadius: "var(--radius-full)",
              color: backendMode === "blockchain" ? "var(--brand-600)" : "var(--gray-500)",
              fontWeight: 500
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: backendMode === "blockchain" ? "var(--brand-500)" : "var(--gray-400)"
              }} />
              {backendMode === "blockchain" ? "Connected to Polygon Amoy" : "Demo Mode"}
            </span>
          </div>
        )}
        </div>

        {/* Right column - tech orbit (hidden on small screens) */}
        <div
          className="login-orbit"
          style={{
            display: "none",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-6)",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 520 }}>
            <p
              style={{
                color: "var(--gray-500)",
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 600,
                margin: 0,
                marginBottom: "var(--space-3)",
              }}
            >
              The ChainShield stack
            </p>
            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-0.02em",
                color: "var(--gray-900)",
              }}
            >
              Built on open standards
            </h2>
            <p
              style={{
                margin: "var(--space-3) auto 0",
                fontSize: "0.875rem",
                color: "var(--gray-600)",
                maxWidth: 440,
                lineHeight: 1.6,
              }}
            >
              ChainShield ties together{" "}
              <strong style={{ color: "var(--gray-900)", fontWeight: 600 }}>W3C Verifiable Credentials</strong>,{" "}
              <strong style={{ color: "var(--gray-900)", fontWeight: 600 }}>DIDs</strong>,{" "}
              <strong style={{ color: "var(--gray-900)", fontWeight: 600 }}>Ed25519 integrity proofs</strong>,{" "}
              <strong style={{ color: "var(--gray-900)", fontWeight: 600 }}>SSI principles</strong>, a{" "}
              <strong style={{ color: "var(--gray-900)", fontWeight: 600 }}>holder-owned wallet</strong>, and{" "}
              <strong style={{ color: "var(--gray-900)", fontWeight: 600 }}>blockchain anchoring</strong>{" "}
              — all orbiting a single identity.
            </p>
          </div>
          <TechOrbit />
        </div>
      </div>
    </div>
  );
}
