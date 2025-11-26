export interface CredentialPayload {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  status: "valid" | "revoked" | "expired";
}

export const issueCredential = async (
  payload: Omit<CredentialPayload, "status">
): Promise<CredentialPayload> => {
  // TODO: push credential references to blockchain + IPFS
  return {
    ...payload,
    status: "valid"
  };
};

export const getCredential = async (
  credentialId: string
): Promise<CredentialPayload | null> => {
  // Placeholder stub
  return {
    credentialId,
    issuerDid: "did:chainshield:issuer",
    holderDid: "did:chainshield:holder",
    ipfsHash: "QmPlaceholderHash",
    status: "valid"
  };
};

export const revokeCredential = async (credentialId: string) => {
  // Placeholder stub for revocation
  return {
    credentialId,
    status: "revoked"
  };
};

