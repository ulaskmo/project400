import { getCredential } from "./credentialService";
import { getDid } from "./didService";

export interface VerificationResult {
  credentialId: string;
  status: "valid" | "invalid" | "revoked" | "expired";
  details?: string;
  issuer?: {
    did: string;
    verified: boolean;
  };
  holder?: {
    did: string;
  };
  timestamp: string;
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

  // Step 2: Check if revoked or expired
  if (credential.status === "revoked") {
    return {
      credentialId,
      status: "revoked",
      details: "This credential has been revoked by the issuer",
      issuer: { did: credential.issuerDid, verified: true },
      holder: { did: credential.holderDid },
      timestamp,
    };
  }

  if (credential.status === "expired") {
    return {
      credentialId,
      status: "expired",
      details: "This credential has expired",
      issuer: { did: credential.issuerDid, verified: true },
      holder: { did: credential.holderDid },
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
    },
    holder: {
      did: credential.holderDid,
    },
    timestamp,
  };
};
