import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { apiPost, apiGet } from "../api/client";

type Credential = {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  status: string;
  metadata?: {
    type?: string;
    subjectName?: string;
    description?: string;
    issuedBy?: string;
    expiresAt?: string;
    fileName?: string;
  };
};

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);

const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
    <path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
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
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
  </svg>
);

const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

const PaperclipIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export function IssuerPanel() {
  const { user } = useAuth();
  const [issuedCredentials, setIssuedCredentials] = useState<Credential[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [holderDid, setHolderDid] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File must be under 10 MB");
        return;
      }
      setUploadedFile(file);
      setError(null);
    }
  };

  const issueCredential = async () => {
    if (!holderDid.trim()) {
      setError("Please enter the holder's DID");
      return;
    }
    if (!documentName.trim()) {
      setError("Please enter the document name");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const credentialId = `cred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const body = {
        credentialId,
        holderDid: holderDid.trim(),
        metadata: {
          type: "document",
          subjectName: documentName.trim(),
          description: uploadedFile ? `File: ${uploadedFile.name}` : undefined,
          issuedBy: user?.organizationName || user?.email,
          expiresAt: undefined,
          fileName: uploadedFile?.name,
          issueDate: issueDate || undefined,
        },
        subjectFields: {
          documentName: documentName.trim(),
          issueDate: issueDate || undefined,
          fileName: uploadedFile?.name,
        },
      };
      await apiPost<Credential>("/credentials", body);
      setSuccess(`Credential "${documentName}" issued successfully to holder.`);
      setHolderDid("");
      setDocumentName("");
      setIssueDate(new Date().toISOString().split("T")[0]);
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadIssuedCredentials();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (credentialId: string) => {
    if (!confirm(`Revoke credential ${credentialId}? This cannot be undone.`)) return;
    setRevokingId(credentialId);
    try {
      await apiPost(`/credentials/${encodeURIComponent(credentialId)}/revoke`);
      loadIssuedCredentials();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon issuer">
          <BuildingIcon />
        </div>
        <h2 className="panel-title">Issue Credential</h2>
        <p className="panel-description">
          Issue a verified document to a holder's DID. The credential will be anchored on blockchain.
        </p>
      </div>

      {/* Issue Form */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="card-icon success"><SendIcon /></div>
          <div>
            <h3 className="card-title">New Credential</h3>
            <p className="card-subtitle">Fill in the details and issue</p>
          </div>
        </div>

        <div className="card-body">
          <div className="input-group">
            <label className="input-label">Holder's DID *</label>
            <input
              type="text"
              className="input input-mono"
              value={holderDid}
              onChange={(e) => setHolderDid(e.target.value)}
              placeholder="did:chainshield:..."
            />
            <p style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: "var(--space-1)" }}>
              The holder can find their DID in their Identity Holder dashboard
            </p>
          </div>

          <div className="input-group">
            <label className="input-label">Document Name *</label>
            <input
              type="text"
              className="input"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g., Bachelor of Science Diploma"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Date</label>
            <input
              type="date"
              className="input"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>

          {/* File Upload */}
          <div className="input-group">
            <label className="input-label">Attach Document</label>
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
                  <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
          </div>

          <button
            className="btn btn-success btn-lg w-full"
            onClick={issueCredential}
            disabled={loading}
            style={{ marginTop: "var(--space-4)" }}
          >
            {loading ? (
              <span className="loading"><span className="spinner" />Issuing...</span>
            ) : (
              <><SendIcon /> Issue Credential</>
            )}
          </button>

          {success && (
            <div className="result-card success" style={{ marginTop: "var(--space-4)" }}>
              <div className="result-header">
                <div className="result-icon success"><CheckCircleIcon /></div>
                <div className="result-title">{success}</div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message" style={{ marginTop: "var(--space-4)" }}>
              <AlertCircleIcon /><span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Issued Credentials List */}
      <div className="card">
        <div className="card-header">
          <div className="card-icon"><FileIcon /></div>
          <div style={{ flex: 1 }}>
            <h3 className="card-title">Issued Credentials</h3>
            <p className="card-subtitle">{issuedCredentials.length} credential{issuedCredentials.length !== 1 ? "s" : ""} issued</p>
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

        <div className="card-body" style={{ maxHeight: 500, overflowY: "auto" }}>
          {loadingList ? (
            <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
              <span className="loading"><span className="spinner" /></span>
            </div>
          ) : issuedCredentials.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--gray-500)" }}>
              <div style={{ width: 48, height: 48, margin: "0 auto var(--space-3)", background: "var(--surface-inset)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileIcon />
              </div>
              <p>No credentials issued yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {issuedCredentials.map((cred) => (
                <div
                  key={cred.credentialId}
                  style={{
                    padding: "var(--space-4)",
                    background: "var(--surface-inset)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--surface-border)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--gray-800)", marginBottom: "var(--space-1)" }}>
                        {cred.metadata?.subjectName || cred.credentialId}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                        To: <span style={{ fontFamily: "var(--font-mono)" }}>{cred.holderDid.length > 35 ? cred.holderDid.slice(0, 35) + "..." : cred.holderDid}</span>
                      </div>
                      {cred.metadata?.description && (
                        <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 2, fontStyle: "italic" }}>
                          {cred.metadata.description}
                        </div>
                      )}
                      <div style={{ fontSize: "0.6875rem", color: "var(--gray-400)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                        ID: {cred.credentialId}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-2)" }}>
                      <span className={`status-badge ${cred.status === "valid" ? "valid" : "invalid"}`}>
                        <span className="status-dot" />
                        {cred.status}
                      </span>
                      {cred.status === "valid" && (
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: "4px 10px",
                            fontSize: "0.7rem",
                            color: "var(--danger-400)",
                            borderColor: "rgba(239, 68, 68, 0.3)",
                          }}
                          onClick={() => handleRevoke(cred.credentialId)}
                          disabled={revokingId === cred.credentialId}
                        >
                          {revokingId === cred.credentialId ? (
                            <span className="loading"><span className="spinner" style={{ width: 12, height: 12 }} /></span>
                          ) : (
                            <><XCircleIcon /> Revoke</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
