import { randomUUID } from "crypto";
import { getDidRegistry } from "./web3Client";

export interface DidRecord {
  did: string;
  publicKey: string;
  createdAt: string;
}

export const createDid = async (): Promise<DidRecord> => {
  const did = `did:chainshield:${randomUUID()}`;
  const publicKey = `0x${randomUUID().replace(/-/g, "")}`;
  const registry = getDidRegistry();

  const tx = await registry.registerDID(did, publicKey);
  await tx.wait();

  return {
    did,
    publicKey,
    createdAt: new Date().toISOString()
  };
};

export const listDids = async (): Promise<DidRecord[]> => {
  // On-chain enumeration is not supported in the simple registry.
  return [];
};

