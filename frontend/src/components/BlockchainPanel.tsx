import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";

// ---------- Types ----------

interface ChainInfo {
  mode: "blockchain" | "demo";
  ready: boolean;
  providerUrl?: string;
  chainId?: number;
  networkName?: string;
  latestBlock?: number;
  contractAddress?: string;
  didRegistryAddress?: string;
  issuerAddress?: string;
  issuerBalanceWei?: string;
  explorerBase?: string;
  error?: string;
}

interface AnchoredCredential {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  signature: string;
  status: string;
  onChain: boolean;
  txHash?: string;
  blockNumber?: number;
  chainId?: number;
  anchoredAt?: string;
  issuedAt?: string;
  metadata?: {
    type?: string;
    subjectName?: string;
    description?: string;
    issuedBy?: string;
  };
}

interface OnChainRecord {
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  signature: string;
  status: string;
  issuedAt: string;
  revokedAt?: string;
}

interface VerifyResult {
  credentialId: string;
  localRecord: Record<string, unknown> | null;
  onChainRecord: OnChainRecord | null;
  matches: {
    issuerDid: boolean;
    holderDid: boolean;
    ipfsHash: boolean;
    signature: boolean;
    status: boolean;
    all: boolean;
  } | null;
  chainInfo: {
    chainId?: number;
    networkName?: string;
    explorerBase?: string;
    txHash?: string;
    blockNumber?: number;
  };
  mode: "blockchain" | "demo";
  note?: string;
}

// ---------- Utilities ----------

function truncateMid(s: string, left = 8, right = 6): string {
  if (!s) return "";
  if (s.length <= left + right + 3) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}

function formatEth(wei?: string): string {
  if (!wei) return "—";
  try {
    const bi = BigInt(wei);
    const whole = bi / 10n ** 18n;
    const frac = bi % 10n ** 18n;
    const fracStr = frac.toString().padStart(18, "0").slice(0, 6);
    return `${whole}.${fracStr}`;
  } catch {
    return "—";
  }
}

// ---------- Icons ----------

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const CheckIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

const SpinnerIcon = () => (
  <span
    className="spinner"
    style={{ width: 14, height: 14, display: "inline-block" }}
  />
);

// ---------- Component ----------

export function BlockchainPanel() {
  const [info, setInfo] = useState<ChainInfo | null>(null);
  const [credentials, setCredentials] = useState<AnchoredCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, VerifyResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [infoRes, credsRes] = await Promise.all([
        apiGet<ChainInfo>("/chain/info"),
        apiGet<{ credentials: AnchoredCredential[] }>("/chain/my-anchors"),
      ]);
      setInfo(infoRes);
      setCredentials(credsRes.credentials ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const iv = setInterval(() => loadAll(true), 15000);
    return () => clearInterval(iv);
  }, [loadAll]);

  const verifyCredential = async (id: string) => {
    setVerifying(id);
    try {
      const res = await apiGet<VerifyResult>(
        `/chain/credentials/${encodeURIComponent(id)}`
      );
      setVerifyResults((prev) => ({ ...prev, [id]: res }));
      setExpanded(id);
    } catch (err) {
      setVerifyResults((prev) => ({
        ...prev,
        [id]: {
          credentialId: id,
          localRecord: null,
          onChainRecord: null,
          matches: null,
          chainInfo: {},
          mode: info?.mode ?? "demo",
          note: (err as Error).message,
        },
      }));
      setExpanded(id);
    } finally {
      setVerifying(null);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-10)" }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <div style={{ marginTop: 12, color: "var(--gray-500)" }}>
          Reading chain state…
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Status card */}
      <div
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-5) var(--space-6)",
          background:
            info?.mode === "blockchain" && info.ready
              ? "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 45%, #ffffff 100%)"
              : "linear-gradient(135deg, #fff7ed 0%, #fef3c7 45%, #ffffff 100%)",
          border: `1px solid ${
            info?.mode === "blockchain" && info.ready
              ? "rgba(99,102,241,0.3)"
              : "rgba(245,158,11,0.35)"
          }`,
          boxShadow: "var(--shadow-sm)",
          marginBottom: "var(--space-5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--space-3)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background:
                  info?.ready
                    ? "#10b981"
                    : info?.mode === "demo"
                    ? "#f59e0b"
                    : "#ef4444",
                boxShadow:
                  info?.ready
                    ? "0 0 0 4px rgba(16,185,129,0.2)"
                    : info?.mode === "demo"
                    ? "0 0 0 4px rgba(245,158,11,0.2)"
                    : "0 0 0 4px rgba(239,68,68,0.2)",
                animation: info?.ready ? "chainshield-pulse-ok 2s ease-in-out infinite" : undefined,
              }}
            />
            <h3
              style={{
                margin: 0,
                fontSize: "1.125rem",
                color: "var(--gray-900)",
                fontWeight: 700,
              }}
            >
              {info?.mode === "blockchain" && info.ready
                ? `Connected to ${info.networkName ?? "network"}`
                : info?.mode === "blockchain"
                ? "Blockchain not reachable"
                : "Demo mode — no blockchain connected"}
            </h3>
          </div>
          <button
            onClick={() => loadAll()}
            className="btn btn-secondary"
            style={{ padding: "6px 10px", fontSize: "0.75rem" }}
          >
            <RefreshIcon /> Refresh
          </button>
        </div>

        {info?.error && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#991b1b",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
              marginBottom: "var(--space-3)",
            }}
          >
            {info.error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--space-3)",
            fontSize: "0.8rem",
          }}
        >
          <InfoCell label="Mode" value={info?.mode === "blockchain" ? "Blockchain" : "Demo"} />
          <InfoCell label="Network" value={info?.networkName ?? "—"} />
          <InfoCell label="Chain ID" value={info?.chainId?.toString() ?? "—"} mono />
          <InfoCell label="Latest block" value={info?.latestBlock?.toLocaleString() ?? "—"} mono />
          <InfoCell
            label="Credential contract"
            value={info?.contractAddress ? truncateMid(info.contractAddress, 10, 8) : "—"}
            mono
            link={
              info?.contractAddress && info?.explorerBase
                ? `${info.explorerBase}/address/${info.contractAddress}`
                : undefined
            }
          />
          <InfoCell
            label="Issuer wallet"
            value={info?.issuerAddress ? truncateMid(info.issuerAddress, 10, 8) : "—"}
            mono
            link={
              info?.issuerAddress && info?.explorerBase
                ? `${info.explorerBase}/address/${info.issuerAddress}`
                : undefined
            }
          />
          <InfoCell
            label="Issuer balance"
            value={`${formatEth(info?.issuerBalanceWei)} ${
              info?.chainId === 80002 || info?.chainId === 137 ? "MATIC" : "ETH"
            }`}
            mono
          />
          <InfoCell
            label="RPC"
            value={info?.providerUrl ? truncateMid(info.providerUrl, 18, 10) : "—"}
            mono
          />
        </div>

        {info?.mode === "demo" && (
          <div
            style={{
              marginTop: "var(--space-3)",
              fontSize: "0.78rem",
              color: "#7c2d12",
              lineHeight: 1.5,
            }}
          >
            <strong>To enable real blockchain writes:</strong> deploy the
            contracts (<code>cd contracts &amp;&amp; npm run deploy</code>), put
            the resulting addresses into <code>backend/.env</code>, set{" "}
            <code>ISSUER_PRIVATE_KEY</code>, then restart the backend.
          </div>
        )}
      </div>

      {/* Credentials list */}
      {error && (
        <div className="error-message" style={{ marginBottom: "var(--space-3)" }}>
          {error}
        </div>
      )}

      {credentials.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-10)",
            color: "var(--gray-500)",
            border: "1px dashed var(--surface-border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>⛓️</div>
          <div style={{ fontWeight: 600, color: "var(--gray-700)" }}>
            No credentials to anchor yet
          </div>
          <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
            Issue or receive a credential first, then come back to verify it on chain.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {credentials.length} credential{credentials.length === 1 ? "" : "s"}
          </div>
          {credentials.map((c) => {
            const result = verifyResults[c.credentialId];
            const isExpanded = expanded === c.credentialId;
            const isVerifying = verifying === c.credentialId;

            return (
              <div
                key={c.credentialId}
                style={{
                  border: "1px solid var(--surface-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-4) var(--space-5)",
                  background: "var(--surface-card, #fff)",
                  boxShadow: "var(--shadow-sm)",
                  borderLeft: `4px solid ${c.onChain ? "#10b981" : "#f59e0b"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: c.onChain ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                          color: c.onChain ? "#047857" : "#92400e",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          border: `1px solid ${c.onChain ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.35)"}`,
                        }}
                      >
                        {c.onChain ? (
                          <>
                            <span style={{ width: 12, height: 12, display: "inline-flex" }}><CheckIcon size={12} /></span>
                            On-chain
                          </>
                        ) : (
                          <>
                            <span style={{ width: 12, height: 12, display: "inline-flex" }}><XIcon size={12} /></span>
                            Local only
                          </>
                        )}
                      </span>
                      {c.metadata?.type && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "var(--brand-50)",
                            color: "var(--brand-700)",
                            fontWeight: 600,
                            border: "1px solid var(--brand-200)",
                          }}
                        >
                          {c.metadata.type}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color:
                            c.status === "revoked"
                              ? "#b91c1c"
                              : c.status === "expired"
                              ? "#92400e"
                              : "#047857",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--gray-900)",
                        fontSize: "0.95rem",
                        marginBottom: 2,
                      }}
                    >
                      {c.metadata?.subjectName ?? c.metadata?.description ?? c.credentialId}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--gray-500)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {c.credentialId}
                    </div>
                    {c.onChain && c.txHash && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 12,
                          fontSize: "0.75rem",
                          color: "var(--gray-600)",
                        }}
                      >
                        <span>
                          <strong style={{ color: "var(--gray-800)" }}>Tx:</strong>{" "}
                          <span style={{ fontFamily: "var(--font-mono)" }}>
                            {truncateMid(c.txHash, 10, 8)}
                          </span>
                        </span>
                        {c.blockNumber != null && (
                          <span>
                            <strong style={{ color: "var(--gray-800)" }}>Block:</strong>{" "}
                            <span style={{ fontFamily: "var(--font-mono)" }}>
                              #{c.blockNumber.toLocaleString()}
                            </span>
                          </span>
                        )}
                        {info?.explorerBase && (
                          <a
                            href={`${info.explorerBase}/tx/${c.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--brand-600)",
                              textDecoration: "none",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <LinkIcon /> View on explorer
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: "8px 14px", fontSize: "0.8rem" }}
                      onClick={() => verifyCredential(c.credentialId)}
                      disabled={isVerifying || info?.mode !== "blockchain" || !info.ready}
                      title={
                        info?.mode !== "blockchain"
                          ? "Blockchain mode required"
                          : !info.ready
                          ? "Chain not reachable"
                          : "Fetch record live from the contract"
                      }
                    >
                      {isVerifying ? (
                        <>
                          <SpinnerIcon /> Verifying…
                        </>
                      ) : (
                        "Verify on chain"
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && result && (
                  <VerifyDetails result={result} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes chainshield-pulse-ok {
          0%, 100% { box-shadow: 0 0 0 4px rgba(16,185,129,0.2); }
          50% { box-shadow: 0 0 0 8px rgba(16,185,129,0.05); }
        }
      `}</style>
    </div>
  );
}

// ---------- Sub-components ----------

function InfoCell({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  link?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          color: "var(--gray-500)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--brand-700)",
            textDecoration: "none",
            fontWeight: 600,
            fontFamily: mono ? "var(--font-mono)" : undefined,
            fontSize: mono ? "0.78rem" : undefined,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {value}
          <LinkIcon />
        </a>
      ) : (
        <div
          style={{
            color: "var(--gray-900)",
            fontWeight: 600,
            fontFamily: mono ? "var(--font-mono)" : undefined,
            fontSize: mono ? "0.78rem" : undefined,
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function VerifyDetails({ result }: { result: VerifyResult }) {
  if (result.mode === "demo" || !result.onChainRecord) {
    return (
      <div
        style={{
          marginTop: "var(--space-3)",
          padding: "var(--space-3) var(--space-4)",
          background: "rgba(245,158,11,0.1)",
          border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.82rem",
          color: "#7c2d12",
        }}
      >
        {result.note ??
          "This credential is not on any blockchain. Enable blockchain mode to anchor future credentials."}
      </div>
    );
  }

  const rows: Array<{
    label: string;
    local: string | undefined;
    chain: string | undefined;
    match: boolean;
  }> = [
    {
      label: "Issuer DID",
      local: String(result.localRecord?.issuerDid ?? ""),
      chain: result.onChainRecord.issuerDid,
      match: result.matches?.issuerDid ?? false,
    },
    {
      label: "Holder DID",
      local: String(result.localRecord?.holderDid ?? ""),
      chain: result.onChainRecord.holderDid,
      match: result.matches?.holderDid ?? false,
    },
    {
      label: "IPFS / content hash",
      local: String(result.localRecord?.ipfsHash ?? ""),
      chain: result.onChainRecord.ipfsHash,
      match: result.matches?.ipfsHash ?? false,
    },
    {
      label: "Issuer signature",
      local: String(result.localRecord?.signature ?? ""),
      chain: result.onChainRecord.signature,
      match: result.matches?.signature ?? false,
    },
    {
      label: "Status",
      local: String(result.localRecord?.status ?? ""),
      chain: result.onChainRecord.status,
      match: result.matches?.status ?? false,
    },
  ];

  const allMatch = result.matches?.all ?? false;

  return (
    <div
      style={{
        marginTop: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        background: allMatch ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
        border: `1px solid ${allMatch ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
        borderRadius: "var(--radius-md)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: "var(--space-3)",
          fontWeight: 700,
          color: allMatch ? "#047857" : "#991b1b",
        }}
      >
        <span style={{ width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          {allMatch ? <CheckIcon size={18} /> : <XIcon size={18} />}
        </span>
        {allMatch
          ? "Local record matches on-chain record"
          : "Mismatch detected between local and on-chain data"}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr 1fr auto",
          gap: 6,
          fontSize: "0.75rem",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700, color: "var(--gray-500)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Field
        </div>
        <div style={{ fontWeight: 700, color: "var(--gray-500)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Local
        </div>
        <div style={{ fontWeight: 700, color: "var(--gray-500)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          On-chain
        </div>
        <div />

        {rows.map((row) => (
          <RowCells key={row.label} row={row} />
        ))}
      </div>

      {result.chainInfo.txHash && result.chainInfo.explorerBase && (
        <div style={{ marginTop: "var(--space-3)", fontSize: "0.75rem" }}>
          <a
            href={`${result.chainInfo.explorerBase}/tx/${result.chainInfo.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--brand-700)",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <LinkIcon /> Open anchoring transaction on explorer
          </a>
        </div>
      )}
    </div>
  );
}

function RowCells({
  row,
}: {
  row: { label: string; local?: string; chain?: string; match: boolean };
}) {
  return (
    <>
      <div style={{ color: "var(--gray-700)", fontWeight: 600 }}>{row.label}</div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--gray-800)",
          overflowWrap: "anywhere",
        }}
        title={row.local}
      >
        {row.local ? truncateMid(row.local, 14, 10) : "—"}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--gray-800)",
          overflowWrap: "anywhere",
        }}
        title={row.chain}
      >
        {row.chain ? truncateMid(row.chain, 14, 10) : "—"}
      </div>
      <div
        style={{
          color: row.match ? "#047857" : "#991b1b",
          width: 16,
          height: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title={row.match ? "Matches on-chain" : "Does not match on-chain"}
      >
        {row.match ? <CheckIcon size={16} /> : <XIcon size={16} />}
      </div>
    </>
  );
}
