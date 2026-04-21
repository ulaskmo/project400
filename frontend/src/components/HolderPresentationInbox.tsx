import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";

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
}

interface CredentialCandidate {
  credentialId: string;
  type: string;
  issuer: string;
  issuerName?: string;
  issuedAt: string;
  subjectFields: Record<string, unknown>;
  hasVc: boolean;
  requiredFields: string[];
  missingRequiredFields: string[];
}

interface MatchResult {
  request: PresentationRequest;
  matchesByType: Record<string, CredentialCandidate[]>;
  allRequiredTypesCovered: boolean;
}

interface HolderPresentationInboxProps {
  // Deep-link from /#/present/:id — auto-open this specific request after load.
  autoOpenRequestId?: string;
}

export function HolderPresentationInbox({
  autoOpenRequestId,
}: HolderPresentationInboxProps = {}) {
  const [requests, setRequests] = useState<PresentationRequest[]>([]);
  const [history, setHistory] = useState<
    Array<PresentationRequest & { status: "fulfilled" }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PresentationRequest | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [selectedCreds, setSelectedCreds] = useState<Record<string, string>>({}); // type -> credentialId
  const [disclosures, setDisclosures] = useState<Record<string, Record<string, boolean>>>({});
  // credId -> field -> include?
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const pending = await apiGet<PresentationRequest[]>("/pex/inbox");
      setRequests(pending);
      const done = await apiGet<PresentationRequest[]>("/pex/my-responses");
      setHistory(done as Array<PresentationRequest & { status: "fulfilled" }>);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // If we arrived via a /#/present/:id deep link, open the matching
  // request as soon as the inbox load resolves and we haven't already
  // opened something.
  useEffect(() => {
    if (!autoOpenRequestId || selected) return;
    const match = requests.find((r) => r.id === autoOpenRequestId);
    if (match) {
      void openRequest(match);
    }
  }, [autoOpenRequestId, requests, selected]);

  const openRequest = async (r: PresentationRequest) => {
    setSelected(r);
    setMatch(null);
    setSelectedCreds({});
    setDisclosures({});
    setSummary("");
    setSuccessMsg(null);
    try {
      const data = await apiGet<MatchResult>(`/pex/requests/${r.id}/match`);
      setMatch(data);
      // Pre-select first candidate per type & include all required fields
      const preSelected: Record<string, string> = {};
      const preDisclosures: Record<string, Record<string, boolean>> = {};
      for (const [type, candidates] of Object.entries(data.matchesByType)) {
        if (candidates.length > 0) {
          const pick = candidates[0];
          preSelected[type] = pick.credentialId;
          const fieldMap: Record<string, boolean> = {};
          for (const f of Object.keys(pick.subjectFields)) {
            fieldMap[f] = pick.requiredFields.includes(f);
          }
          preDisclosures[pick.credentialId] = fieldMap;
        }
      }
      setSelectedCreds(preSelected);
      setDisclosures(preDisclosures);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleField = (credId: string, field: string) => {
    setDisclosures((prev) => ({
      ...prev,
      [credId]: { ...prev[credId], [field]: !prev[credId]?.[field] },
    }));
  };

  const switchCandidate = (type: string, credId: string) => {
    setSelectedCreds((p) => ({ ...p, [type]: credId }));
    if (!disclosures[credId] && match) {
      const cand = match.matchesByType[type].find((c) => c.credentialId === credId);
      if (cand) {
        const m: Record<string, boolean> = {};
        for (const f of Object.keys(cand.subjectFields)) {
          m[f] = cand.requiredFields.includes(f);
        }
        setDisclosures((p) => ({ ...p, [credId]: m }));
      }
    }
  };

  const submit = async () => {
    if (!selected || !match) return;
    setSubmitting(true);
    setError(null);
    try {
      const selections: Array<{ credentialId: string; disclosedFields: string[] }> = [];
      for (const [type, credId] of Object.entries(selectedCreds)) {
        if (!credId) continue;
        const fieldMap = disclosures[credId] || {};
        const cand = match.matchesByType[type].find((c) => c.credentialId === credId);
        const required = cand?.requiredFields || [];
        const fields = new Set<string>(required);
        for (const [f, include] of Object.entries(fieldMap)) {
          if (include) fields.add(f);
        }
        selections.push({
          credentialId: credId,
          disclosedFields: Array.from(fields),
        });
      }
      await apiPost(`/pex/responses`, {
        requestId: selected.id,
        selections,
        summary: summary || undefined,
      });
      setSuccessMsg("Presentation sent with selective disclosure");
      setTimeout(() => {
        setSelected(null);
        load();
      }, 1400);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (selected && match) {
    const missingCoverage = selected.requiredTypes.filter(
      (t) => !selectedCreds[t]
    );
    return (
      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "var(--space-4)" }}>
          <button className="btn btn-secondary" onClick={() => setSelected(null)}>
            ← Back to inbox
          </button>
          <div>
            <div style={{ fontWeight: 600 }}>{selected.purpose}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
              From: {selected.verifierName || selected.verifierDid.slice(0, 30)}
            </div>
          </div>
        </div>

        {error && <div className="error-message" style={{ marginBottom: 12 }}>{error}</div>}
        {successMsg && (
          <div
            style={{
              padding: 12,
              background: "var(--success-50)",
              color: "var(--success-700)",
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            {successMsg}
          </div>
        )}

        <div className="card">
          <div className="card-body">
            <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginBottom: 12 }}>
              Select which credential to present for each required type and pick exactly
              which fields to reveal. Required fields (flagged) must be disclosed.
            </p>

            {selected.requiredTypes.map((type) => {
              const candidates = match.matchesByType[type] || [];
              const selectedId = selectedCreds[type] || "";
              const cred = candidates.find((c) => c.credentialId === selectedId);
              const requiredFieldsForType = selected.requiredFields?.[type] || [];

              return (
                <div
                  key={type}
                  style={{
                    marginBottom: "var(--space-4)",
                    padding: "var(--space-3)",
                    background: "var(--surface-inset)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--surface-border)",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{type}</div>

                  {candidates.length === 0 ? (
                    <div style={{ color: "var(--danger-600)", fontSize: "0.8rem" }}>
                      You have no credential of this type.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        {candidates.map((c) => (
                          <button
                            key={c.credentialId}
                            onClick={() => switchCandidate(type, c.credentialId)}
                            className={`btn ${
                              selectedId === c.credentialId ? "btn-primary" : "btn-secondary"
                            }`}
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                            disabled={c.missingRequiredFields.length > 0}
                            title={
                              c.missingRequiredFields.length
                                ? `Missing fields: ${c.missingRequiredFields.join(", ")}`
                                : c.issuerName || c.issuer
                            }
                          >
                            {(c.issuerName || "Credential").slice(0, 20)}
                            {c.missingRequiredFields.length > 0 && " ⚠"}
                          </button>
                        ))}
                      </div>

                      {cred && (
                        <>
                          {!cred.hasVc && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--warn-600, var(--gray-600))",
                                marginBottom: 8,
                              }}
                            >
                              ⚠ Legacy credential — no W3C signature (verifier will see this).
                            </div>
                          )}
                          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: 6 }}>
                            Fields in this credential — check to reveal:
                          </div>
                          {Object.entries(cred.subjectFields).map(([f, v]) => {
                            const isRequired = requiredFieldsForType.includes(f);
                            const checked =
                              disclosures[cred.credentialId]?.[f] ?? isRequired;
                            return (
                              <label
                                key={f}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "4px 6px",
                                  borderRadius: 4,
                                  background: checked ? "var(--brand-50)" : "transparent",
                                  cursor: isRequired ? "not-allowed" : "pointer",
                                  opacity: isRequired ? 0.9 : 1,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isRequired}
                                  onChange={() => toggleField(cred.credentialId, f)}
                                />
                                <span style={{ fontWeight: 500, fontSize: "0.85rem" }}>{f}</span>
                                {isRequired && (
                                  <span
                                    style={{
                                      fontSize: "0.65rem",
                                      padding: "2px 6px",
                                      background: "var(--brand-100)",
                                      color: "var(--brand-700)",
                                      borderRadius: 999,
                                    }}
                                  >
                                    REQUIRED
                                  </span>
                                )}
                                <span
                                  style={{
                                    marginLeft: "auto",
                                    color: "var(--gray-600)",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "0.75rem",
                                    maxWidth: 200,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {String(v)}
                                </span>
                              </label>
                            );
                          })}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <div className="input-group">
              <label className="input-label">Note to verifier (optional)</label>
              <input
                className="input"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g. Proof for account opening"
              />
            </div>

            <button
              className="btn btn-primary btn-lg w-full"
              disabled={
                submitting ||
                missingCoverage.length > 0 ||
                selected.status !== "pending"
              }
              onClick={submit}
            >
              {submitting
                ? "Signing & sending..."
                : missingCoverage.length > 0
                  ? `Missing: ${missingCoverage.join(", ")}`
                  : "Sign & Present"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Presentation Inbox</h3>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--gray-500)" }}>
            Verifier requests for your credentials. Pick fields to reveal.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
          <span className="spinner" />
        </div>
      ) : (
        <>
          {requests.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "var(--space-6)",
                background: "var(--surface-inset)",
                borderRadius: "var(--radius-md)",
                color: "var(--gray-500)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📬</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--gray-700)" }}>
                Inbox is empty
              </div>
              <div style={{ fontSize: "0.8rem", marginTop: 6 }}>
                Requests appear here when (a) a verifier targets your DID directly
                or (b) you opt in to a broadcast from the <strong>Flow</strong> tab.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {requests.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: "var(--space-3)",
                    background: "var(--surface-inset)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--surface-border)",
                    cursor: "pointer",
                  }}
                  onClick={() => openRequest(r)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{r.purpose}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                        {r.verifierName || r.verifierDid.slice(0, 30)} • {r.requiredTypes.join(", ")}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--gray-500)", marginTop: 2 }}>
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className="status-badge pending">
                      <span className="status-dot" />
                      pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <>
              <h4
                style={{
                  fontSize: "0.85rem",
                  color: "var(--gray-500)",
                  marginTop: "var(--space-5)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Sent
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {history.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "8px 12px",
                      background: "var(--surface-inset)",
                      borderRadius: 8,
                      fontSize: "0.85rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      {r.purpose} <span style={{ color: "var(--gray-500)" }}>— {r.verifierName || "verifier"}</span>
                    </span>
                    <span className="status-badge valid">
                      <span className="status-dot" />
                      sent
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
