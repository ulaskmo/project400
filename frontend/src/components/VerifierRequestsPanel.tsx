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
  audience: "direct" | "broadcast";
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

  type ExpiryMode = "preset" | "custom" | "never";
  type ExpiryPreset =
    | "5m"
    | "30m"
    | "1h"
    | "6h"
    | "24h"
    | "3d"
    | "7d"
    | "30d"
    | "90d";

  const presetToHours: Record<ExpiryPreset, number> = {
    "5m": 5 / 60,
    "30m": 0.5,
    "1h": 1,
    "6h": 6,
    "24h": 24,
    "3d": 72,
    "7d": 168,
    "30d": 720,
    "90d": 2160,
  };

  const presetLabels: Record<ExpiryPreset, string> = {
    "5m": "5 minutes",
    "30m": "30 minutes",
    "1h": "1 hour",
    "6h": "6 hours",
    "24h": "1 day",
    "3d": "3 days",
    "7d": "1 week",
    "30d": "30 days",
    "90d": "90 days",
  };

  const [form, setForm] = useState({
    purpose: "",
    requiredTypes: "",
    requiredFields: "",
    audience: "broadcast" as "direct" | "broadcast",
    targetHolderDid: "",
    expiryMode: "preset" as ExpiryMode,
    expiryPreset: "24h" as ExpiryPreset,
    // Custom duration: number + unit (minutes/hours/days/weeks)
    customAmount: "2",
    customUnit: "days" as "minutes" | "hours" | "days" | "weeks",
    customDateTime: "",
  });

  const computeExpiresAt = (): string | undefined => {
    if (form.expiryMode === "never") return undefined;
    if (form.expiryMode === "preset") {
      const hours = presetToHours[form.expiryPreset];
      return new Date(Date.now() + hours * 3600 * 1000).toISOString();
    }
    // custom
    if (form.customDateTime) {
      return new Date(form.customDateTime).toISOString();
    }
    const amount = Number(form.customAmount) || 0;
    if (amount <= 0) return undefined;
    const unitMs: Record<typeof form.customUnit, number> = {
      minutes: 60 * 1000,
      hours: 3600 * 1000,
      days: 86400 * 1000,
      weeks: 7 * 86400 * 1000,
    };
    return new Date(Date.now() + amount * unitMs[form.customUnit]).toISOString();
  };

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
    const expiresAt = computeExpiresAt();
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      setError("Expiry must be in the future");
      return;
    }
    if (form.audience === "direct" && !form.targetHolderDid.trim()) {
      setError("Direct requests need a target holder DID");
      return;
    }
    try {
      await apiPost<PresentationRequest>("/pex/requests", {
        purpose: form.purpose,
        requiredTypes,
        requiredFields,
        audience: form.audience,
        targetHolderDid:
          form.audience === "direct" ? form.targetHolderDid : undefined,
        expiresAt,
      });
      setForm({
        purpose: "",
        requiredTypes: "",
        requiredFields: "",
        audience: "broadcast",
        targetHolderDid: "",
        expiryMode: "preset",
        expiryPreset: "24h",
        customAmount: "2",
        customUnit: "days",
        customDateTime: "",
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
                <label className="input-label">Audience *</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`btn ${form.audience === "broadcast" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setForm({ ...form, audience: "broadcast" })}
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                  >
                    Broadcast (all holders)
                  </button>
                  <button
                    type="button"
                    className={`btn ${form.audience === "direct" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setForm({ ...form, audience: "direct" })}
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                  >
                    Specific holder (DID)
                  </button>
                </div>
                <p style={{ fontSize: "0.7rem", color: "var(--gray-500)", marginTop: 4 }}>
                  {form.audience === "broadcast"
                    ? "Posts to the community Flow page. Interested holders opt in and receive it in their inbox."
                    : "Only the holder with this DID can see the request in their inbox."}
                </p>
              </div>
              {form.audience === "direct" && (
                <div className="input-group">
                  <label className="input-label">Target holder DID *</label>
                  <input
                    className="input input-mono"
                    value={form.targetHolderDid}
                    onChange={(e) =>
                      setForm({ ...form, targetHolderDid: e.target.value })
                    }
                    placeholder="did:chainshield:..."
                    required
                  />
                </div>
              )}
              <div className="input-group">
                <label className="input-label">Expires</label>
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--gray-500)",
                    marginTop: 0,
                    marginBottom: 6,
                  }}
                >
                  After this, the request auto-expires and no holder
                  (including interested ones) can submit a response. Shorter
                  is safer (fresher consent, replay-proof); longer is ok for
                  slow community broadcasts.
                </p>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {(["preset", "custom", "never"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`btn ${form.expiryMode === mode ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setForm({ ...form, expiryMode: mode })}
                      style={{ padding: "4px 10px", fontSize: "0.7rem" }}
                    >
                      {mode === "preset" ? "Quick pick" : mode === "custom" ? "Custom" : "Never"}
                    </button>
                  ))}
                </div>

                {form.expiryMode === "preset" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(Object.keys(presetLabels) as ExpiryPreset[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`btn ${form.expiryPreset === p ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setForm({ ...form, expiryPreset: p })}
                        style={{ padding: "4px 10px", fontSize: "0.7rem" }}
                      >
                        {presetLabels[p]}
                      </button>
                    ))}
                  </div>
                )}

                {form.expiryMode === "custom" && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <input
                        className="input"
                        type="number"
                        min="1"
                        style={{ maxWidth: 90 }}
                        value={form.customAmount}
                        onChange={(e) =>
                          setForm({ ...form, customAmount: e.target.value, customDateTime: "" })
                        }
                      />
                      <select
                        className="input"
                        style={{ maxWidth: 130 }}
                        value={form.customUnit}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            customUnit: e.target.value as typeof form.customUnit,
                            customDateTime: "",
                          })
                        }
                      >
                        <option value="minutes">minutes</option>
                        <option value="hours">hours</option>
                        <option value="days">days</option>
                        <option value="weeks">weeks</option>
                      </select>
                      <span style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                        from now
                      </span>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--gray-500)", marginBottom: 4 }}>
                      or pick an exact date/time:
                    </div>
                    <input
                      className="input"
                      type="datetime-local"
                      value={form.customDateTime}
                      onChange={(e) =>
                        setForm({ ...form, customDateTime: e.target.value })
                      }
                    />
                  </>
                )}

                {form.expiryMode === "never" && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--warning-700, #92400e)",
                      background: "var(--warning-50, #fffbeb)",
                      border: "1px solid var(--warning-200, #fde68a)",
                      padding: "8px 10px",
                      borderRadius: 6,
                    }}
                  >
                    ⚠ Requests without an expiry stay open indefinitely. Only
                    use this for evergreen policy checks you control; for
                    campaigns or ad-hoc asks prefer a quick pick.
                  </div>
                )}

                {(() => {
                  const ea = computeExpiresAt();
                  if (!ea)
                    return (
                      <div style={{ fontSize: "0.7rem", color: "var(--gray-500)", marginTop: 6 }}>
                        Will not expire automatically.
                      </div>
                    );
                  return (
                    <div style={{ fontSize: "0.7rem", color: "var(--gray-500)", marginTop: 6 }}>
                      Will expire on <strong>{new Date(ea).toLocaleString()}</strong>
                    </div>
                  );
                })()}
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
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: "var(--gray-800)" }}>{r.purpose}</span>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      padding: "2px 8px",
                      borderRadius: 999,
                      background:
                        r.audience === "broadcast"
                          ? "var(--brand-100)"
                          : "var(--surface-inset)",
                      color:
                        r.audience === "broadcast"
                          ? "var(--brand-700)"
                          : "var(--gray-700)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      fontWeight: 600,
                    }}
                  >
                    {r.audience === "broadcast" ? "📣 Broadcast" : "🎯 Direct"}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 2 }}>
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
