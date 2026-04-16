import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost } from "../api/client";
import { getVerificationUrl } from "../utils/url";

type Credential = {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  signature?: string;
  status: string;
  metadata?: {
    type?: string;
    subjectName?: string;
    description?: string;
    issuedBy?: string;
    expiresAt?: string;
  };
};

const generateQRCodeURL = (data: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
};

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
  </svg>
);

const FingerprintIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2"/>
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
    <path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M2 16h.01"/>
    <path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2"/>
  </svg>
);

const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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

const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const SELF_CREDENTIAL_TYPES = [
  { value: "certificate", label: "Certificate" },
  { value: "license", label: "License / Permit" },
  { value: "document", label: "Personal Document" },
  { value: "award", label: "Award / Achievement" },
  { value: "skill", label: "Skill / Competency" },
  { value: "membership", label: "Membership" },
  { value: "other", label: "Other" },
];

export function UserPanel() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [modalOpenedAt, setModalOpenedAt] = useState<number>(0);
  const [copiedDid, setCopiedDid] = useState(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingCredential, setAddingCredential] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [selfCredentialType, setSelfCredentialType] = useState("certificate");
  const [selfCredentialTitle, setSelfCredentialTitle] = useState("");
  const [selfCredentialDescription, setSelfCredentialDescription] = useState("");
  const [selfCredentialIssuedBy, setSelfCredentialIssuedBy] = useState("");
  const [selfCredentialDate, setSelfCredentialDate] = useState("");

  useEffect(() => {
    if (user?.did) {
      loadCredentials();
    }
  }, [user?.did]);

  const loadCredentials = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Credential[]>("/credentials/my");
      setCredentials(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelfIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCredential(true);
    setAddError(null);
    setAddSuccess(false);

    try {
      await apiPost("/credentials/self", {
        credentialType: selfCredentialType,
        credentialData: {
          title: selfCredentialTitle,
          description: selfCredentialDescription,
          issuedBy: selfCredentialIssuedBy || "Self-attested",
          dateIssued: selfCredentialDate || new Date().toISOString().split("T")[0],
        },
      });
      
      setAddSuccess(true);
      setSelfCredentialTitle("");
      setSelfCredentialDescription("");
      setSelfCredentialIssuedBy("");
      setSelfCredentialDate("");
      setSelfCredentialType("certificate");
      loadCredentials();
      
      setTimeout(() => {
        setShowAddForm(false);
        setAddSuccess(false);
      }, 2000);
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setAddingCredential(false);
    }
  };

  const copyDid = () => {
    if (user?.did) {
      navigator.clipboard.writeText(user.did);
      setCopiedDid(true);
      setTimeout(() => setCopiedDid(false), 2000);
    }
  };

  const isSelfAttested = (cred: Credential) => cred.issuerDid === cred.holderDid;
  const validCount = credentials.filter(c => c.status === "valid").length;
  const revokedCount = credentials.filter(c => c.status === "revoked").length;

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon"><FingerprintIcon /></div>
        <h2 className="panel-title">My Digital Identity</h2>
        <p className="panel-description">
          Welcome, {user?.email}! Your credentials are securely stored on the blockchain.
        </p>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--primary-400)", fontSize: "1rem", wordBreak: "break-all" }}>
            {user?.did ? `${user.did.slice(0, 20)}...` : "—"}
          </div>
          <div className="stat-label">Your DID</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{credentials.length}</div>
          <div className="stat-label">Credentials</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--success-400)" }}>{validCount}</div>
          <div className="stat-label">Valid</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--danger-400)" }}>{revokedCount}</div>
          <div className="stat-label">Revoked</div>
        </div>
      </div>

      {/* DID Card */}
      {user?.did && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <div className="card-icon"><FingerprintIcon /></div>
            <div style={{ flex: 1 }}>
              <h3 className="card-title">Your Decentralized Identifier</h3>
              <p className="card-subtitle">Share this with issuers to receive credentials</p>
            </div>
            <button className="btn btn-secondary" onClick={copyDid} style={{ padding: "var(--space-2) var(--space-3)" }}>
              <CopyIcon />
              {copiedDid ? "Copied!" : "Copy"}
            </button>
          </div>
          <div style={{ padding: "0 var(--space-6) var(--space-4)" }}>
            <code style={{ 
              fontSize: "0.8rem", 
              wordBreak: "break-all",
              background: "rgba(0,0,0,0.3)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              display: "block",
              fontFamily: "var(--font-mono)",
              color: "var(--primary-400)"
            }}>
              {user.did}
            </code>
          </div>
        </div>
      )}

      {/* Credentials Wallet */}
      <div className="card">
        <div className="card-header">
          <div className="card-icon" style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--accent-400)" }}>
            <WalletIcon />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="card-title">My Credentials Wallet</h3>
            <p className="card-subtitle">Credentials issued to your DID</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}
            style={{ padding: "var(--space-2) var(--space-3)", marginRight: "var(--space-2)" }}>
            <PlusIcon /> Add
          </button>
          <button className="btn btn-secondary" onClick={loadCredentials} disabled={loading}
            style={{ padding: "var(--space-2) var(--space-3)" }}>
            <RefreshIcon />
          </button>
        </div>

        {/* Self-Issue Form */}
        {showAddForm && (
          <div style={{ padding: "var(--space-4)", background: "rgba(59, 130, 246, 0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              <div className="card-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary-400)", width: 32, height: 32 }}>
                <UploadIcon />
              </div>
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: 600 }}>Add Your Own Credential</h4>
                <p style={{ fontSize: "0.8125rem", color: "var(--gray-500)" }}>Self-attest certificates, documents, or skills</p>
              </div>
            </div>

            <form onSubmit={handleSelfIssue}>
              <div style={{ display: "grid", gap: "var(--space-3)" }}>
                <div className="input-group">
                  <label className="input-label">Credential Type</label>
                  <select className="input" value={selfCredentialType} onChange={(e) => setSelfCredentialType(e.target.value)}>
                    {SELF_CREDENTIAL_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Title *</label>
                  <input type="text" className="input" placeholder="e.g., AWS Certified Solutions Architect"
                    value={selfCredentialTitle} onChange={(e) => setSelfCredentialTitle(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea className="input" placeholder="Brief description of this credential..."
                    value={selfCredentialDescription} onChange={(e) => setSelfCredentialDescription(e.target.value)}
                    rows={2} style={{ resize: "vertical" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="input-group">
                    <label className="input-label">Issued By</label>
                    <input type="text" className="input" placeholder="e.g., Amazon Web Services"
                      value={selfCredentialIssuedBy} onChange={(e) => setSelfCredentialIssuedBy(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Date Issued</label>
                    <input type="date" className="input" value={selfCredentialDate}
                      onChange={(e) => setSelfCredentialDate(e.target.value)} />
                  </div>
                </div>
              </div>

              {addError && (
                <div className="error-message" style={{ marginTop: "var(--space-3)" }}>
                  <AlertCircleIcon /><span>{addError}</span>
                </div>
              )}
              {addSuccess && (
                <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: "rgba(34, 197, 94, 0.1)",
                  borderRadius: "var(--radius-md)", color: "var(--success-400)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <ShieldCheckIcon /> Credential added successfully!
                </div>
              )}

              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
                <button type="submit" className="btn btn-primary" disabled={addingCredential || !selfCredentialTitle}>
                  {addingCredential ? (
                    <span className="loading"><span className="spinner" />Adding...</span>
                  ) : (
                    <><UploadIcon /> Add Credential</>
                  )}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddForm(false); setAddError(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
              <span className="loading"><span className="spinner" />Loading credentials...</span>
            </div>
          ) : credentials.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--gray-500)" }}>
              <div style={{ width: 60, height: 60, margin: "0 auto var(--space-4)", background: "rgba(255,255,255,0.03)",
                borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileIcon />
              </div>
              <p>No credentials yet</p>
              <p style={{ fontSize: "0.875rem", marginTop: "var(--space-2)" }}>
                Credentials issued to you will appear here, or add your own.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {credentials.map((cred) => (
                <div key={cred.credentialId} className="credential-card" style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSelectedCredential(cred);
                    setModalOpenedAt(Date.now());
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          color: isSelfAttested(cred) ? "var(--accent-400)" : "var(--primary-400)", 
                          fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>
                          {isSelfAttested(cred) ? "Self-Attested" : cred.metadata?.type || "Verifiable Credential"}
                        </span>
                        {isSelfAttested(cred) && (
                          <span style={{ fontSize: "0.625rem", padding: "2px 6px", background: "rgba(139, 92, 246, 0.2)",
                            borderRadius: "var(--radius-sm)", color: "var(--accent-300)" }}>BY YOU</span>
                        )}
                      </div>
                      {cred.metadata?.subjectName && (
                        <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--gray-100)", marginBottom: 2 }}>
                          {cred.metadata.subjectName}
                        </div>
                      )}
                      {cred.metadata?.description && (
                        <div style={{ fontSize: "0.8125rem", color: "var(--gray-400)", marginBottom: 2 }}>
                          {cred.metadata.description}
                        </div>
                      )}
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--gray-500)" }}>
                        {cred.credentialId}
                      </div>
                    </div>
                    <span className={`status-badge ${cred.status === "valid" ? "valid" : "invalid"}`}>
                      <span className="status-dot" />{cred.status}
                    </span>
                  </div>
                  <div style={{ marginTop: "var(--space-3)", fontSize: "0.8125rem", color: "var(--gray-500)" }}>
                    {isSelfAttested(cred) 
                      ? "Added by you" 
                      : `Issued by: ${cred.metadata?.issuedBy || cred.issuerDid.slice(0, 30) + "..."}`}
                  </div>
                  <div style={{ marginTop: "var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)",
                    color: "var(--primary-400)", fontSize: "0.875rem" }}>
                    <QrCodeIcon /> Click to view details & QR code
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Credential Detail Modal - only close when clicking the dark backdrop, not the card */}
      {selectedCredential && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Credential QR Code"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "var(--space-4)",
          }}
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            if (Date.now() - modalOpenedAt < 400) return;
            setSelectedCredential(null);
          }}
        >
          <div
            className="card"
            style={{ maxWidth: 460, width: "100%", animation: "fadeIn 0.2s ease", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div className="card-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary-400)" }}>
                <QrCodeIcon />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="card-title">Credential Details</h3>
                <p className="card-subtitle">Scan QR to verify</p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedCredential(null)}
                style={{ padding: "var(--space-2)" }}
                aria-label="Close"
              >
                <XIcon />
              </button>
            </div>

            <div style={{ textAlign: "center", padding: "var(--space-4)" }}>
              <img src={generateQRCodeURL(getVerificationUrl(selectedCredential.credentialId))}
                alt="Credential QR Code"
                style={{ width: 200, height: 200, borderRadius: "var(--radius-lg)", background: "white", padding: "var(--space-2)" }} />
              <p style={{ marginTop: "var(--space-3)", fontSize: "0.75rem", color: "var(--gray-500)", wordBreak: "break-all" }}>
                {getVerificationUrl(selectedCredential.credentialId)}
              </p>
            </div>

            <div className="divider" />

            <div style={{ padding: "0 var(--space-4) var(--space-4)" }}>
              <div className="data-row">
                <span className="data-label">Credential ID</span>
                <span className="data-value" style={{ fontSize: "0.75rem" }}>{selectedCredential.credentialId}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Status</span>
                <span className={`status-badge ${selectedCredential.status === "valid" ? "valid" : "invalid"}`}>
                  <span className="status-dot" />{selectedCredential.status}
                </span>
              </div>
              <div className="data-row">
                <span className="data-label">Type</span>
                <span className="data-value">
                  {isSelfAttested(selectedCredential) ? "Self-Attested" : selectedCredential.metadata?.type || "Verifiable Credential"}
                </span>
              </div>
              {selectedCredential.metadata?.subjectName && (
                <div className="data-row">
                  <span className="data-label">Subject</span>
                  <span className="data-value">{selectedCredential.metadata.subjectName}</span>
                </div>
              )}
              {selectedCredential.metadata?.description && (
                <div className="data-row">
                  <span className="data-label">Description</span>
                  <span className="data-value" style={{ fontSize: "0.75rem" }}>{selectedCredential.metadata.description}</span>
                </div>
              )}
              <div className="data-row">
                <span className="data-label">Issuer</span>
                <span className="data-value" style={{ fontSize: "0.75rem" }}>
                  {selectedCredential.metadata?.issuedBy || selectedCredential.issuerDid}
                </span>
              </div>
              {selectedCredential.metadata?.expiresAt && (
                <div className="data-row">
                  <span className="data-label">Expires</span>
                  <span className="data-value">{selectedCredential.metadata.expiresAt}</span>
                </div>
              )}
              <div className="data-row">
                <span className="data-label">IPFS Hash</span>
                <span className="data-value" style={{ fontSize: "0.7rem" }}>{selectedCredential.ipfsHash}</span>
              </div>
            </div>

            <div className="info-box" style={{ margin: "0 var(--space-4) var(--space-4)" }}>
              <div className="info-box-icon"><InfoIcon /></div>
              <div className="info-box-content" style={{ fontSize: "0.8125rem" }}>
                <strong>Anyone can verify!</strong> Share this QR code or link. When scanned, it opens a public verification page - no login required.
                {window.location.origin.includes("localhost") && (
                  <p style={{ marginTop: "var(--space-2)", fontSize: "0.75rem", opacity: 0.9 }}>
                    <strong>Phone scanning:</strong> Use ngrok (<code>ngrok http 5173</code>) or deploy the app, then set VITE_APP_URL in .env.local to your public URL.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="divider" />
      
      <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "var(--space-2)" }}>Your Identity, Your Control</h3>
        <p style={{ color: "var(--gray-400)" }}>ChainShield gives you complete ownership of your digital identity</p>
      </div>

      <div className="feature-grid">
        <div className="feature-item">
          <div className="feature-icon"><WalletIcon /></div>
          <div className="feature-content">
            <h4>Self-Custody</h4>
            <p>Your credentials are tied to your unique DID that only you control.</p>
          </div>
        </div>
        <div className="feature-item">
          <div className="feature-icon"><ShieldCheckIcon /></div>
          <div className="feature-content">
            <h4>Share with QR</h4>
            <p>Generate QR codes to share credentials with verifiers securely.</p>
          </div>
        </div>
        <div className="feature-item">
          <div className="feature-icon"><LockIcon /></div>
          <div className="feature-content">
            <h4>Privacy First</h4>
            <p>Verifiers confirm validity without accessing your personal data.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message"><AlertCircleIcon /><span>{error}</span></div>
      )}
    </div>
  );
}
