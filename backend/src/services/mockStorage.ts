// In-memory storage for demo mode
// This simulates blockchain storage without requiring actual contracts

export interface StoredDid {
  did: string;
  publicKey: string;
  controller: string;
  createdAt: Date;
}

export interface CredentialMetadata {
  type?: string;
  subjectName?: string;
  description?: string;
  issuedBy?: string;
  expiresAt?: string;
  subjectFields?: Record<string, unknown>;
}

export interface StoredCredential {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  signature: string;
  status: "valid" | "revoked" | "expired";
  issuedAt: Date;
  revokedAt?: Date;
  metadata?: CredentialMetadata;
}

// In-memory stores
const didStore = new Map<string, StoredDid>();
const credentialStore = new Map<string, StoredCredential>();

export const mockDidRegistry = {
  registerDID: async (did: string, publicKey: string): Promise<StoredDid> => {
    if (didStore.has(did)) {
      throw new Error("DID already registered");
    }
    const record: StoredDid = {
      did,
      publicKey,
      controller: "0xDemoController",
      createdAt: new Date(),
    };
    didStore.set(did, record);
    console.log(`[Mock] DID registered: ${did}`);
    return record;
  },

  getDID: async (did: string): Promise<StoredDid | null> => {
    return didStore.get(did) || null;
  },

  listAll: (): StoredDid[] => {
    return Array.from(didStore.values());
  },
};

export const mockCredentialRegistry = {
  registerCredential: async (
    credentialId: string,
    issuerDid: string,
    holderDid: string,
    ipfsHash: string,
    signature: string,
    metadata?: CredentialMetadata
  ): Promise<StoredCredential> => {
    if (credentialStore.has(credentialId)) {
      throw new Error("Credential already registered");
    }
    const record: StoredCredential = {
      credentialId,
      issuerDid,
      holderDid,
      ipfsHash,
      signature,
      status: "valid",
      issuedAt: new Date(),
      metadata,
    };
    credentialStore.set(credentialId, record);
    console.log(`[Mock] Credential registered: ${credentialId}`);
    return record;
  },

  getCredential: async (credentialId: string): Promise<StoredCredential | null> => {
    return credentialStore.get(credentialId) || null;
  },

  revokeCredential: async (credentialId: string): Promise<StoredCredential> => {
    const record = credentialStore.get(credentialId);
    if (!record) {
      throw new Error("Credential not found");
    }
    if (record.status !== "valid") {
      throw new Error("Credential not active");
    }
    record.status = "revoked";
    record.revokedAt = new Date();
    console.log(`[Mock] Credential revoked: ${credentialId}`);
    return record;
  },

  listAll: (): StoredCredential[] => {
    return Array.from(credentialStore.values());
  },

  // Get credentials by holder DID
  getByHolderDid: (holderDid: string): StoredCredential[] => {
    return Array.from(credentialStore.values()).filter(
      (cred) => cred.holderDid === holderDid
    );
  },

  // Get credentials by issuer DID
  getByIssuerDid: (issuerDid: string): StoredCredential[] => {
    return Array.from(credentialStore.values()).filter(
      (cred) => cred.issuerDid === issuerDid
    );
  },
};
