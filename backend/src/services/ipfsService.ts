/**
 * IPFS service — uploads credential payloads to IPFS via Pinata and
 * fetches them back by CID.
 *
 * Behaviour:
 *  - If `PINATA_JWT` (or `PINATA_API_KEY` + `PINATA_API_SECRET`) is set,
 *    `putJson` pins the payload to Pinata and returns `ipfs://<cid>`.
 *  - Otherwise we fall back to a deterministic `sha256:<hex>` content
 *    hash so the credential schema stays the same and existing dev
 *    flows keep working without IPFS credentials.
 *
 * The value returned here is what gets written to the `ipfsHash` slot
 * of the on-chain `CredentialRegistry` record.
 */
import { createHash } from "crypto";

const PINATA_JSON_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs";
const PUBLIC_FALLBACK_GATEWAYS = [
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://dweb.link/ipfs",
];

export interface IpfsPutResult {
  /** Value suitable for storing in `ipfsHash`. `ipfs://<cid>` when pinned, `sha256:<hex>` fallback. */
  pointer: string;
  /** CID (without `ipfs://` prefix) when a real upload happened. */
  cid?: string;
  /** Deterministic sha256 of the canonical JSON — always computed, even in fallback. */
  contentHash: string;
  /** Whether the payload was actually pinned to IPFS. */
  pinned: boolean;
  /** Where we uploaded to (or why we didn't). */
  provider: "pinata" | "sha256-fallback";
}

export interface IpfsConfig {
  enabled: boolean;
  provider: "pinata" | "none";
  gateway: string;
  reason?: string;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function canonicalJson(value: unknown): string {
  // Deterministic stringify: sort object keys recursively so the same
  // logical payload always produces the same content hash.
  const seen = new WeakSet<object>();
  const sortKeys = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v as object)) {
      throw new Error("Cannot canonicalise cyclic JSON");
    }
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(sortKeys);
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortKeys(obj[key]);
    }
    return out;
  };
  return JSON.stringify(sortKeys(value));
}

export function getIpfsConfig(): IpfsConfig {
  const jwt = process.env.PINATA_JWT?.trim();
  const apiKey = process.env.PINATA_API_KEY?.trim();
  const apiSecret = process.env.PINATA_API_SECRET?.trim();
  const gateway = (process.env.IPFS_GATEWAY_URL?.trim() || DEFAULT_GATEWAY).replace(/\/+$/, "");

  if (jwt || (apiKey && apiSecret)) {
    return { enabled: true, provider: "pinata", gateway };
  }
  return {
    enabled: false,
    provider: "none",
    gateway,
    reason: "No PINATA_JWT (or PINATA_API_KEY + PINATA_API_SECRET) set; falling back to sha256 content hash.",
  };
}

function buildPinataHeaders(): HeadersInit {
  const jwt = process.env.PINATA_JWT?.trim();
  if (jwt) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    };
  }
  const apiKey = process.env.PINATA_API_KEY?.trim();
  const apiSecret = process.env.PINATA_API_SECRET?.trim();
  if (apiKey && apiSecret) {
    return {
      "Content-Type": "application/json",
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    };
  }
  throw new Error("Pinata credentials missing");
}

/**
 * Pin a JSON payload to IPFS via Pinata. Falls back to a `sha256:<hex>`
 * pointer when Pinata is not configured so callers always get a
 * deterministic string to anchor on-chain.
 */
export async function putJson(
  payload: unknown,
  opts?: { name?: string }
): Promise<IpfsPutResult> {
  const canonical = canonicalJson(payload);
  const contentHash = sha256Hex(canonical);
  const config = getIpfsConfig();

  if (!config.enabled) {
    return {
      pointer: `sha256:${contentHash}`,
      contentHash,
      pinned: false,
      provider: "sha256-fallback",
    };
  }

  try {
    const res = await fetch(PINATA_JSON_ENDPOINT, {
      method: "POST",
      headers: buildPinataHeaders(),
      body: JSON.stringify({
        pinataContent: payload,
        pinataMetadata: {
          name: opts?.name || "chainshield-vc",
          keyvalues: { contentHash, issuedAt: new Date().toISOString() },
        },
        pinataOptions: { cidVersion: 1 },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Pinata upload failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const body = (await res.json()) as { IpfsHash?: string };
    const cid = body.IpfsHash;
    if (!cid) throw new Error("Pinata response missing IpfsHash");

    return {
      pointer: `ipfs://${cid}`,
      cid,
      contentHash,
      pinned: true,
      provider: "pinata",
    };
  } catch (err) {
    // Don't break credential issuance when IPFS is flaky — log and fall
    // back to the content-hash pointer so the on-chain anchor still happens.
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[IPFS] Pinata upload failed, falling back to sha256 pointer:", msg);
    return {
      pointer: `sha256:${contentHash}`,
      contentHash,
      pinned: false,
      provider: "sha256-fallback",
    };
  }
}

/**
 * Convert an on-chain `ipfsHash` value into something fetchable.
 * Accepts `ipfs://<cid>`, bare `<cid>`, or `sha256:<hex>` (not fetchable).
 */
export function resolvePointer(
  pointer: string
): { kind: "ipfs"; cid: string; gatewayUrl: string; fallbackUrls: string[] }
  | { kind: "sha256"; hash: string }
  | { kind: "unknown"; raw: string } {
  const config = getIpfsConfig();
  const p = (pointer || "").trim();
  if (!p) return { kind: "unknown", raw: p };
  if (p.startsWith("sha256:")) return { kind: "sha256", hash: p.slice("sha256:".length) };

  let cid = p;
  if (p.startsWith("ipfs://")) cid = p.slice("ipfs://".length);

  const cidLike = /^[A-Za-z0-9]{46,}$/.test(cid) || cid.startsWith("bafy") || cid.startsWith("Qm");
  if (!cidLike) return { kind: "unknown", raw: p };

  return {
    kind: "ipfs",
    cid,
    gatewayUrl: `${config.gateway}/${cid}`,
    fallbackUrls: PUBLIC_FALLBACK_GATEWAYS.map((g) => `${g}/${cid}`),
  };
}

/**
 * Fetch a JSON payload referenced by an on-chain `ipfsHash` pointer.
 * Tries the configured gateway first, then a small pool of public
 * gateways. Returns `null` for sha256 pointers (nothing to fetch).
 */
export async function fetchJson(pointer: string): Promise<{
  data: unknown;
  gateway: string;
} | null> {
  const resolved = resolvePointer(pointer);
  if (resolved.kind !== "ipfs") return null;

  const urls = [resolved.gatewayUrl, ...resolved.fallbackUrls];
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} from ${url}`);
        continue;
      }
      const data = await res.json();
      return { data, gateway: url };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Failed to fetch ${pointer} from any gateway: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  );
}

/** Light-weight probe used by `/api/chain/status` and the UI to show IPFS health. */
export async function checkIpfsHealth(): Promise<{
  configured: boolean;
  provider: "pinata" | "none";
  reachable: boolean;
  gateway: string;
  error?: string;
}> {
  const config = getIpfsConfig();
  if (!config.enabled) {
    return {
      configured: false,
      provider: "none",
      reachable: false,
      gateway: config.gateway,
      error: config.reason,
    };
  }
  try {
    const res = await fetch("https://api.pinata.cloud/data/testAuthentication", {
      headers: buildPinataHeaders(),
    });
    if (!res.ok) {
      return {
        configured: true,
        provider: "pinata",
        reachable: false,
        gateway: config.gateway,
        error: `Pinata auth returned ${res.status}`,
      };
    }
    return { configured: true, provider: "pinata", reachable: true, gateway: config.gateway };
  } catch (err) {
    return {
      configured: true,
      provider: "pinata",
      reachable: false,
      gateway: config.gateway,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
