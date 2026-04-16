import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
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

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not send reset email");
      }
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="bg-animation" />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420, padding: "var(--space-6)" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <img src="/chainshield.png" alt="ChainShield"
            style={{ width: 120, height: "auto", margin: "0 auto var(--space-4)", display: "block", borderRadius: "var(--radius-lg)", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }} />
          <p style={{ color: "var(--gray-500)", fontSize: "0.6875rem", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
            Password Recovery
          </p>
        </div>

        <div className="card" style={{ padding: "var(--space-8) var(--space-6)" }}>
          {sent ? (
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
                Check your email
              </h2>
              <p style={{ color: "var(--gray-600)", fontSize: "0.875rem", lineHeight: 1.5, margin: "0 0 var(--space-5) 0" }}>
                If an account exists for <strong>{email}</strong>, we sent a password reset link to it.
                It expires in 1 hour.
              </p>
              <p style={{ color: "var(--gray-500)", fontSize: "0.75rem", margin: "0 0 var(--space-5) 0" }}>
                Didn't get it? Check your spam folder, or try again in a minute.
              </p>
              <a href="#/" onClick={() => { window.location.hash = ""; }}
                className="btn btn-primary btn-lg w-full"
                style={{ textDecoration: "none", display: "inline-flex", justifyContent: "center" }}>
                Back to sign in
              </a>
            </div>
          ) : (
            <>
              <h2 style={{ margin: "0 0 var(--space-2) 0", fontSize: "1.25rem", color: "var(--gray-900)" }}>
                Forgot your password?
              </h2>
              <p style={{ color: "var(--gray-600)", fontSize: "0.875rem", lineHeight: 1.5, margin: "0 0 var(--space-5) 0" }}>
                Enter the email address for your account and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit}>
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
                      placeholder="you@example.com" required autoFocus
                      style={{ paddingLeft: 34 }} />
                  </div>
                </div>

                {error && (
                  <div className="error-message" style={{ marginBottom: "var(--space-3)" }}>
                    <AlertCircleIcon />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}
                  style={{ marginTop: "var(--space-2)" }}>
                  {loading ? (
                    <span className="loading"><span className="spinner" />Sending link...</span>
                  ) : "Send reset link"}
                </button>
              </form>

              <div style={{ marginTop: "var(--space-5)", textAlign: "center", fontSize: "0.8125rem" }}>
                <a href="#/" onClick={() => { window.location.hash = ""; }}
                  style={{ color: "var(--brand-600)", textDecoration: "none", fontWeight: 500 }}>
                  ← Back to sign in
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
