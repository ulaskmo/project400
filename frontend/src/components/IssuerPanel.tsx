import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiPost, apiGet } from "../api/client";

type Credential = {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  status: string;
};

// Icons
const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
    <path d="M10 9H8"/>
    <path d="M16 13H8"/>
    <path d="M16 17H8"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/>
    <path d="M22 2 11 13"/>
  </svg>
);

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
    <path d="M12 10h.01"/><path d="M12 14h.01"/>
    <path d="M16 10h.01"/><path d="M16 14h.01"/>
    <path d="M8 10h.01"/><path d="M8 14h.01"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <path d="m9 11 3 3L22 4"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M3 21v-5h5"/>
  </svg>
);

const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="m15 9-6 6"/>
    <path d="m9 9 6 6"/>
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" x2="21" y1="6" y2="6"/>
    <line x1="8" x2="21" y1="12" y2="12"/>
    <line x1="8" x2="21" y1="18" y2="18"/>
    <line x1="3" x2="3.01" y1="6" y2="6"/>
    <line x1="3" x2="3.01" y1="12" y2="12"/>
    <line x1="3" x2="3.01" y1="18" y2="18"/>
  </svg>
);

export function IssuerPanel() {
  const { user } = useAuth();
  const [issuedCredentials, setIssuedCredentials] = useState<Credential[]>([]);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    holderDid: "",
    credentialId: `cred-${Date.now()}`,
    credentialType: "diploma",
  });

  useEffect(() => {
    loadIssuedCredentials();
  }, []);

  const loadIssuedCredentials = async () => {
    setLoadingList(true);
    try {
      const data = await apiGet<Credential[]>("/credentials/issued");
      setIssuedCredentials(data);
    } catch (e) {
      console.error("Failed to load issued credentials:", e);
    } finally {
      setLoadingList(false);
    }
  };

  const issueCredential = async () => {
    if (!formData.holderDid) {
      setError("Please enter the holder's DID");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const body = {
        credentialId: formData.credentialId,
        holderDid: formData.holderDid,
        ipfsHash: `Qm${btoa(formData.credentialId).slice(0, 40)}`,
        metadata: {
          type: formData.credentialType,
          issuedBy: user?.organizationName || user?.email,
        }
      };
      const res = await apiPost<Credential>("/credentials", body);
      setCredential(res);
      setFormData({
        ...formData,
        credentialId: `cred-${Date.now()}`,
        holderDid: "",
      });
      loadIssuedCredentials();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-icon issuer">
          <BuildingIcon />
        </div>
        <h2 className="panel-title">Credential Issuer Portal</h2>
        <p className="panel-description">
          Issue verifiable credentials to identity holders. Credentials are signed and anchored on blockchain.
        </p>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--success-400)" }}>{issuedCredentials.length}</div>
          <div className="stat-label">Total Issued</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--success-400)" }}>
            {issuedCredentials.filter(c => c.status === "valid").length}
          </div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--danger-400)" }}>
            {issuedCredentials.filter(c => c.status === "revoked").length}
          </div>
          <div className="stat-label">Revoked</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="card-grid">
        {/* Issue Credential Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--success-400)" }}>
              <SendIcon />
            </div>
            <div>
              <h3 className="card-title">Issue New Credential</h3>
              <p className="card-subtitle">Create and sign a credential</p>
            </div>
          </div>

          <div className="card-body">
            {/* Holder DID Input */}
            <div className="input-group">
              <label className="input-label">Holder's DID *</label>
              <input
                type="text"
                className="input input-mono"
                value={formData.holderDid}
                onChange={(e) => setFormData((f) => ({ ...f, holderDid: e.target.value }))}
                placeholder="did:chainshield:..."
              />
              <p style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: "var(--space-1)" }}>
                Get this from the credential holder
              </p>
            </div>

            {/* Credential Type */}
            <div className="input-group">
              <label className="input-label">Credential Type</label>
              <select
                className="input"
                value={formData.credentialType}
                onChange={(e) => setFormData((f) => ({ ...f, credentialType: e.target.value }))}
              >
                <option value="diploma">University Diploma</option>
                <option value="certificate">Professional Certificate</option>
                <option value="employment">Employment Verification</option>
                <option value="license">Professional License</option>
              </select>
            </div>

            {/* Credential ID */}
            <div className="input-group">
              <label className="input-label">Credential ID</label>
              <input
                type="text"
                className="input input-mono"
                value={formData.credentialId}
                onChange={(e) => setFormData((f) => ({ ...f, credentialId: e.target.value }))}
                placeholder="Unique identifier"
              />
            </div>

            {/* Issue Button */}
            <button
              className="btn btn-success btn-lg w-full"
              onClick={issueCredential}
              disabled={loading}
              style={{ marginTop: "var(--space-4)" }}
            >
              {loading ? (
                <span className="loading">
                  <span className="spinner" />
                  Issuing...
                </span>
              ) : (
                <>
                  <SendIcon />
                  Issue Credential
                </>
              )}
            </button>

            {/* Success Message */}
            {credential && (
              <div className="result-card success" style={{ marginTop: "var(--space-4)" }}>
                <div className="result-header">
                  <div className="result-icon success">
                    <CheckCircleIcon />
                  </div>
                  <div className="result-title">Credential Issued!</div>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--gray-400)" }}>
                  ID: {credential.credentialId}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="error-message" style={{ marginTop: "var(--space-4)" }}>
                <AlertCircleIcon />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Issued Credentials List */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary-400)" }}>
              <ListIcon />
            </div>
            <div style={{ flex: 1 }}>
              <h3 className="card-title">Issued Credentials</h3>
              <p className="card-subtitle">Credentials you've issued</p>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={loadIssuedCredentials}
              disabled={loadingList}
              style={{ padding: "var(--space-2) var(--space-3)" }}
            >
              <RefreshIcon />
            </button>
          </div>

          <div className="card-body" style={{ maxHeight: 400, overflowY: "auto" }}>
            {loadingList ? (
              <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
                <span className="loading">
                  <span className="spinner" />
                </span>
              </div>
            ) : issuedCredentials.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--gray-500)" }}>
                <FileIcon />
                <p style={{ marginTop: "var(--space-2)" }}>No credentials issued yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {issuedCredentials.map((cred) => (
                  <div 
                    key={cred.credentialId}
                    style={{
                      padding: "var(--space-3)",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid rgba(255,255,255,0.05)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ 
                          fontFamily: "var(--font-mono)", 
                          fontSize: "0.875rem",
                          color: "var(--gray-200)"
                        }}>
                          {cred.credentialId}
                        </div>
                        <div style={{ 
                          fontSize: "0.75rem", 
                          color: "var(--gray-500)",
                          marginTop: "var(--space-1)"
                        }}>
                          To: {cred.holderDid.slice(0, 25)}...
                        </div>
                      </div>
                      <span className={`status-badge ${cred.status === "valid" ? "valid" : "invalid"}`}>
                        <span className="status-dot" />
                        {cred.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <div className="info-box-icon">
          <InfoIcon />
        </div>
        <div className="info-box-content">
          <strong>How to issue a credential:</strong><br />
          1. Get the holder's DID (they can find it in their Identity Holder dashboard)<br />
          2. Select the credential type<br />
          3. Click "Issue Credential" - it will be signed with your issuer key and stored on blockchain
        </div>
      </div>
    </div>
  );
}
