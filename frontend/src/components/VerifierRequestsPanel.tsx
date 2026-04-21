import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import type { TrustLevel } from "../api/client";
import { TrustBadge } from "./TrustBadge";

interface PresentationRequest {
  id: string;
  verifierUserId: string;
  verifierDid: string;
  verifierName?: string;
  purpose: string;
  requiredTypes: string[];
  requiredFields?: Record<string, string[]>;
  targetHolderDid?: string;
  status: "pending" | "fulfilled" | "expired" | "cancelled";
  expiresAt?: string;
  createdAt: string;
  responseCount?: number;
}

interface PresentationResponse {
  id: string;
  requestId: string;
  holderDid: string;
  disclosedFields: Record<string, string[]>;
  vpSignatureValid: boolean;
  vcSignaturesValid: boolean;
  summary?: string;
  createdAt: string;
  vp: unknown;
}

interface VerificationDetail {
  response: PresentationResponse;
  verification: {
    signatureValid: boolean;
    holderKnown: boolean;
    allCredentialsValid: boolean;
    credentialResults: Array<{
      credentialId: string;
      issuer: string;
      disclosedFields: string[];
      vcVerification: {
        signatureValid: boolean;
        issuerKnown: boolean;
        allDisclosuresValid: boolean;
        disclosureChecks: Record<string, boolean>;
        reason?: string;
      };
    }>;
  };
}

const generateQRCodeURL = (data: string): string =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;

export function VerifierRequestsPanel() {
  const [requests, setRequests] = useState<PresentationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReq, setSelectedReq] = useState<PresentationRequest | null>(null);
  const [responses, setResponses] = useState<PresentationResponse[]>([]);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verificationDetails, setVerificationDetails] = useState<
    Record<string, VerificationDetail>
  >({});

  const [form, setForm] = useState({
    purpose: "",
    requiredTypes: "",
    requiredFields: "",
    targetHolderDid: "",
    expiresInHours: "",
  });

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PresentationRequest[]>("/pex/requests");
      setRequests(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const createRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const requiredTypes = form.requiredTypes
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (requiredTypes.length === 0) {
      setError("Please enter at least one credential type");
      return;
    }
    let requiredFields: Record<string, string[]> | undefined;
    if (form.requiredFields.trim()) {
      requiredFields = {};
      for (const line of form.requiredFields.split("\n")) {
        const [type, fields] = line.split(":").map((s) => s.trim());
        if (type && fields) {
          requiredFields[type] = fields
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean);
        }
      }
    }
    const expiresAt = form.expiresInHours
      ? new Date(Date.now() + Number(form.expiresInHours) * 3600 * 1000).toISOString()
      : undefined;
    try {
      await apiPost<PresentationRequest>("/pex/requests", {
        purpose: form.purpose,
        requiredTypes,
        requiredFields,
        targetHolderDid: form.targetHolderDid || undefined,
        expiresAt,
      });
      setForm({
        purpose: "",
        requiredTypes: "",
        requiredFields: "",
        targetHolderDid: "",
        expiresInHours: "",
      });
      setShowCreate(false);
      loadRequests();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel this presentation request?")) return;
    await apiPost(`/pex/requests/${id}/cancel`);
    loadRequests();
  };

  const openRequest = async (r: PresentationRequest) => {
    setSelectedReq(r);
    setResponses([]);
    try {
      const data = await apiGet<PresentationResponse[]>(
        `/pex/requests/${r.id}/responses`
      );
      setResponses(data);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const verifyResponse = async (responseId: string) => {
    if (!selectedReq) return;
    setVerifying(responseId);
    try {
      const data = await apiGet<VerificationDetail>(
        `/pex/requests/${selectedReq.id}/responses/${responseId}/verify`
      );
      setVerificationDetails((p) => ({ ...p, [responseId]: data }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVerifying(null);
    }
  };

  const requestUrl = (r: PresentationRequest) =>
    `${window.location.origin}/#/present/${r.id}`;

  if (selectedReq) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "var(--space-4)", gap: "var(--space-2)" }}>
          <button className="btn btn-secondary" onClick={() => setSelectedReq(null)}>
            ← Back to requests
          </button>
          <div>
            <div style={{ fontWeight: 600 }}>{selectedReq.purpose}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
              Requires: {selectedReq.requiredTypes.join(", ")}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Responses</h3>
              <p className="card-subtitle">{responses.length} submission(s)</p>
            </div>
          </div>
          <div className="card-body" style={{ maxHeight: 560, overflowY: "auto" }}>
            {responses.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--gray-500)", padding: "var(--space-6)" }}>
                No responses yet. Share the QR code with a holder.
              </p>
            ) : (
              responses.map((r) => {
                const detail = verificationDetails[r.id];
                return (
                  <div
                    key={r.id}
                    style={{
                      padding: "var(--space-4)",
                      marginBottom: "var(--space-3)",
                      background: "var(--surface-inset)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--surface-border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "var(--space-3)",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                          Holder DID
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", wordBreak: "break-all" }}>
                          {r.holderDid}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 4 }}>
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                        {r.summary && (
                          <div style={{ fontSize: "0.85rem", marginTop: 6, fontStyle: "italic" }}>
                            "{r.summary}"
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <span
                          className={`status-badge ${r.vpSignatureValid && r.vcSignaturesValid ? "valid" : "invalid"}`}
                        >
                          <span className="status-dot" />
                          {r.vpSignatureValid && r.vcSignaturesValid
                            ? "Crypto OK"
                            : "Signature Issue"}
                        </span>
                        <div style={{ fontSize: "0.7rem", color: "var(--gray-500)" }}>
                          VP: {r.vpSignatureValid ? "✓" : "✗"} · VCs: {r.vcSignaturesValid ? "✓" : "✗"}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: "var(--space-3)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: 4 }}>
                        Disclosed fields (selective disclosure)
                      </div>
                      {Object.entries(r.disclosedFields).map(([credId, fields]) => (
                        <div
                          key={credId}
                          style={{
                            padding: "6px 8px",
                            background: "var(--surface)",
                            borderRadius: 6,
                            marginBottom: 4,
                            fontSize: "0.8rem",
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-mono)", color: "var(--gray-500)" }}>
                            {credId.slice(0, 20)}...
                          </span>
                          <span style={{ marginLeft: 8 }}>
                            {fields.length === 0 ? (
                              <em>(none)</em>
                            ) : (
                              fields.map((f) => (
                                <span
                                  key={f}
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    margin: "2px 4px 2px 0",
                                    background: "var(--brand-100)",
                                    color: "var(--brand-700)",
                                    borderRadius: 999,
                                    fontSize: "0.7rem",
                                  }}
                                >
                                  {f}
                                </span>
                              ))
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: "var(--space-3)" }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => verifyResponse(r.id)}
                        disabled={verifying === r.id}
                        style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                      >
                        {verifying === r.id ? "Verifying..." : "Re-verify cryptographically"}
                      </button>
                    </div>

                    {detail && (
                      <div
                        style={{
                          marginTop: "var(--space-3)",
                          padding: "var(--space-3)",
                          background: "var(--surface)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.75rem",
                        }}
                      >
                        <div>
                          VP signature:{" "}
                          <strong style={{ color: detail.verification.signatureValid ? "var(--success-600)" : "var(--danger-500)" }}>
                            {detail.verification.signatureValid ? "valid" : "INVALID"}
                          </strong>
                        </div>
                        {detail.verification.credentialResults.map((c) => (
                          <div key={c.credentialId} style={{ marginTop: 6 }}>
                            <div style={{ fontFamily: "var(--font-mono)" }}>
                              {c.credentialId.slice(0, 24)}…
                            </div>
                            <div>
                              Issuer sig:{" "}
                              <strong
                                style={{
                                  color: c.vcVerification.signatureValid
                                    ? "var(--success-600)"
                                    : "var(--danger-500)",
                                }}
                              >
                                {c.vcVerification.signatureValid ? "valid" : "INVALID"}
                              </strong>{" "}
                              · Disclosures:{" "}
                              <strong
                                style={{
                                  color: c.vcVerification.allDisclosuresValid
                                    ? "var(--success-600)"
                                    : "var(--danger-500)",
                                }}
                              >
                                {c.vcVerification.allDisclosuresValid ? "match digests" : "MISMATCH"}
                              </strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* QR to re-share the request */}
        {selectedReq.status === "pending" && (
          <div className="card" style={{ marginTop: "var(--space-4)" }}>
            <div className="card-body" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.875rem", color: "var(--gray-600)", marginBottom: 8 }}>
                Share with a holder
              </div>
              <img
                src={generateQRCodeURL(requestUrl(selectedReq))}
                alt="Request QR"
                style={{ background: "white", padding: 8, borderRadius: 8 }}
              />
              <div style={{ fontSize: "0.7rem", color: "var(--gray-500)", marginTop: 6, wordBreak: "break-all" }}>
                {requestUrl(selectedReq)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Presentation Requests</h3>
          <p style={{ color: "var(--gray-500)", margin: 0, fontSize: "0.8rem" }}>
            Ask holders for proofs. Supports selective disclosure and Ed25519 signatures.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={loadRequests}>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Cancel" : "New Request"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: "var(--space-3)" }}>
          <span>{error}</span>
        </div>
      )}

      {showCreate && (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <div className="card-body">
            <form onSubmit={createRequest}>
              <div className="input-group">
                <label className="input-label">Purpose *</label>
                <input
                  className="input"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="e.g. KYC for account opening"
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Required credential types * (comma-separated)</label>
                <input
                  className="input"
                  value={form.requiredTypes}
                  onChange={(e) => setForm({ ...form, requiredTypes: e.target.value })}
                  placeholder="e.g. university_degree, government_id"
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  Required fields per type (optional)
                </label>
                <textarea
                  className="input"
                  value={form.requiredFields}
                  onChange={(e) =>
                    setForm({ ...form, requiredFields: e.target.value })
                  }
                  placeholder={"e.g.\ngovernment_id: firstName, lastName, dateOfBirth\nuniversity_degree: degreeName, institution"}
                  rows={3}
                  style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}
                />
                <p style={{ fontSize: "0.7rem", color: "var(--gray-500)", marginTop: 2 }}>
                  One line per type. Use <code>type: field1, field2</code>.
                </p>
              </div>
              <div className="input-group">
                <label className="input-label">Target holder DID (optional)</label>
                <input
                  className="input input-mono"
                  value={form.targetHolderDid}
                  onChange={(e) =>
                    setForm({ ...form, targetHolderDid: e.target.value })
                  }
                  placeholder="Leave empty for open/QR-shared requests"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Expires in (hours)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.expiresInHours}
                  onChange={(e) =>
                    setForm({ ...form, expiresInHours: e.target.value })
                  }
                  placeholder="24"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full">
                Create Request
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
          <span className="loading">
            <span className="spinner" />
          </span>
        </div>
      ) : requests.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--gray-500)", padding: "var(--space-6)" }}>
          No presentation requests yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {requests.map((r) => (
            <div
              key={r.id}
              style={{
                padding: "var(--space-3)",
                background: "var(--surface-inset)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--surface-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-3)",
                cursor: "pointer",
              }}
              onClick={() => openRequest(r)}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--gray-800)" }}>{r.purpose}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                  {r.requiredTypes.join(" · ")} • created {new Date(r.createdAt).toLocaleString()}
                </div>
                {r.targetHolderDid && (
                  <div style={{ fontSize: "0.7rem", color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}>
                    → {r.targetHolderDid.slice(0, 30)}…
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className={`status-badge ${
                    r.status === "pending"
                      ? "pending"
                      : r.status === "fulfilled"
                        ? "valid"
                        : "invalid"
                  }`}
                >
                  <span className="status-dot" />
                  {r.status}
                </span>
                {typeof r.responseCount === "number" && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--gray-600)",
                      background: "var(--surface)",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {r.responseCount} resp
                  </span>
                )}
                {r.status === "pending" && (
                  <button
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancel(r.id);
                    }}
                    style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Re-export trust types used in VerifierPanel
export type { TrustLevel };
