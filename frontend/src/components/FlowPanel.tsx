import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../api/client";
import type { TrustLevel } from "../api/client";
import { TrustBadge, describeTrustLevel } from "./TrustBadge";

interface FlowItem {
  id: string;
  verifierUserId: string;
  verifierDid: string;
  verifierName?: string;
  verifierTrustLevel?: TrustLevel;
  verifierRole?: string;
  purpose: string;
  requiredTypes: string[];
  requiredFields?: Record<string, string[]>;
  status: "pending" | "fulfilled" | "expired" | "cancelled";
  expiresAt?: string;
  createdAt: string;
  interested: boolean;
  alreadyResponded: boolean;
  interestedCount: number;
}

const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export function FlowPanel() {
  const [items, setItems] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "interested" | "open">("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<FlowItem[]>("/pex/flow");
      setItems(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setInterest = async (id: string, interested: boolean) => {
    setBusyId(id);
    try {
      if (interested) {
        await apiPost(`/pex/requests/${id}/interest`);
      } else {
        await apiDelete(`/pex/requests/${id}/interest`);
      }
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                interested,
                interestedCount: it.interestedCount + (interested ? 1 : -1),
              }
            : it
        )
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "interested") return items.filter((i) => i.interested);
    if (filter === "open") return items.filter((i) => !i.interested && !i.alreadyResponded);
    return items;
  }, [items, filter]);

  const stats = useMemo(
    () => ({
      total: items.length,
      interested: items.filter((i) => i.interested).length,
      responded: items.filter((i) => i.alreadyResponded).length,
    }),
    [items]
  );

  return (
    <div>
      <div
        style={{
          padding: "var(--space-5)",
          borderRadius: "var(--radius-lg)",
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.12) 50%, rgba(16,185,129,0.12) 100%)",
          border: "1px solid var(--surface-border)",
          marginBottom: "var(--space-5)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ color: "var(--brand-600)" }}>
            <SparkIcon />
          </span>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Community Flow</h3>
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--gray-600)", maxWidth: 520 }}>
          Verifiers broadcast presentation requests to the community. Tap{" "}
          <strong>I'm interested</strong> and the request lands in your Inbox,
          where you can selectively disclose credentials to prove what's asked.
        </p>

        <div style={{ display: "flex", gap: 16, marginTop: "var(--space-4)" }}>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--brand-700)" }}>
              {stats.total}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Open broadcasts
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--success-600)" }}>
              {stats.interested}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Interested
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--gray-700)" }}>
              {stats.responded}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Responded
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-3)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "interested", "open"] as const).map((f) => (
            <button
              key={f}
              className={`btn ${filter === f ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(f)}
              style={{ padding: "4px 12px", fontSize: "0.75rem" }}
            >
              {f === "all" ? "All" : f === "interested" ? "My interests" : "Not yet opted in"}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary" onClick={load} style={{ padding: "4px 12px", fontSize: "0.75rem" }}>
          Refresh
        </button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
          <span className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "var(--space-6)",
            textAlign: "center",
            background: "var(--surface-inset)",
            borderRadius: "var(--radius-md)",
            color: "var(--gray-500)",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Nothing here yet</div>
          <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
            {filter === "interested"
              ? "Opt in to broadcasts from the 'All' tab to grow this list."
              : "New verifier broadcasts will appear here."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {filtered.map((it) => (
            <article
              key={it.id}
              style={{
                padding: "var(--space-4)",
                background: "var(--surface-card)",
                border: "1px solid var(--surface-border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-sm)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 4,
                  height: "100%",
                  background: it.interested
                    ? "linear-gradient(180deg, var(--success-500, var(--success-400)), var(--brand-500))"
                    : it.alreadyResponded
                      ? "var(--gray-300)"
                      : "linear-gradient(180deg, var(--brand-500), #8b5cf6)",
                }}
              />
              <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--brand-500), #8b5cf6)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    flexShrink: 0,
                  }}
                >
                  {(it.verifierName || "V").slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      {it.verifierName || it.verifierDid.slice(0, 24) + "…"}
                    </span>
                    <TrustBadge level={it.verifierTrustLevel} />
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--gray-500)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                      title={describeTrustLevel(it.verifierTrustLevel)}
                    >
                      {it.verifierRole || "verifier"}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--gray-500)", marginLeft: "auto" }}>
                      {relativeTime(it.createdAt)}
                    </span>
                  </div>
                  <h4
                    style={{
                      margin: "4px 0 6px",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "var(--gray-900)",
                    }}
                  >
                    {it.purpose}
                  </h4>
                  <div style={{ fontSize: "0.8rem", color: "var(--gray-600)", marginBottom: 8 }}>
                    Looking for:
                    {it.requiredTypes.map((t) => (
                      <span
                        key={t}
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          margin: "0 4px",
                          borderRadius: 999,
                          background: "var(--brand-100)",
                          color: "var(--brand-700)",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {it.requiredFields && Object.keys(it.requiredFields).length > 0 && (
                    <details
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--gray-600)",
                        marginBottom: 8,
                      }}
                    >
                      <summary style={{ cursor: "pointer", color: "var(--brand-700)" }}>
                        Required fields
                      </summary>
                      <div style={{ padding: "6px 0" }}>
                        {Object.entries(it.requiredFields).map(([type, fields]) => (
                          <div key={type} style={{ marginTop: 3 }}>
                            <strong>{type}:</strong> {fields.join(", ")}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--gray-500)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <BellIcon /> {it.interestedCount} interested
                    </span>
                    {it.expiresAt && (
                      <span style={{ fontSize: "0.7rem", color: "var(--gray-500)" }}>
                        Expires {new Date(it.expiresAt).toLocaleString()}
                      </span>
                    )}

                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      {it.alreadyResponded ? (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: "var(--success-50)",
                            color: "var(--success-700)",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <CheckIcon /> You responded
                        </span>
                      ) : it.interested ? (
                        <>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              padding: "4px 10px",
                              borderRadius: 999,
                              background: "var(--brand-100)",
                              color: "var(--brand-700)",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <CheckIcon /> In your inbox
                          </span>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setInterest(it.id, false)}
                            disabled={busyId === it.id}
                            style={{ padding: "4px 10px", fontSize: "0.7rem" }}
                          >
                            Withdraw
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={() => setInterest(it.id, true)}
                          disabled={busyId === it.id}
                          style={{ padding: "4px 14px", fontSize: "0.75rem" }}
                        >
                          {busyId === it.id ? "…" : "I'm interested"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
