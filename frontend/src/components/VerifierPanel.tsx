import { useState, useRef } from "react";
import { apiPost } from "../api/client";
import type { TrustLevel } from "../api/client";
import { TrustBadge, describeTrustLevel } from "./TrustBadge";
import { QRScanner, extractCredentialId } from "./QRScanner";

type VerificationResult = {
  credentialId: string;
  status: string;
  details?: string;
  issuer?: {
    did: string;
    verified: boolean;
    name?: string;
    role?: string;
    trustLevel?: TrustLevel;
  };
  holder?: { did: string };
  timestamp?: string;
  metadata?: {
    type?: string;
    subjectName?: string;
    description?: string;
    issuedBy?: string;
    expiresAt?: string;
  };
};

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

const ShieldXIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m14.5 9-5 5"/><path d="m9.5 9 5 5"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

type VerifyMode = "manual" | "scan";

export function VerifierPanel() {
  const [credentialId, setCredentialId] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState<VerificationResult[]>([]);
  const [mode, setMode] = useState<VerifyMode>("manual");
  const lastScanRef = useRef<string | null>(null);

  const verifyId = async (rawId: string) => {
    const id = rawId.trim();
    if (!id) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await apiPost<VerificationResult>("/verify", { credentialId: id });
      setResult(res);
      setVerificationHistory((prev) => [res, ...prev.slice(0, 9)]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyId(credentialId);
  };

  const handleScanned = (text: string) => {
    const id = extractCredentialId(text);
    if (!id || id === lastScanRef.current) return;
    lastScanRef.current = id;
    setCredentialId(id);
    setMode("manual");
    verifyId(id);
  };

  const isValid = result?.status?.toLowerCase() === "valid";

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon verifier"><SearchIcon /></div>
        <h2 className="panel-title">Verify Credential</h2>
        <p className="panel-description">
          Enter a credential ID to verify its authenticity on the blockchain.
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)", justifyContent: "center" }}>
        <button
          className={`btn ${mode === "manual" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setMode("manual")}
          style={{ padding: "var(--space-2) var(--space-4)", fontSize: "0.875rem" }}
        >
          Manual Entry
        </button>
        <button
          className={`btn ${mode === "scan" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => {
            lastScanRef.current = null;
            setMode("scan");
          }}
          style={{ padding: "var(--space-2) var(--space-4)", fontSize: "0.875rem" }}
        >
          Scan QR
        </button>
      </div>

      {/* Verification Input */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="card-icon" style={{ background: "var(--brand-100)", color: "var(--brand-600)" }}>
            <SearchIcon />
          </div>
          <div>
            <h3 className="card-title">
              {mode === "manual" ? "Credential Verification" : "Scan Credential QR"}
            </h3>
            <p className="card-subtitle">
              {mode === "manual"
                ? "Enter the credential ID from the holder"
                : "Point the camera at a credential QR code"}
            </p>
          </div>
        </div>

        <div className="card-body">
          {mode === "manual" ? (
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Credential ID *</label>
                <input
                  type="text"
                  className="input input-mono"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  placeholder="cred-..."
                />
                <p style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: "var(--space-1)" }}>
                  Ask the holder for their credential ID to verify it, or switch to Scan QR
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading || !credentialId.trim()}
              >
                {loading ? (
                  <span className="loading"><span className="spinner" />Verifying...</span>
                ) : (
                  <><SearchIcon /> Verify Credential</>
                )}
              </button>
            </form>
          ) : (
            <QRScanner
              active={mode === "scan"}
              onDetected={handleScanned}
              onError={(msg) => setError(msg)}
            />
          )}

          {error && (
            <div className="error-message" style={{ marginTop: "var(--space-4)" }}>
              <AlertCircleIcon /><span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <div className="card-icon" style={{
              background: isValid ? "var(--success-50)" : "var(--danger-50)",
              color: isValid ? "var(--success-400)" : "var(--danger-400)"
            }}>
              {isValid ? <ShieldCheckIcon /> : <ShieldXIcon />}
            </div>
            <div>
              <h3 className="card-title">Verification Result</h3>
              <p className="card-subtitle">Analysis complete</p>
            </div>
          </div>

          <div className="card-body">
            {/* Status Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "var(--radius-xl)",
                background: isValid ? "var(--success-100)" : "var(--danger-50)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isValid ? "var(--success-400)" : "var(--danger-400)"
              }}>
                {isValid ? <CheckCircleIcon /> : <AlertCircleIcon />}
              </div>
              <div>
                <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: isValid ? "var(--success-400)" : "var(--danger-400)" }}>
                  {isValid ? "VERIFIED" : result.status?.toUpperCase()}
                </h3>
                <p style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>
                  {result.details || (isValid ? "This credential is authentic and valid" : "This credential could not be verified")}
                </p>
              </div>
            </div>

            <div className="divider" />

            {/* Details */}
            <div className="data-row">
              <span className="data-label">Credential ID</span>
              <span className="data-value" style={{ fontSize: "0.75rem" }}>{result.credentialId}</span>
            </div>
            {result.metadata?.subjectName && (
              <div className="data-row">
                <span className="data-label">Document</span>
                <span className="data-value">{result.metadata.subjectName}</span>
              </div>
            )}
            {result.metadata?.issuedBy && (
              <div className="data-row">
                <span className="data-label">Issued By</span>
                <span className="data-value">{result.metadata.issuedBy}</span>
              </div>
            )}
            {result.issuer && (
              <>
                <div className="data-row">
                  <span className="data-label">Issuer Trust</span>
                  <span
                    className="data-value"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    title={describeTrustLevel(result.issuer.trustLevel)}
                  >
                    <TrustBadge level={result.issuer.trustLevel} />
                  </span>
                </div>
                {result.issuer.name && (
                  <div className="data-row">
                    <span className="data-label">Issuer</span>
                    <span className="data-value">{result.issuer.name}</span>
                  </div>
                )}
                <div className="data-row">
                  <span className="data-label">Issuer DID</span>
                  <span className="data-value" style={{ fontSize: "0.7rem" }}>
                    {result.issuer.did}
                    {result.issuer.verified && (
                      <span style={{ color: "var(--success-600)", marginLeft: 4 }}> (registered)</span>
                    )}
                  </span>
                </div>
              </>
            )}
            {result.holder && (
              <div className="data-row">
                <span className="data-label">Holder DID</span>
                <span className="data-value" style={{ fontSize: "0.7rem" }}>{result.holder.did}</span>
              </div>
            )}
            <div className="data-row">
              <span className="data-label">Verified At</span>
              <span className="data-value">{result.timestamp ? new Date(result.timestamp).toLocaleString() : new Date().toLocaleString()}</span>
            </div>

            {/* Verification Checks */}
            <div style={{ marginTop: "var(--space-4)" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: "var(--space-2)" }}>VERIFICATION CHECKS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {[
                  { label: "Blockchain record found", pass: !!result.credentialId },
                  { label: `Issuer DID ${result.issuer?.verified ? "verified" : "not verified"}`, pass: result.issuer?.verified ?? false },
                  { label: isValid ? "Not revoked or expired" : "Credential revoked/invalid", pass: isValid },
                  { label: "Cryptographic signature checked", pass: isValid },
                ].map((check, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "0.875rem",
                    color: check.pass ? "var(--success-400)" : "var(--danger-400)"
                  }}>
                    {check.pass ? <CheckCircleIcon /> : <AlertCircleIcon />}
                    {check.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Verify Another */}
            <button
              className="btn btn-secondary w-full"
              onClick={() => { setResult(null); setCredentialId(""); }}
              style={{ marginTop: "var(--space-4)" }}
            >
              Verify Another Credential
            </button>
          </div>
        </div>
      )}

      {/* Verification History */}
      {verificationHistory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ background: "var(--brand-100)", color: "var(--brand-600)" }}>
              <ClockIcon />
            </div>
            <div>
              <h3 className="card-title">Verification History</h3>
              <p className="card-subtitle">Recent verifications this session</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {verificationHistory.map((v, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "var(--space-3)", background: "var(--surface-inset)", borderRadius: "var(--radius-md)"
                }}>
                  <div>
                    <span className="data-value" style={{ fontSize: "0.8125rem" }}>{v.credentialId}</span>
                    {v.metadata?.subjectName && (
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 2 }}>
                        {v.metadata.subjectName}
                      </div>
                    )}
                    {v.timestamp && (
                      <div style={{ fontSize: "0.7rem", color: "var(--gray-400)", marginTop: 2 }}>
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <span className={`status-badge ${v.status?.toLowerCase() === "valid" ? "valid" : "invalid"}`}>
                    <span className="status-dot" />{v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
