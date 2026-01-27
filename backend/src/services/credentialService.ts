import { env } from "../config/env";
import { mockCredentialRegistry } from "./mockStorage";

// Check if we're in demo mode (no blockchain config)
const isDemoMode = !env.web3ProviderUrl || !env.credentialRegistryAddress || !env.issuerPrivateKey;

if (isDemoMode) {
  console.log("[Credential Service] Running in DEMO MODE - using mock storage");
}

export interface CredentialPayload {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  signature?: string;
  status: "valid" | "revoked" | "expired";
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
      signature
    );
    return {
      credentialId: record.credentialId,
      issuerDid: record.issuerDid,
      holderDid: record.holderDid,
      ipfsHash: record.ipfsHash,
      signature: record.signature,
      status: record.status,
    };
  }

  // Real blockchain mode
  const { getCredentialRegistry } = await import("./web3Client");
  const registry = getCredentialRegistry();
  const tx = await registry.registerCredential(
    payload.credentialId,
    payload.issuerDid,
    payload.holderDid,
    payload.ipfsHash,
    signature
  );
  await tx.wait();

  return {
    ...payload,
    signature,
    status: "valid",
  };
};

export const getCredential = async (
  credentialId: string
): Promise<CredentialPayload | null> => {
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
    };
  }

  // Real blockchain mode
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
    return {
      credentialId: record.credentialId,
      status: record.status,
    };
  }

  // Real blockchain mode
  const { getCredentialRegistry } = await import("./web3Client");
  const registry = getCredentialRegistry();
  const tx = await registry.revokeCredential(credentialId);
  await tx.wait();
  return {
    credentialId,
    status: "revoked",
  };
};

export const getCredentialsByHolder = async (
  holderDid: string
): Promise<CredentialPayload[]> => {
  if (isDemoMode) {
    const records = mockCredentialRegistry.getByHolderDid(holderDid);
    return records.map((record) => ({
      credentialId: record.credentialId,
      issuerDid: record.issuerDid,
      holderDid: record.holderDid,
      ipfsHash: record.ipfsHash,
      signature: record.signature,
      status: record.status,
    }));
  }
  // Real blockchain mode would query events or use subgraph
  return [];
};

export const getCredentialsByIssuer = async (
  issuerDid: string
): Promise<CredentialPayload[]> => {
  if (isDemoMode) {
    const records = mockCredentialRegistry.getByIssuerDid(issuerDid);
    return records.map((record) => ({
      credentialId: record.credentialId,
      issuerDid: record.issuerDid,
      holderDid: record.holderDid,
      ipfsHash: record.ipfsHash,
      signature: record.signature,
      status: record.status,
    }));
  }
  return [];
};

const mapStatus = (status: number | bigint): "valid" | "revoked" | "expired" => {
  const statusValue = Number(status);
  if (statusValue === 1) return "revoked";
  if (statusValue === 2) return "expired";
  return "valid";
};
