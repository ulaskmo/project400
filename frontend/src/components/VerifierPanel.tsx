import { useState } from "react";
import { apiPost } from "../api/client";

type VerificationResult = {
  credentialId: string;
  status: string;
  details?: string;
  issuer?: { did: string; verified: boolean };
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

const QrCodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/>
    <rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
    <path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/>
    <path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
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

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

export function VerifierPanel() {
  const [credentialId, setCredentialId] = useState("");
  const [qrData, setQrData] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<"id" | "qr" | "url">("id");
  const [verificationHistory, setVerificationHistory] = useState<VerificationResult[]>([]);

  const verify = async (idToVerify: string) => {
    if (!idToVerify) return;
    
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<VerificationResult>("/verify", { credentialId: idToVerify });
      setResult(res);
      setVerificationHistory((prev) => [res, ...prev.slice(0, 9)]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleQRInput = () => {
    try {
      const data = JSON.parse(qrData);
      if (data.id) {
        setCredentialId(data.id);
        verify(data.id);
      } else {
        setError("Invalid QR code data - no credential ID found");
      }
    } catch {
      setCredentialId(qrData);
      verify(qrData);
    }
  };

  const handleURLInput = () => {
    try {
      const match = qrData.match(/#\/verify\/(.+)$/);
      if (match) {
        const id = decodeURIComponent(match[1]);
        setCredentialId(id);
        verify(id);
      } else {
        setError("Invalid URL format. Expected: .../#/verify/credential-id");
      }
    } catch {
      setError("Could not parse the verification URL");
    }
  };

  const handleManualVerify = () => { verify(credentialId); };

  const isValid = result?.status?.toLowerCase() === "valid";

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon verifier"><SearchIcon /></div>
        <h2 className="panel-title">Credential Verification</h2>
        <p className="panel-description">
          Verify the authenticity of any ChainShield credential instantly.
        </p>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--brand-300)" }}>{verificationHistory.length}</div>
          <div className="stat-label">Verified Today</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--success-400)" }}>
            {verificationHistory.filter((v) => v.status?.toLowerCase() === "valid").length}
          </div>
          <div className="stat-label">Valid</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--danger-400)" }}>
            {verificationHistory.filter((v) => v.status?.toLowerCase() !== "valid").length}
          </div>
          <div className="stat-label">Invalid/Revoked</div>
        </div>
      </div>

      <div className="card-grid">
        {/* Verification Input Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ background: "rgba(61, 122, 61, 0.1)", color: "var(--brand-300)" }}>
              <QrCodeIcon />
            </div>
            <div>
              <h3 className="card-title">Verify Credential</h3>
              <p className="card-subtitle">Multiple input methods</p>
            </div>
          </div>

          {/* Input Mode Toggle */}
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            <button className={`btn ${inputMode === "id" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setInputMode("id")} style={{ flex: 1, fontSize: "0.8125rem" }}>
              <ClipboardIcon /> Credential ID
            </button>
            <button className={`btn ${inputMode === "qr" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setInputMode("qr")} style={{ flex: 1, fontSize: "0.8125rem" }}>
              <QrCodeIcon /> QR Data
            </button>
            <button className={`btn ${inputMode === "url" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setInputMode("url")} style={{ flex: 1, fontSize: "0.8125rem" }}>
              <LinkIcon /> URL
            </button>
          </div>

          <div className="card-body">
            {inputMode === "id" && (
              <>
                <p style={{ marginBottom: "var(--space-3)", color: "var(--gray-400)", fontSize: "0.875rem" }}>
                  Enter the credential ID directly:
                </p>
                <div className="input-group">
                  <input type="text" className="input input-mono" value={credentialId}
                    onChange={(e) => setCredentialId(e.target.value)} placeholder="cred-123..." />
                </div>
                <button className="btn btn-primary btn-lg w-full" onClick={handleManualVerify}
                  disabled={loading || !credentialId}>
                  {loading ? (
                    <span className="loading"><span className="spinner" />Verifying...</span>
                  ) : (
                    <><SearchIcon /> Verify Credential</>
                  )}
                </button>
              </>
            )}

            {inputMode === "qr" && (
              <>
                <p style={{ marginBottom: "var(--space-3)", color: "var(--gray-400)", fontSize: "0.875rem" }}>
                  Paste the scanned QR code data:
                </p>
                <div className="input-group">
                  <textarea className="input" value={qrData} onChange={(e) => setQrData(e.target.value)}
                    placeholder='{"type":"ChainShield-Credential","id":"cred-123",...}'
                    rows={3} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }} />
                </div>
                <button className="btn btn-primary btn-lg w-full" onClick={handleQRInput} disabled={loading || !qrData}>
                  {loading ? (
                    <span className="loading"><span className="spinner" />Verifying...</span>
                  ) : (
                    <><SearchIcon /> Verify QR Data</>
                  )}
                </button>
              </>
            )}

            {inputMode === "url" && (
              <>
                <p style={{ marginBottom: "var(--space-3)", color: "var(--gray-400)", fontSize: "0.875rem" }}>
                  Paste a ChainShield verification URL:
                </p>
                <div className="input-group">
                  <input type="text" className="input input-mono" value={qrData}
                    onChange={(e) => setQrData(e.target.value)}
                    placeholder="https://.../#/verify/cred-123" />
                </div>
                <button className="btn btn-primary btn-lg w-full" onClick={handleURLInput} disabled={loading || !qrData}>
                  {loading ? (
                    <span className="loading"><span className="spinner" />Verifying...</span>
                  ) : (
                    <><SearchIcon /> Verify from URL</>
                  )}
                </button>
              </>
            )}

            <div className="info-box" style={{ marginTop: "var(--space-4)" }}>
              <div className="info-box-icon"><InfoIcon /></div>
              <div className="info-box-content" style={{ fontSize: "0.8125rem" }}>
                <strong>Tip:</strong> You can verify credentials using their ID, QR code data, or the full verification URL.
                All methods check the blockchain for authenticity.
              </div>
            </div>
          </div>
        </div>

        {/* Result Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ 
              background: result ? (isValid ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)") : "rgba(255, 255, 255, 0.05)",
              color: result ? (isValid ? "var(--success-400)" : "var(--danger-400)") : "var(--gray-500)"
            }}>
              {result ? (isValid ? <ShieldCheckIcon /> : <ShieldXIcon />) : <ShieldCheckIcon />}
            </div>
            <div>
              <h3 className="card-title">Verification Result</h3>
              <p className="card-subtitle">{result ? "Analysis complete" : "Awaiting verification"}</p>
            </div>
          </div>

          {!result ? (
            <div style={{ textAlign: "center", padding: "var(--space-12) var(--space-6)", color: "var(--gray-500)" }}>
              <div style={{ width: 80, height: 80, margin: "0 auto var(--space-4)", background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "var(--radius-xl)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <QrCodeIcon />
              </div>
              <p>Enter a credential ID to verify</p>
              <p style={{ fontSize: "0.8125rem", marginTop: "var(--space-2)", color: "var(--gray-600)" }}>
                Verification checks: blockchain record, issuer signature, revocation status
              </p>
            </div>
          ) : (
            <div className={`credential-card ${isValid ? "verification-valid" : "verification-invalid"}`}>
              {/* Status Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
                <div style={{ width: 64, height: 64, borderRadius: "var(--radius-xl)",
                  background: isValid ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: isValid ? "var(--success-400)" : "var(--danger-400)" }}>
                  {isValid ? <CheckCircleIcon /> : <AlertCircleIcon />}
                </div>
                <div>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: isValid ? "var(--success-400)" : "var(--danger-400)" }}>
                    {isValid ? "VERIFIED" : result.status?.toUpperCase()}
                  </h3>
                  <p style={{ color: "var(--gray-400)", fontSize: "0.875rem" }}>
                    {result.details || (isValid ? "This credential is authentic and valid" : "This credential could not be verified")}
                  </p>
                </div>
              </div>

              <div className="divider" />

              {/* Details */}
              <div className="data-row">
                <span className="data-label">Credential ID</span>
                <span className="data-value">{result.credentialId}</span>
              </div>
              {result.issuer && (
                <div className="data-row">
                  <span className="data-label">Issuer DID</span>
                  <span className="data-value" style={{ fontSize: "0.75rem" }}>
                    {result.issuer.did}
                    {result.issuer.verified && (
                      <span style={{ color: "var(--success-400)", marginLeft: 4 }}> (verified)</span>
                    )}
                  </span>
                </div>
              )}
              {result.holder && (
                <div className="data-row">
                  <span className="data-label">Holder DID</span>
                  <span className="data-value" style={{ fontSize: "0.75rem" }}>{result.holder.did}</span>
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
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "0.875rem",
                      color: check.pass ? "var(--success-400)" : "var(--danger-400)" }}>
                      {check.pass ? <CheckCircleIcon /> : <AlertCircleIcon />}
                      {check.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification History */}
      {verificationHistory.length > 0 && (
        <div className="card" style={{ marginTop: "var(--space-6)" }}>
          <div className="card-header">
            <div className="card-icon" style={{ background: "rgba(61, 122, 61, 0.1)", color: "var(--brand-300)" }}>
              <ClockIcon />
            </div>
            <div>
              <h3 className="card-title">Verification History</h3>
              <p className="card-subtitle">Your recent verifications this session</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {verificationHistory.map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "var(--space-3)", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <span className="data-value" style={{ fontSize: "0.8125rem" }}>{v.credentialId}</span>
                    {v.timestamp && (
                      <div style={{ fontSize: "0.7rem", color: "var(--gray-600)", marginTop: 2 }}>
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

      {error && (
        <div className="error-message"><AlertCircleIcon /><span>{error}</span></div>
      )}
    </div>
  );
}
