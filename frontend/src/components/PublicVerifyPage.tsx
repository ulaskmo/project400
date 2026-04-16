import { useState, useEffect } from "react";

type VerificationResult = {
  verified: boolean;
  credentialId: string;
  status: string;
  message?: string;
  issuer?: string;
  verifiedAt?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// Icons
const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const ShieldXIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
    <path d="m14.5 9-5 5"/>
    <path d="m9.5 9 5 5"/>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

interface PublicVerifyPageProps {
  credentialId?: string;
}

export function PublicVerifyPage({ credentialId: initialId }: PublicVerifyPageProps) {
  const [credentialId, setCredentialId] = useState(initialId || "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-verify if credentialId is provided
  useEffect(() => {
    if (initialId) {
      verify(initialId);
    }
  }, [initialId]);

  const verify = async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/verify/${encodeURIComponent(id)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Verification failed");
      }
      
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify(credentialId);
  };

  return (
    <div className="app-container" style={{ minHeight: "100vh" }}>
      <div className="bg-animation" />
      
      <div style={{ 
        position: "relative", 
        zIndex: 10, 
        maxWidth: 500,
        margin: "0 auto",
        padding: "var(--space-6)"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)", paddingTop: "var(--space-8)" }}>
          <img src="/chainshield.png" alt="ChainShield"
            style={{ width: 140, height: "auto", margin: "0 auto var(--space-4)", display: "block", borderRadius: "var(--radius-lg)" }} />
          <h1 style={{ 
            fontSize: "1.75rem", 
            fontWeight: 700,
            color: "var(--gray-100)",
            marginBottom: "var(--space-2)"
          }}>
            Credential Verification
          </h1>
          <p style={{ color: "var(--gray-400)" }}>
            Verify the authenticity of a ChainShield credential
          </p>
        </div>

        {/* Verification Form */}
        {!result && (
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Credential ID</label>
                <input
                  type="text"
                  className="input input-mono"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  placeholder="Enter credential ID..."
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading || !credentialId}
              >
                {loading ? (
                  <span className="loading">
                    <span className="spinner" />
                    Verifying...
                  </span>
                ) : (
                  <>
                    <SearchIcon />
                    Verify Credential
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="error-message" style={{ marginTop: "var(--space-4)" }}>
                <AlertCircleIcon />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`card ${result.verified ? "verification-valid" : "verification-invalid"}`}
            style={{ 
              borderColor: result.verified ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
              background: result.verified ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)"
            }}
          >
            {/* Big Status */}
            <div style={{ textAlign: "center", padding: "var(--space-6) 0" }}>
              <div style={{
                width: 100,
                height: 100,
                margin: "0 auto var(--space-4)",
                borderRadius: "50%",
                background: result.verified ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: result.verified ? "var(--success-400)" : "var(--danger-400)"
              }}>
                {result.verified ? <ShieldCheckIcon /> : <ShieldXIcon />}
              </div>
              
              <h2 style={{ 
                fontSize: "2rem", 
                fontWeight: 700,
                color: result.verified ? "var(--success-400)" : "var(--danger-400)",
                marginBottom: "var(--space-2)"
              }}>
                {result.verified ? "VERIFIED" : "NOT VERIFIED"}
              </h2>
              
              <p style={{ color: "var(--gray-400)" }}>
                {result.message || (result.verified 
                  ? "This credential is authentic and valid"
                  : "This credential could not be verified"
                )}
              </p>
            </div>

            <div className="divider" />

            {/* Details */}
            <div style={{ padding: "var(--space-4) 0" }}>
              <div className="data-row">
                <span className="data-label">Credential ID</span>
                <span className="data-value">{result.credentialId}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Status</span>
                <span className={`status-badge ${result.verified ? "valid" : "invalid"}`}>
                  <span className="status-dot" />
                  {result.status}
                </span>
              </div>
              {result.issuer && (
                <div className="data-row">
                  <span className="data-label">Issuer</span>
                  <span className="data-value" style={{ fontSize: "0.75rem" }}>{result.issuer}</span>
                </div>
              )}
              <div className="data-row">
                <span className="data-label">Verified At</span>
                <span className="data-value">{new Date(result.verifiedAt || Date.now()).toLocaleString()}</span>
              </div>
            </div>

            {/* Verify Another */}
            <button
              className="btn btn-secondary w-full"
              onClick={() => {
                setResult(null);
                setCredentialId("");
              }}
              style={{ marginTop: "var(--space-4)" }}
            >
              Verify Another Credential
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          textAlign: "center", 
          marginTop: "var(--space-8)",
          color: "var(--gray-500)",
          fontSize: "0.875rem"
        }}>
          <p>Powered by <strong style={{ color: "var(--brand-400)" }}>ChainShield</strong></p>
          <p style={{ fontSize: "0.75rem", marginTop: "var(--space-1)" }}>
            Blockchain-secured credential verification
          </p>
        </div>
      </div>
    </div>
  );
}
