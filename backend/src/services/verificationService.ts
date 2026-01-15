import { getReadOnlyCredentialRegistry } from "./web3Client";

interface VerificationResult {
  credentialId: string;
  status: "valid" | "invalid" | "revoked";
  details?: string;
}

export const verifyCredential = async (
  credentialId: string
): Promise<VerificationResult> => {
  if (!credentialId) {
    return {
      credentialId,
      status: "invalid",
      details: "Missing credential identifier"
    };
  }

  const registry = getReadOnlyCredentialRegistry();

  try {
    const [, , , , status] = await registry.getCredential(credentialId);
    const mappedStatus = mapStatus(status);

    if (mappedStatus === "revoked") {
      return {
        credentialId,
        status: "revoked",
        details: "Credential revoked on-chain"
      };
    }

    if (mappedStatus === "expired") {
      return {
        credentialId,
        status: "invalid",
        details: "Credential expired"
      };
    }

    return {
      credentialId,
      status: "valid",
      details: "On-chain credential is active"
    };
  } catch (error) {
    return {
      credentialId,
      status: "invalid",
      details: "Credential not found"
    };
  }
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

