import { useState, useEffect, useRef } from "react";
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

// Icons
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

const PaperclipIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const ChevronUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6"/>
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
  const [expandedCredId, setExpandedCredId] = useState<string | null>(null);
  const [copiedDid, setCopiedDid] = useState(false);
  const [highlightCredId, setHighlightCredId] = useState<string | null>(null);

  // Modal for full QR view
  const [modalCredential, setModalCredential] = useState<Credential | null>(null);
  const [modalOpenedAt, setModalOpenedAt] = useState(0);

  // Add credential form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingCredential, setAddingCredential] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [selfCredentialType, setSelfCredentialType] = useState("certificate");
  const [selfCredentialTitle, setSelfCredentialTitle] = useState("");
  const [selfCredentialDescription, setSelfCredentialDescription] = useState("");
  const [selfCredentialIssuedBy, setSelfCredentialIssuedBy] = useState("");
  const [selfCredentialDate, setSelfCredentialDate] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newCredRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.did) loadCredentials();
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

    try {
      const result = await apiPost<Credential>("/credentials/self", {
        credentialType: selfCredentialType,
        credentialData: {
          title: selfCredentialTitle,
          description: selfCredentialDescription,
          issuedBy: selfCredentialIssuedBy || "Self-attested",
          dateIssued: selfCredentialDate || new Date().toISOString().split("T")[0],
          ...(uploadedFile && { fileName: uploadedFile.name, fileSize: uploadedFile.size }),
        },
      });

      // Reset form
      setSelfCredentialTitle("");
      setSelfCredentialDescription("");
      setSelfCredentialIssuedBy("");
      setSelfCredentialDate("");
      setSelfCredentialType("certificate");
      setUploadedFile(null);
      setShowAddForm(false);

      // Reload and highlight the new credential
      await loadCredentials();
      const newId = result.credentialId;
      setHighlightCredId(newId);
      setExpandedCredId(newId);

      // Scroll to the new credential
      setTimeout(() => {
        newCredRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightCredId(null), 3000);
      }, 100);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setAddError("File must be under 10 MB");
        return;
      }
      setUploadedFile(file);
      setAddError(null);
    }
  };

  const isSelfAttested = (cred: Credential) => cred.issuerDid === cred.holderDid;
  const validCount = credentials.filter(c => c.status === "valid").length;
  const revokedCount = credentials.filter(c => c.status === "revoked").length;

  const toggleExpand = (id: string) => {
    setExpandedCredId(prev => prev === id ? null : id);
  };

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-icon"><FingerprintIcon /></div>
        <h2 className="panel-title">My Digital Identity</h2>
        <p className="panel-description">
          Manage your decentralized identity and credential wallet.
        </p>
      </div>

      {/* DID Section */}
      {user?.did && (
        <div className="card" style={{ marginBottom: "var(--space-5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <div className="card-icon" style={{ width: 32, height: 32 }}><FingerprintIcon /></div>
              <div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--gray-800)" }}>Your DID</div>
                <div style={{ fontSize: "0.6875rem", color: "var(--gray-500)" }}>Share with issuers to receive credentials</div>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={copyDid}
              style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
              <CopyIcon /> {copiedDid ? "Copied!" : "Copy"}
            </button>
          </div>
          <code style={{
            fontSize: "0.75rem", wordBreak: "break-all",
            background: "var(--surface-inset)", padding: "10px var(--space-4)",
            borderRadius: "var(--radius-md)", display: "block",
            fontFamily: "var(--font-mono)", color: "var(--brand-700)",
            border: "1px solid var(--surface-border)", lineHeight: 1.6
          }}>
            {user.did}
          </code>
        </div>
      )}

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value">{credentials.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--success-600)" }}>{validCount}</div>
          <div className="stat-label">Valid</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--danger-500)" }}>{revokedCount}</div>
          <div className="stat-label">Revoked</div>
        </div>
      </div>

      {/* Credential Wallet */}
      <div className="card">
        <div className="card-header">
          <div className="card-icon"><FileIcon /></div>
          <div style={{ flex: 1 }}>
            <h3 className="card-title">Credential Wallet</h3>
            <p className="card-subtitle">{credentials.length} credential{credentials.length !== 1 ? "s" : ""}</p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            <button className="btn btn-primary" onClick={() => { setShowAddForm(!showAddForm); setAddError(null); }}
              style={{ padding: "4px 10px", fontSize: "0.8125rem" }}>
              <PlusIcon /> Add
            </button>
            <button className="btn btn-secondary" onClick={loadCredentials} disabled={loading}
              style={{ padding: "4px 8px" }}>
              <RefreshIcon />
            </button>
          </div>
        </div>

        {/* ---- Add Credential Form ---- */}
        {showAddForm && (
          <div style={{
            padding: "var(--space-5)", margin: "0 0 var(--space-5)",
            background: "var(--brand-50)", borderRadius: "var(--radius-lg)",
            border: "1px solid var(--brand-200)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--gray-900)" }}>Add Credential</h4>
              <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}
                style={{ padding: "2px 6px" }}><XIcon /></button>
            </div>

            <form onSubmit={handleSelfIssue}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div className="input-group">
                  <label className="input-label">Type</label>
                  <select className="input" value={selfCredentialType} onChange={(e) => setSelfCredentialType(e.target.value)}>
                    {SELF_CREDENTIAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Title *</label>
                  <input type="text" className="input" placeholder="e.g., AWS Solutions Architect"
                    value={selfCredentialTitle} onChange={(e) => setSelfCredentialTitle(e.target.value)} required />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="input" placeholder="Brief description..."
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

              {/* File Upload */}
              <div className="input-group">
                <label className="input-label">Supporting Document</label>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" style={{ display: "none" }} />
                {uploadedFile ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--brand-50)", border: "1px solid var(--brand-200)",
                    borderRadius: "var(--radius-md)", fontSize: "0.8125rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--gray-700)" }}>
                      <span style={{ width: 16, height: 16, color: "var(--brand-600)" }}><PaperclipIcon /></span>
                      <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {uploadedFile.name}
                      </span>
                      <span style={{ color: "var(--gray-500)", fontSize: "0.75rem" }}>
                        ({(uploadedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button type="button" className="btn btn-secondary"
                      onClick={() => { setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      style={{ padding: "2px 6px" }}><XIcon /></button>
                  </div>
                ) : (
                  <button type="button" className="btn btn-secondary w-full"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ justifyContent: "center", borderStyle: "dashed" }}>
                    <UploadIcon /> Upload file (PDF, image, document — max 10 MB)
                  </button>
                )}
                <div style={{ fontSize: "0.6875rem", color: "var(--gray-600)", marginTop: 4 }}>
                  File will be referenced in the credential metadata.
                </div>
              </div>

              {addError && (
                <div className="error-message" style={{ marginTop: "var(--space-2)" }}>
                  <AlertCircleIcon /><span>{addError}</span>
                </div>
              )}

              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                <button type="submit" className="btn btn-primary" disabled={addingCredential || !selfCredentialTitle}>
                  {addingCredential ? (
                    <span className="loading"><span className="spinner" /> Adding...</span>
                  ) : (
                    <><PlusIcon /> Add Credential</>
                  )}
                </button>
                <button type="button" className="btn btn-secondary"
                  onClick={() => { setShowAddForm(false); setAddError(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---- Credential List ---- */}
        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
              <span className="loading"><span className="spinner" /> Loading...</span>
            </div>
          ) : credentials.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--gray-500)" }}>
              <div style={{
                width: 48, height: 48, margin: "0 auto var(--space-3)",
                background: "var(--surface-inset)", borderRadius: "var(--radius-md)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <FileIcon />
              </div>
              <p style={{ fontSize: "0.875rem" }}>No credentials yet</p>
              <p style={{ fontSize: "0.8125rem", marginTop: "var(--space-1)" }}>
                Click "Add" to self-attest a credential, or wait for an issuer to send you one.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {credentials.map((cred) => {
                const isExpanded = expandedCredId === cred.credentialId;
                const isHighlighted = highlightCredId === cred.credentialId;
                const verifyUrl = getVerificationUrl(cred.credentialId);

                return (
                  <div key={cred.credentialId}
                    ref={isHighlighted ? newCredRef : undefined}
                    style={{
                      borderRadius: "var(--radius-lg)",
                      border: `1px solid ${isHighlighted ? "rgba(34, 197, 94, 0.3)" : "var(--surface-border)"}`,
                      background: isHighlighted ? "var(--success-50)" : "var(--surface-card)",
                      transition: "all 600ms ease",
                      overflow: "hidden",
                      boxShadow: isHighlighted ? "0 0 16px rgba(34,197,94,0.08)" : "var(--shadow-sm)"
                    }}>
                    {/* Credential header row — always visible */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "var(--space-3)", cursor: "pointer"
                    }}
                      onClick={() => toggleExpand(cred.credentialId)}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 2 }}>
                          <span style={{
                            fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: isSelfAttested(cred) ? "var(--brand-500)" : "var(--success-600)"
                          }}>
                            {isSelfAttested(cred) ? "Self-Attested" : (cred.metadata?.type || "Credential")}
                          </span>
                          <span className={`status-badge ${cred.status === "valid" ? "valid" : "invalid"}`}>
                            <span className="status-dot" />{cred.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--gray-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {cred.metadata?.subjectName || cred.credentialId}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 1 }}>
                          {cred.metadata?.issuedBy || (isSelfAttested(cred) ? "Self-attested" : cred.issuerDid.slice(0, 30) + "...")}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        {/* Small QR thumbnail */}
                        <img src={generateQRCodeURL(verifyUrl)} alt="QR"
                          style={{ width: 36, height: 36, borderRadius: 4, background: "white", padding: 2, cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalCredential(cred);
                            setModalOpenedAt(Date.now());
                          }} />
                        <span style={{ width: 18, height: 18, color: "var(--gray-500)", transition: "transform 200ms ease", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
                          <ChevronDownIcon />
                        </span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{
                        padding: "0 var(--space-3) var(--space-3)",
                        borderTop: "1px solid var(--gray-200)",
                        animation: "fadeIn 0.15s ease"
                      }}>
                        <div style={{ padding: "var(--space-3) 0" }}>
                          <div className="data-row">
                            <span className="data-label">Credential ID</span>
                            <span className="data-value" style={{ fontSize: "0.7rem" }}>{cred.credentialId}</span>
                          </div>
                          {cred.metadata?.description && (
                            <div className="data-row">
                              <span className="data-label">Description</span>
                              <span className="data-value">{cred.metadata.description}</span>
                            </div>
                          )}
                          <div className="data-row">
                            <span className="data-label">Issuer DID</span>
                            <span className="data-value" style={{ fontSize: "0.7rem" }}>{cred.issuerDid}</span>
                          </div>
                          {cred.metadata?.expiresAt && (
                            <div className="data-row">
                              <span className="data-label">Expires</span>
                              <span className="data-value">{cred.metadata.expiresAt}</span>
                            </div>
                          )}
                          <div className="data-row">
                            <span className="data-label">IPFS Hash</span>
                            <span className="data-value" style={{ fontSize: "0.65rem" }}>{cred.ipfsHash}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "var(--space-2)" }}>
                          <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "0.8125rem" }}
                            onClick={() => { setModalCredential(cred); setModalOpenedAt(Date.now()); }}>
                            <QrCodeIcon /> View QR Code
                          </button>
                          <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "0.8125rem" }}
                            onClick={() => { navigator.clipboard.writeText(verifyUrl); }}>
                            <CopyIcon /> Copy Link
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {modalCredential && (
        <div role="dialog" aria-modal="true" aria-label="Credential QR Code"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
            padding: "var(--space-4)"
          }}
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            if (Date.now() - modalOpenedAt < 400) return;
            setModalCredential(null);
          }}>
          <div className="card"
            style={{ maxWidth: 420, width: "100%", animation: "fadeIn 0.15s ease", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>

            <div className="card-header">
              <div className="card-icon" style={{ width: 32, height: 32 }}><QrCodeIcon /></div>
              <div style={{ flex: 1 }}>
                <h3 className="card-title" style={{ fontSize: "0.9375rem" }}>
                  {modalCredential.metadata?.subjectName || modalCredential.credentialId}
                </h3>
                <p className="card-subtitle">Scan to verify this credential</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setModalCredential(null)}
                style={{ padding: "4px" }} aria-label="Close"><XIcon /></button>
            </div>

            <div style={{ textAlign: "center", padding: "var(--space-4)" }}>
              <img src={generateQRCodeURL(getVerificationUrl(modalCredential.credentialId))}
                alt="Credential QR Code"
                style={{ width: 200, height: 200, borderRadius: "var(--radius-md)", background: "white", padding: 8 }} />
              <p style={{ marginTop: "var(--space-3)", fontSize: "0.6875rem", color: "var(--gray-600)", wordBreak: "break-all", fontFamily: "var(--font-mono)" }}>
                {getVerificationUrl(modalCredential.credentialId)}
              </p>
            </div>

            <div className="divider" />

            <div style={{ padding: "0 var(--space-4) var(--space-4)" }}>
              <div className="data-row">
                <span className="data-label">Status</span>
                <span className={`status-badge ${modalCredential.status === "valid" ? "valid" : "invalid"}`}>
                  <span className="status-dot" />{modalCredential.status}
                </span>
              </div>
              <div className="data-row">
                <span className="data-label">Credential ID</span>
                <span className="data-value" style={{ fontSize: "0.7rem" }}>{modalCredential.credentialId}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Issuer</span>
                <span className="data-value" style={{ fontSize: "0.75rem" }}>
                  {modalCredential.metadata?.issuedBy || modalCredential.issuerDid}
                </span>
              </div>
            </div>

            <div style={{ padding: "0 var(--space-4) var(--space-4)", display: "flex", gap: "var(--space-2)" }}>
              <button className="btn btn-primary w-full" style={{ fontSize: "0.8125rem" }}
                onClick={() => { navigator.clipboard.writeText(getVerificationUrl(modalCredential.credentialId)); }}>
                <CopyIcon /> Copy Verification Link
              </button>
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
