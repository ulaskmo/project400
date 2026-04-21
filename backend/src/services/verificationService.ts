import { getCredential } from "./credentialService";
import { getDid } from "./didService";
import { getUserByDid } from "./authService";
import { verifyVerifiableCredential, VerifiableCredential } from "./vcService";

export interface VerificationResult {
  credentialId: string;
  status: "valid" | "invalid" | "revoked" | "expired";
  details?: string;
  issuer?: {
    did: string;
    verified: boolean;
    name?: string;
    role?: string;
    trustLevel?: "unverified" | "verified" | "accredited";
  };
  holder?: {
    did: string;
  };
  metadata?: {
    type?: string;
    subjectName?: string;
    description?: string;
    issuedBy?: string;
    expiresAt?: string;
    subjectFields?: Record<string, unknown>;
  };
  cryptoProof?: {
    signatureValid: boolean;
    algorithm: "Ed25519" | null;
    allDisclosuresValid: boolean;
    issuerKeyKnown: boolean;
    reason?: string;
  };
  timestamp: string;
}

async function resolveIssuer(
  issuerDid: string
): Promise<{
  name?: string;
  role?: string;
  trustLevel: "unverified" | "verified" | "accredited";
}> {
  const issuerUser = await getUserByDid(issuerDid);
  const trustLevel =
    (issuerUser?.trustLevel as "unverified" | "verified" | "accredited" | undefined) ??
    "unverified";
  return {
    name: issuerUser?.organizationName || issuerUser?.email,
    role: issuerUser?.role,
    trustLevel,
  };
}

export const verifyCredential = async (
  credentialId: string
): Promise<VerificationResult> => {
  const timestamp = new Date().toISOString();

  // Step 1: Fetch credential from registry
  const credential = await getCredential(credentialId);

  if (!credential) {
    return {
      credentialId,
      status: "invalid",
      details: "Credential not found in registry",
      timestamp,
    };
  }

  const resolved = await resolveIssuer(credential.issuerDid);

  // Verify cryptographic proof if the VC is present
  let cryptoProof: VerificationResult["cryptoProof"];
  if (credential.vc) {
    try {
      const r = await verifyVerifiableCredential(
        credential.vc as VerifiableCredential
      );
      cryptoProof = {
        signatureValid: r.signatureValid,
        algorithm: "Ed25519",
        allDisclosuresValid: r.allDisclosuresValid,
        issuerKeyKnown: r.issuerKnown,
        reason: r.reason,
      };
    } catch (err) {
      cryptoProof = {
        signatureValid: false,
        algorithm: "Ed25519",
        allDisclosuresValid: false,
        issuerKeyKnown: false,
        reason: (err as Error).message,
      };
    }
  } else {
    cryptoProof = {
      signatureValid: false,
      algorithm: null,
      allDisclosuresValid: false,
      issuerKeyKnown: false,
      reason: "No W3C VC proof attached (legacy credential)",
    };
  }

  // Step 2: Check if revoked or expired
  if (credential.status === "revoked") {
    return {
      credentialId,
      status: "revoked",
      details: "This credential has been revoked by the issuer",
      issuer: { did: credential.issuerDid, verified: true, ...resolved },
      holder: { did: credential.holderDid },
      metadata: credential.metadata,
      cryptoProof,
      timestamp,
    };
  }

  if (credential.status === "expired") {
    return {
      credentialId,
      status: "expired",
      details: "This credential has expired",
      issuer: { did: credential.issuerDid, verified: true, ...resolved },
      holder: { did: credential.holderDid },
      metadata: credential.metadata,
      cryptoProof,
      timestamp,
    };
  }

  // Step 3: Verify issuer DID exists
  const issuerDid = await getDid(credential.issuerDid);
  const issuerVerified = issuerDid !== null;

  return {
    credentialId,
    status: "valid",
    details: cryptoProof.signatureValid
      ? "Credential is authentic, cryptographically signed, and not revoked"
      : "Credential is registered and not revoked",
    issuer: {
      did: credential.issuerDid,
      verified: issuerVerified,
      ...resolved,
    },
    holder: {
      did: credential.holderDid,
    },
    metadata: credential.metadata,
    cryptoProof,
    timestamp,
  };
};
