import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import {
  CredentialPayload,
  getCredential,
  getCredentialsByHolder,
  getCredentialsByIssuer,
  issueCredential,
  revokeCredential,
} from "../services/credentialService";
import { getUserById, getUserByDid } from "../services/authService";
import {
  issueVerifiableCredential,
  verifyVerifiableCredential,
  VerifiableCredential,
} from "../services/vcService";

/**
 * Produce a deterministic SHA-256 content hash for the credential payload.
 *
 * This is what gets written to the `ipfsHash` slot of the on-chain record
 * today. When IPFS is actually wired up later, the uploaded CID will be
 * stored here instead — the contract schema doesn't need to change.
 */
function computeContentHash(payload: unknown): string {
  const json = JSON.stringify(payload);
  return `sha256:${createHash("sha256").update(json).digest("hex")}`;
}

/**
 * Attach issuer trust info (trustLevel, organizationName) to a list of
 * credentials. Uses a single lookup per unique issuer DID.
 */
async function enrichWithIssuerTrust<T extends { issuerDid: string }>(
  credentials: T[]
): Promise<
  (T & {
    issuerTrustLevel?: string;
    issuerName?: string;
    issuerRole?: string;
  })[]
> {
  const uniqueDids = Array.from(new Set(credentials.map((c) => c.issuerDid)));
  const issuers = await Promise.all(uniqueDids.map((did) => getUserByDid(did)));
  const map = new Map<string, { trustLevel?: string; name?: string; role?: string }>();
  uniqueDids.forEach((did, i) => {
    const issuer = issuers[i];
    map.set(did, {
      trustLevel: issuer?.trustLevel ?? "unverified",
      name: issuer?.organizationName || issuer?.email,
      role: issuer?.role,
    });
  });
  return credentials.map((c) => {
    const info = map.get(c.issuerDid);
    return {
      ...c,
      issuerTrustLevel: info?.trustLevel ?? "unverified",
      issuerName: info?.name,
      issuerRole: info?.role,
    };
  });
}

export const handleIssueCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const issuer = await getUserById(req.user.id);
    const issuerDid = issuer?.did || `did:chainshield:issuer-${req.user.id}`;

    const { credentialId, holderDid, metadata, subjectFields } = req.body;

    if (!credentialId || !holderDid) {
      res.status(400).json({ message: "credentialId and holderDid are required" });
      return;
    }

    // Build credentialSubject from provided fields + known metadata
    const resolvedSubjectFields: Record<string, unknown> = {
      ...(subjectFields || {}),
    };
    if (metadata?.subjectName && !("subjectName" in resolvedSubjectFields)) {
      resolvedSubjectFields.subjectName = metadata.subjectName;
    }
    if (metadata?.description && !("description" in resolvedSubjectFields)) {
      resolvedSubjectFields.description = metadata.description;
    }

    const vc = await issueVerifiableCredential({
      issuerUserId: req.user.id,
      issuerDid,
      holderDid,
      credentialId,
      types: [metadata?.type || "ChainShieldCredential"],
      credentialSubject: resolvedSubjectFields,
      expirationDate: metadata?.expiresAt,
    });

    const contentHash = computeContentHash(vc);

    const payload: Omit<CredentialPayload, "status"> = {
      credentialId,
      holderDid,
      ipfsHash: contentHash,
      issuerDid,
      metadata: {
        ...metadata,
        issuedBy: issuer?.organizationName || issuer?.email || "Unknown Issuer",
        subjectFields: resolvedSubjectFields,
      },
      vc,
    };

    const credential = await issueCredential(payload);
    res.status(201).json(credential);
  } catch (error) {
    next(error);
  }
};

export const handleGetCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const credential = await getCredential(req.params.credentialId);
    if (!credential) {
      res.status(404);
      throw new Error("Credential not found");
    }
    const [enriched] = await enrichWithIssuerTrust([credential]);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

export const handleGetMyCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user = await getUserById(req.user.id);
    if (!user?.did) {
      res.json([]); // No DID means no credentials
      return;
    }

    const credentials = await getCredentialsByHolder(user.did);
    const enriched = await enrichWithIssuerTrust(credentials);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

export const handleGetIssuedCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user = await getUserById(req.user.id);
    const issuerDid = user?.did || `did:chainshield:issuer-${req.user.id}`;

    const credentials = await getCredentialsByIssuer(issuerDid);
    const enriched = await enrichWithIssuerTrust(credentials);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

export const handleRevokeCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const credentialId = req.params.credentialId;
    const credential = await getCredential(credentialId);
    if (!credential) {
      res.status(404).json({ message: "Credential not found" });
      return;
    }

    if (credential.status === "revoked") {
      res.status(400).json({ message: "Credential is already revoked" });
      return;
    }

    const user = await getUserById(req.user.id);
    const userDid = user?.did;
    const syntheticDid = `did:chainshield:${req.user.role}-${req.user.id}`;

    const isAdmin = req.user.role === "admin";
    // Also accept synthetic DIDs (did:chainshield:{role}-{userId}), which
    // is what older credentials were stamped with when the issuer did
    // not yet have a real DID stored on their user record.
    const isIssuer =
      (!!userDid && credential.issuerDid === userDid) ||
      credential.issuerDid === syntheticDid;
    const isHolder =
      (!!userDid && credential.holderDid === userDid) ||
      credential.holderDid === syntheticDid;

    if (!isAdmin && !isIssuer && !isHolder) {
      res.status(403).json({
        message: "You can only revoke credentials you issued or hold",
      });
      return;
    }

    const result = await revokeCredential(credentialId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const handleGetRawVc = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const credential = await getCredential(req.params.credentialId);
    if (!credential) {
      res.status(404).json({ message: "Credential not found" });
      return;
    }
    if (!credential.vc) {
      res.status(404).json({ message: "No W3C VC attached to this credential" });
      return;
    }
    res.json(credential.vc);
  } catch (error) {
    next(error);
  }
};

export const handleVerifyVc = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const credential = await getCredential(req.params.credentialId);
    if (!credential || !credential.vc) {
      res.status(404).json({ message: "No signed VC for this credential" });
      return;
    }
    const result = await verifyVerifiableCredential(
      credential.vc as VerifiableCredential
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Self-issue: Holder adds their own credential (self-attested)
export const handleSelfIssueCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user = await getUserById(req.user.id);
    if (!user?.did) {
      res.status(400).json({ message: "You need a DID to add credentials" });
      return;
    }

    const { credentialType, credentialData } = req.body;
    
    if (!credentialType || !credentialData) {
      res.status(400).json({ message: "credentialType and credentialData are required" });
      return;
    }

    const credentialId = `self-cred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const subjectFields: Record<string, unknown> = { ...credentialData };
    const vc = await issueVerifiableCredential({
      issuerUserId: req.user.id,
      issuerDid: user.did,
      holderDid: user.did,
      credentialId,
      types: [`self:${credentialType}`],
      credentialSubject: subjectFields,
      expirationDate: credentialData.expiresAt,
    });

    const contentHash = computeContentHash(vc);

    const payload: Omit<CredentialPayload, "status"> = {
      credentialId,
      holderDid: user.did,
      issuerDid: user.did,
      ipfsHash: contentHash,
      metadata: {
        type: `self:${credentialType}`,
        subjectName: credentialData.title || undefined,
        description: credentialData.description || undefined,
        issuedBy: credentialData.issuedBy || user.email,
        expiresAt: credentialData.expiresAt || undefined,
        subjectFields,
      },
      vc,
    };

    const credential = await issueCredential(payload);
    res.status(201).json(credential);
  } catch (error) {
    next(error);
  }
};
