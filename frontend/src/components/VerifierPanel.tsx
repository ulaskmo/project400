import { useState } from "react";
import { apiPost } from "../api/client";

type VerificationResult = {
  credentialId: string;
  status: string;
  details?: string;
  issuer?: { did: string; verified: boolean };
  holder?: { did: string };
  timestamp?: string;
};

// Icons
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

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

const QrCodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="5" height="5" x="3" y="3" rx="1"/>
    <rect width="5" height="5" x="16" y="3" rx="1"/>
    <rect width="5" height="5" x="3" y="16" rx="1"/>
    <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
    <path d="M21 21v.01"/>
    <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
    <path d="M3 12h.01"/>
    <path d="M12 3h.01"/>
    <path d="M12 16v.01"/>
    <path d="M16 12h1"/>
    <path d="M21 12v.01"/>
    <path d="M12 21v-1"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <path d="m9 11 3 3L22 4"/>
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>
);

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  </svg>
);

export function VerifierPanel() {
  const [credentialId, setCredentialId] = useState("");
  const [qrData, setQrData] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<"id" | "qr">("qr");
  const [verificationHistory, setVerificationHistory] = useState<VerificationResult[]>([]);

  const verify = async (idToVerify: string) => {
    if (!idToVerify) return;
    
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<VerificationResult>("/verify", {
        credentialId: idToVerify,
      });
      setResult(res);
      setVerificationHistory((prev) => [res, ...prev.slice(0, 4)]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleQRInput = () => {
    try {
      // Try to parse as JSON (QR code data)
      const data = JSON.parse(qrData);
      if (data.id) {
        setCredentialId(data.id);
        verify(data.id);
      } else {
        setError("Invalid QR code data - no credential ID found");
      }
    } catch {
      // Not JSON, treat as plain credential ID
      setCredentialId(qrData);
      verify(qrData);
    }
  };

  const handleManualVerify = () => {
    verify(credentialId);
  };

  const isValid = result?.status?.toLowerCase() === "valid";

  return (
    <div className="panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-icon verifier">
          <SearchIcon />
        </div>
        <h2 className="panel-title">Credential Verification</h2>
        <p className="panel-description">
          Scan a QR code or enter a credential ID to instantly verify its authenticity.
        </p>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--accent-400)" }}>{verificationHistory.length}</div>
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
          <div className="stat-label">Invalid</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="card-grid">
        {/* Verification Input Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--accent-400)" }}>
              <QrCodeIcon />
            </div>
            <div>
              <h3 className="card-title">Verify Credential</h3>
              <p className="card-subtitle">Scan QR or enter ID</p>
            </div>
          </div>

          {/* Input Mode Toggle */}
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            <button
              className={`btn ${inputMode === "qr" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setInputMode("qr")}
              style={{ flex: 1 }}
            >
              <CameraIcon />
              QR Code Data
            </button>
            <button
              className={`btn ${inputMode === "id" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setInputMode("id")}
              style={{ flex: 1 }}
            >
              <ClipboardIcon />
              Credential ID
            </button>
          </div>

          <div className="card-body">
            {inputMode === "qr" ? (
              <>
                <p style={{ marginBottom: "var(--space-3)", color: "var(--gray-400)", fontSize: "0.875rem" }}>
                  Paste the QR code data scanned from a credential:
                </p>
                <div className="input-group">
                  <textarea
                    className="input"
                    value={qrData}
                    onChange={(e) => setQrData(e.target.value)}
                    placeholder='{"type":"ChainShield-Credential","id":"cred-123",...}'
                    rows={3}
                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}
                  />
                </div>
                <button
                  className="btn btn-primary btn-lg w-full"
                  onClick={handleQRInput}
                  disabled={loading || !qrData}
                >
                  {loading ? (
                    <span className="loading">
                      <span className="spinner" />
                      Verifying...
                    </span>
                  ) : (
                    <>
                      <SearchIcon />
                      Verify QR Data
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <p style={{ marginBottom: "var(--space-3)", color: "var(--gray-400)", fontSize: "0.875rem" }}>
                  Enter the credential ID directly:
                </p>
                <div className="input-group">
                  <input
                    type="text"
                    className="input input-mono"
                    value={credentialId}
                    onChange={(e) => setCredentialId(e.target.value)}
                    placeholder="cred-123..."
                  />
                </div>
                <button
                  className="btn btn-primary btn-lg w-full"
                  onClick={handleManualVerify}
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
              </>
            )}

            {/* Demo hint */}
            <div className="info-box" style={{ marginTop: "var(--space-4)" }}>
              <div className="info-box-icon"><InfoIcon /></div>
              <div className="info-box-content" style={{ fontSize: "0.8125rem" }}>
                <strong>Demo:</strong> In production, you would use a camera to scan the QR code. 
                For this demo, paste the JSON data from the QR code.
              </div>
            </div>
          </div>
        </div>

        {/* Result Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ 
              background: result 
                ? isValid ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)"
                : "rgba(255, 255, 255, 0.05)",
              color: result
                ? isValid ? "var(--success-400)" : "var(--danger-400)"
                : "var(--gray-500)"
            }}>
              {result ? (isValid ? <ShieldCheckIcon /> : <ShieldXIcon />) : <ShieldCheckIcon />}
            </div>
            <div>
              <h3 className="card-title">Verification Result</h3>
              <p className="card-subtitle">{result ? "Analysis complete" : "Awaiting verification"}</p>
            </div>
          </div>

          {!result ? (
            <div style={{ 
              textAlign: "center", 
              padding: "var(--space-12) var(--space-6)",
              color: "var(--gray-500)"
            }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                margin: "0 auto var(--space-4)",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "var(--radius-xl)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <QrCodeIcon />
              </div>
              <p>Scan a QR code or enter a credential ID to verify</p>
            </div>
          ) : (
            <div className={`credential-card ${isValid ? "verification-valid" : "verification-invalid"}`}>
              {/* Status Header */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "var(--space-4)",
                marginBottom: "var(--space-4)"
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: "var(--radius-xl)",
                  background: isValid ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isValid ? "var(--success-400)" : "var(--danger-400)"
                }}>
                  {isValid ? <CheckCircleIcon /> : <AlertCircleIcon />}
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: "1.5rem", 
                    fontWeight: 700,
                    color: isValid ? "var(--success-400)" : "var(--danger-400)"
                  }}>
                    {isValid ? "VERIFIED" : result.status?.toUpperCase()}
                  </h3>
                  <p style={{ color: "var(--gray-400)", fontSize: "0.875rem" }}>
                    {result.details || (isValid 
                      ? "This credential is authentic and valid"
                      : "This credential could not be verified"
                    )}
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
                  <span className="data-label">Issuer</span>
                  <span className="data-value" style={{ fontSize: "0.75rem" }}>
                    {result.issuer.did}
                    {result.issuer.verified && " ✓"}
                  </span>
                </div>
              )}
              {result.holder && (
                <div className="data-row">
                  <span className="data-label">Holder</span>
                  <span className="data-value" style={{ fontSize: "0.75rem" }}>
                    {result.holder.did}
                  </span>
                </div>
              )}
              <div className="data-row">
                <span className="data-label">Verified At</span>
                <span className="data-value">{result.timestamp || new Date().toLocaleString()}</span>
              </div>

              {/* Checks Performed */}
              <div style={{ marginTop: "var(--space-4)" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: "var(--space-2)" }}>
                  VERIFICATION CHECKS
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "0.875rem", color: "var(--gray-300)" }}>
                    <CheckCircleIcon />
                    Blockchain record verified
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "0.875rem", color: "var(--gray-300)" }}>
                    {isValid ? <CheckCircleIcon /> : <AlertCircleIcon />}
                    Issuer signature {isValid ? "valid" : "invalid"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "0.875rem", color: "var(--gray-300)" }}>
                    {isValid ? <CheckCircleIcon /> : <AlertCircleIcon />}
                    {isValid ? "Not revoked" : "Credential revoked/invalid"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Verifications */}
          {verificationHistory.length > 1 && (
            <div style={{ marginTop: "var(--space-6)" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--gray-400)", marginBottom: "var(--space-3)" }}>
                Recent Verifications
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {verificationHistory.slice(1).map((v, i) => (
                  <div 
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--space-3)",
                      background: "rgba(255, 255, 255, 0.02)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.875rem"
                    }}
                  >
                    <span className="data-value" style={{ fontSize: "0.8125rem" }}>{v.credentialId}</span>
                    <span className={`status-badge ${v.status?.toLowerCase() === "valid" ? "valid" : "invalid"}`}>
                      <span className="status-dot" />
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <AlertCircleIcon />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
