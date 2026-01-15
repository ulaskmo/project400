import {
  getCredentialRegistry,
  getReadOnlyCredentialRegistry
} from "./web3Client";

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
  const registry = getCredentialRegistry();
  const signature = payload.signature ?? "";

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
    status: "valid"
  };
};

export const getCredential = async (
  credentialId: string
): Promise<CredentialPayload | null> => {
  const registry = getReadOnlyCredentialRegistry();

  try {
    const [
      issuerDid,
      holderDid,
      ipfsHash,
      signature,
      status
    ] = await registry.getCredential(credentialId);

    return {
      credentialId,
      issuerDid,
      holderDid,
      ipfsHash,
      signature,
      status: mapStatus(status)
    };
  } catch (error) {
    return null;
  }
};

export const revokeCredential = async (credentialId: string) => {
  const registry = getCredentialRegistry();
  const tx = await registry.revokeCredential(credentialId);
  await tx.wait();
  return {
    credentialId,
    status: "revoked"
  };
};

const mapStatus = (status: number | bigint) => {
  const statusValue = Number(status);
  if (statusValue === 1) {
    return "revoked";
  }
  if (statusValue === 2) {
    return "expired";
  }
  return "valid";
};

