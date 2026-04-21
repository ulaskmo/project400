import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const CREDENTIALS_FILE = join(DATA_DIR, "credentials.json");

export interface StoredCredentialRecord {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  signature: string;
  status: "valid" | "revoked" | "expired";
  issuedAt: string;
  revokedAt?: string;
  metadata?: {
    type?: string;
    subjectName?: string;
    description?: string;
    issuedBy?: string;
    expiresAt?: string;
    subjectFields?: Record<string, unknown>;
  };
  onChain: boolean;
  // Full signed W3C Verifiable Credential (Ed25519). Optional for
  // backward compatibility with pre-migration credentials.
  vc?: unknown;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadCredentials(): StoredCredentialRecord[] {
  try {
    ensureDataDir();
    if (existsSync(CREDENTIALS_FILE)) {
      const data = readFileSync(CREDENTIALS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("[CredentialStorage] Failed to load credentials:", err);
  }
  return [];
}

export function saveCredentials(credentials: StoredCredentialRecord[]): void {
  try {
    ensureDataDir();
    writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), "utf8");
  } catch (err) {
    console.error("[CredentialStorage] Failed to save credentials:", err);
  }
}
