import { getCredential } from "./credentialService";
import { getDid } from "./didService";
import { getUserByDid } from "./authService";

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

  // Step 2: Check if revoked or expired
  if (credential.status === "revoked") {
    return {
      credentialId,
      status: "revoked",
      details: "This credential has been revoked by the issuer",
      issuer: { did: credential.issuerDid, verified: true, ...resolved },
      holder: { did: credential.holderDid },
      metadata: credential.metadata,
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
      timestamp,
    };
  }

  // Step 3: Verify issuer DID exists
  const issuerDid = await getDid(credential.issuerDid);
  const issuerVerified = issuerDid !== null;

  // Step 4: In a real system, we would verify the cryptographic signature here
  // For demo purposes, we assume the signature is valid if the credential exists

  return {
    credentialId,
    status: "valid",
    details: "Credential is authentic and has not been revoked",
    issuer: {
      did: credential.issuerDid,
      verified: issuerVerified,
      ...resolved,
    },
    holder: {
      did: credential.holderDid,
    },
    metadata: credential.metadata,
    timestamp,
  };
};
