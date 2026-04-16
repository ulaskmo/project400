import { useState, useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

function getPasswordStrength(pw: string) {
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

export function ResetPasswordPage() {
  const token = useMemo(() => {
    const hash = window.location.hash;
    const q = hash.includes("?") ? hash.substring(hash.indexOf("?") + 1) : "";
    return new URLSearchParams(q).get("token") || "";
  }, []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Could not reset password");
      }
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    window.location.hash = "";
    window.location.reload();
  };

  return (
    <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="bg-animation" />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420, padding: "var(--space-6)" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <img src="/chainshield.png" alt="ChainShield"
            style={{ width: 120, height: "auto", margin: "0 auto var(--space-4)", display: "block", borderRadius: "var(--radius-lg)", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }} />
          <p style={{ color: "var(--gray-500)", fontSize: "0.6875rem", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
            Choose a new password
          </p>
        </div>

        <div className="card" style={{ padding: "var(--space-8) var(--space-6)" }}>
          {!token ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.1)", color: "var(--danger-500)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto var(--space-4) auto"
              }}>
                <span style={{ width: 28, height: 28 }}><AlertCircleIcon /></span>
              </div>
              <h2 style={{ margin: "0 0 var(--space-2) 0", fontSize: "1.25rem", color: "var(--gray-900)" }}>
                Invalid reset link
              </h2>
              <p style={{ color: "var(--gray-600)", fontSize: "0.875rem", margin: "0 0 var(--space-5) 0" }}>
                This link is missing a reset token. Please request a new one.
              </p>
              <button onClick={() => { window.location.hash = "/forgot-password"; }}
                className="btn btn-primary btn-lg w-full">
                Request new link
              </button>
            </div>
          ) : success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "var(--success-50, #ecfdf5)", color: "var(--success-600)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto var(--space-4) auto"
              }}>
                <span style={{ width: 28, height: 28 }}><CheckCircleIcon /></span>
              </div>
              <h2 style={{ margin: "0 0 var(--space-2) 0", fontSize: "1.25rem", color: "var(--gray-900)" }}>
                Password updated
              </h2>
              <p style={{ color: "var(--gray-600)", fontSize: "0.875rem", margin: "0 0 var(--space-5) 0" }}>
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <button onClick={goToLogin} className="btn btn-primary btn-lg w-full">
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ margin: "0 0 var(--space-2) 0", fontSize: "1.25rem", color: "var(--gray-900)" }}>
                Set a new password
              </h2>
              <p style={{ color: "var(--gray-600)", fontSize: "0.875rem", margin: "0 0 var(--space-5) 0" }}>
                Choose a strong password that you don't use elsewhere.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label className="input-label">New Password</label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                      color: "var(--gray-600)", width: 16, height: 16
                    }}>
                      <LockIcon />
                    </span>
                    <input type="password" className="input" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" required minLength={6} autoFocus
                      style={{ paddingLeft: 34 }} />
                  </div>
                  {password.length > 0 && (
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

                <div className="input-group">
                  <label className="input-label">Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                      color: "var(--gray-600)", width: 16, height: 16
                    }}>
                      <LockIcon />
                    </span>
                    <input type="password" className="input" value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••" required minLength={6}
                      style={{
                        paddingLeft: 34,
                        borderColor: passwordsMismatch ? "var(--danger-400)" : passwordsMatch ? "var(--success-400)" : undefined
                      }} />
                    {confirm.length > 0 && (
                      <span style={{
                        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                        width: 16, height: 16,
                        color: passwordsMatch ? "var(--success-400)" : "var(--danger-400)"
                      }}>
                        {passwordsMatch ? <CheckIcon /> : <XSmallIcon />}
                      </span>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="error-message" style={{ marginBottom: "var(--space-3)" }}>
                    <AlertCircleIcon />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-lg w-full"
                  disabled={loading || passwordsMismatch || password.length < 6}
                  style={{ marginTop: "var(--space-2)" }}>
                  {loading ? (
                    <span className="loading"><span className="spinner" />Updating password...</span>
                  ) : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
