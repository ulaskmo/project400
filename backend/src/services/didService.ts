import { randomUUID } from "crypto";
import { env } from "../config/env";
import { mockDidRegistry } from "./mockStorage";

// Check if we're in demo mode (no blockchain config)
const isDemoMode = !env.web3ProviderUrl || !env.didRegistryAddress || !env.issuerPrivateKey;

if (isDemoMode) {
  console.log("[DID Service] Running in DEMO MODE - using mock storage");
}

export interface DidRecord {
  did: string;
  publicKey: string;
  createdAt: string;
}

export const createDid = async (): Promise<DidRecord> => {
  const did = `did:chainshield:${randomUUID()}`;
  const publicKey = `0x${randomUUID().replace(/-/g, "")}`;

  if (isDemoMode) {
    // Use mock storage
    const record = await mockDidRegistry.registerDID(did, publicKey);
    return {
      did: record.did,
      publicKey: record.publicKey,
      createdAt: record.createdAt.toISOString(),
    };
  }

  // Real blockchain mode
  const { getDidRegistry } = await import("./web3Client");
  const registry = getDidRegistry();
  const tx = await registry.registerDID(did, publicKey);
  await tx.wait();

  return {
    did,
    publicKey,
    createdAt: new Date().toISOString(),
  };
};

export const getDid = async (did: string): Promise<DidRecord | null> => {
  if (isDemoMode) {
    const record = await mockDidRegistry.getDID(did);
    if (!record) return null;
    return {
      did: record.did,
      publicKey: record.publicKey,
      createdAt: record.createdAt.toISOString(),
    };
  }

  // Real blockchain mode
  const { getReadOnlyDidRegistry } = await import("./web3Client");
  const registry = getReadOnlyDidRegistry();
  try {
    const [, publicKey, createdAt] = await registry.getDID(did);
    return {
      did,
      publicKey,
      createdAt: new Date(Number(createdAt) * 1000).toISOString(),
    };
  } catch {
    return null;
  }
};

export const listDids = async (): Promise<DidRecord[]> => {
  if (isDemoMode) {
    return mockDidRegistry.listAll().map((r) => ({
      did: r.did,
      publicKey: r.publicKey,
      createdAt: r.createdAt.toISOString(),
    }));
  }
  // On-chain enumeration is not supported in the simple registry.
  return [];
};
