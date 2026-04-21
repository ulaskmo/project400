import { isBlockchainMode } from "../config/env";
import { mockCredentialRegistry, CredentialMetadata } from "./mockStorage";
import { loadCredentials, saveCredentials, StoredCredentialRecord } from "./credentialStorage";

const isDemoMode = !isBlockchainMode();

if (isDemoMode) {
  console.log("[Credential Service] Running in DEMO MODE - using mock storage");
} else {
  console.log("[Credential Service] Running in BLOCKCHAIN MODE - credentials stored on-chain + local index");
}

// Local credential index — always loaded from file
const credentialIndex = new Map<string, StoredCredentialRecord>();

// Load persisted credentials on startup
const stored = loadCredentials();
stored.forEach((c) => credentialIndex.set(c.credentialId, c));
console.log(`[Credential Service] Loaded ${credentialIndex.size} credentials from local storage`);

function persistIndex() {
  saveCredentials(Array.from(credentialIndex.values()));
}

interface ChainAnchor {
  txHash: string;
  blockNumber: number;
  chainId: number;
  anchoredAt: string;
}

function addToIndex(
  payload: CredentialPayload,
  onChain: boolean,
  anchor?: ChainAnchor
) {
  const record: StoredCredentialRecord = {
    credentialId: payload.credentialId,
    issuerDid: payload.issuerDid,
    holderDid: payload.holderDid,
    ipfsHash: payload.ipfsHash,
    signature: payload.signature || "",
    status: payload.status,
    issuedAt: new Date().toISOString(),
    metadata: payload.metadata,
    onChain,
    txHash: anchor?.txHash,
    blockNumber: anchor?.blockNumber,
    chainId: anchor?.chainId,
    anchoredAt: anchor?.anchoredAt,
    vc: payload.vc,
  };
  credentialIndex.set(payload.credentialId, record);
  persistIndex();
}

export interface CredentialPayload {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  signature?: string;
  status: "valid" | "revoked" | "expired";
  metadata?: CredentialMetadata;
  vc?: unknown;
}

export function getCredentialRecord(
  credentialId: string
): StoredCredentialRecord | null {
  return credentialIndex.get(credentialId) ?? null;
}

export const issueCredential = async (
  payload: Omit<CredentialPayload, "status">
): Promise<CredentialPayload> => {
  const signature = payload.signature ?? `sig_${Date.now()}`;

  if (isDemoMode) {
    const record = await mockCredentialRegistry.registerCredential(
      payload.credentialId,
      payload.issuerDid,
      payload.holderDid,
      payload.ipfsHash,
      signature,
      payload.metadata
    );
    const result: CredentialPayload = {
      credentialId: record.credentialId,
      issuerDid: record.issuerDid,
      holderDid: record.holderDid,
      ipfsHash: record.ipfsHash,
      signature: record.signature,
      status: record.status,
      metadata: record.metadata,
    };
    addToIndex(result, false);
    return result;
  }

  // Blockchain mode — write to chain first. If the chain write fails we
  // refuse to persist anything locally so the UI doesn't silently keep
  // divergent state between the two sources of truth.
  let anchor: ChainAnchor | undefined;
  try {
    const { getCredentialRegistry, provider } = await import("./web3Client");
    const registry = getCredentialRegistry();
    const tx = await registry.registerCredential(
      payload.credentialId,
      payload.issuerDid,
      payload.holderDid,
      payload.ipfsHash,
      signature
    );
    const receipt = await tx.wait();
    const network = await provider.getNetwork();
    anchor = {
      txHash: tx.hash,
      blockNumber: Number(receipt?.blockNumber ?? 0),
      chainId: Number(network.chainId),
      anchoredAt: new Date().toISOString(),
    };
    console.log(
      `[Credential Service] Credential ${payload.credentialId} anchored on chain`,
      anchor
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[Credential Service] Blockchain write failed for ${payload.credentialId}:`,
      err
    );
    throw new Error(
      `Could not anchor credential on chain: ${msg}. No credential was issued.`
    );
  }

  const result: CredentialPayload = {
    ...payload,
    signature,
    status: "valid",
  };
  addToIndex(result, true, anchor);
  return result;
};

export const getCredential = async (
  credentialId: string
): Promise<CredentialPayload | null> => {
  // Check local index first
  const local = credentialIndex.get(credentialId);
  if (local) {
    return {
      credentialId: local.credentialId,
      issuerDid: local.issuerDid,
      holderDid: local.holderDid,
      ipfsHash: local.ipfsHash,
      signature: local.signature,
      status: local.status,
      metadata: local.metadata,
      vc: local.vc,
    };
  }

  if (isDemoMode) {
    const record = await mockCredentialRegistry.getCredential(credentialId);
    if (!record) return null;
    return {
      credentialId: record.credentialId,
      issuerDid: record.issuerDid,
      holderDid: record.holderDid,
      ipfsHash: record.ipfsHash,
      signature: record.signature,
      status: record.status,
      metadata: record.metadata,
    };
  }

  // Fallback to blockchain query
  const { getReadOnlyCredentialRegistry } = await import("./web3Client");
  const registry = getReadOnlyCredentialRegistry();
  try {
    const [issuerDid, holderDid, ipfsHash, signature, status] =
      await registry.getCredential(credentialId);
    return {
      credentialId,
      issuerDid,
      holderDid,
      ipfsHash,
      signature,
      status: mapStatus(status),
    };
  } catch {
    return null;
  }
};

export const revokeCredential = async (credentialId: string) => {
  if (isDemoMode) {
    const record = await mockCredentialRegistry.revokeCredential(credentialId);
    // Update local index
    const local = credentialIndex.get(credentialId);
    if (local) {
      local.status = "revoked";
      local.revokedAt = new Date().toISOString();
      persistIndex();
    }
    return {
      credentialId: record.credentialId,
      status: record.status,
    };
  }

  // Blockchain mode — require successful on-chain revoke before mutating
  // local state so we never show "revoked" locally for a credential that's
  // still valid on-chain.
  let revokeTxHash: string | undefined;
  let revokeBlockNumber: number | undefined;
  try {
    const { getCredentialRegistry } = await import("./web3Client");
    const registry = getCredentialRegistry();
    const tx = await registry.revokeCredential(credentialId);
    const receipt = await tx.wait();
    revokeTxHash = tx.hash;
    revokeBlockNumber = Number(receipt?.blockNumber ?? 0);
    console.log(
      `[Credential Service] Credential ${credentialId} revoked on chain (tx ${revokeTxHash})`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Credential Service] Blockchain revoke failed:`, err);
    throw new Error(`Could not revoke credential on chain: ${msg}.`);
  }

  const local = credentialIndex.get(credentialId);
  if (local) {
    local.status = "revoked";
    local.revokedAt = new Date().toISOString();
    local.revokeTxHash = revokeTxHash;
    local.revokeBlockNumber = revokeBlockNumber;
    persistIndex();
  }

  return {
    credentialId,
    status: "revoked",
  };
};

export const getCredentialsByHolder = async (
  holderDid: string
): Promise<CredentialPayload[]> => {
  // Always use local index — it has all credentials regardless of mode
  const results: CredentialPayload[] = [];

  credentialIndex.forEach((record) => {
    if (record.holderDid === holderDid) {
      results.push({
        credentialId: record.credentialId,
        issuerDid: record.issuerDid,
        holderDid: record.holderDid,
        ipfsHash: record.ipfsHash,
        signature: record.signature,
        status: record.status,
        metadata: record.metadata,
        vc: record.vc,
      });
    }
  });

  // Also check demo mock storage in case there are entries not in index
  if (isDemoMode) {
    const mockRecords = mockCredentialRegistry.getByHolderDid(holderDid);
    for (const record of mockRecords) {
      if (!credentialIndex.has(record.credentialId)) {
        results.push({
          credentialId: record.credentialId,
          issuerDid: record.issuerDid,
          holderDid: record.holderDid,
          ipfsHash: record.ipfsHash,
          signature: record.signature,
          status: record.status,
          metadata: record.metadata,
        });
      }
    }
  }

  return results;
};

export const getCredentialsByIssuer = async (
  issuerDid: string
): Promise<CredentialPayload[]> => {
  const results: CredentialPayload[] = [];

  credentialIndex.forEach((record) => {
    if (record.issuerDid === issuerDid) {
      results.push({
        credentialId: record.credentialId,
        issuerDid: record.issuerDid,
        holderDid: record.holderDid,
        ipfsHash: record.ipfsHash,
        signature: record.signature,
        status: record.status,
        metadata: record.metadata,
        vc: record.vc,
      });
    }
  });

  if (isDemoMode) {
    const mockRecords = mockCredentialRegistry.getByIssuerDid(issuerDid);
    for (const record of mockRecords) {
      if (!credentialIndex.has(record.credentialId)) {
        results.push({
          credentialId: record.credentialId,
          issuerDid: record.issuerDid,
          holderDid: record.holderDid,
          ipfsHash: record.ipfsHash,
          signature: record.signature,
          status: record.status,
          metadata: record.metadata,
        });
      }
    }
  }

  return results;
};

// Also expose for stats controller
export const getAllCredentials = (): CredentialPayload[] => {
  const results: CredentialPayload[] = [];
  credentialIndex.forEach((record) => {
    results.push({
      credentialId: record.credentialId,
      issuerDid: record.issuerDid,
      holderDid: record.holderDid,
      ipfsHash: record.ipfsHash,
      signature: record.signature,
      status: record.status,
      metadata: record.metadata,
    });
  });
  return results;
};

const mapStatus = (status: number | bigint): "valid" | "revoked" | "expired" => {
  const statusValue = Number(status);
  if (statusValue === 1) return "revoked";
  if (statusValue === 2) return "expired";
  return "valid";
};
