import { Request, Response, NextFunction } from "express";
import {
  CredentialPayload,
  getCredential,
  getCredentialsByHolder,
  getCredentialsByIssuer,
  issueCredential,
  revokeCredential
} from "../services/credentialService";
import { getUserById } from "../services/authService";

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

    const { credentialId, holderDid, ipfsHash, metadata } = req.body;

    if (!credentialId || !holderDid) {
      res.status(400).json({ message: "credentialId and holderDid are required" });
      return;
    }

    const payload = {
      credentialId,
      holderDid,
      ipfsHash,
      issuerDid,
      metadata: {
        ...metadata,
        issuedBy: issuer?.organizationName || issuer?.email || "Unknown Issuer",
      },
    } as Omit<CredentialPayload, "status">;
    
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
    res.json(credential);
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
    res.json(credentials);
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
    res.json(credentials);
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
    const result = await revokeCredential(req.params.credentialId);
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

    // Generate unique credential ID
    const credentialId = `self-cred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // Simulate IPFS hash (in production, would actually upload to IPFS)
    const credentialPayload = {
      type: `self:${credentialType}`, // Prefix with "self:" to mark as self-attested
      data: {
        ...credentialData,
        _selfAttested: true,
        _attestedBy: user.email,
        _attestedAt: new Date().toISOString(),
      },
    };
    const ipfsHash = `ipfs://Qm${Buffer.from(JSON.stringify(credentialPayload)).toString("base64").slice(0, 44)}`;

    // For self-issued credentials, the holder is also the issuer
    const payload = {
      credentialId,
      holderDid: user.did,
      issuerDid: user.did, // Self-issued: holder = issuer
      ipfsHash,
      metadata: {
        type: `self:${credentialType}`,
        subjectName: credentialData.title || undefined,
        description: credentialData.description || undefined,
        issuedBy: credentialData.issuedBy || user.email,
        expiresAt: credentialData.expiresAt || undefined,
      },
    } as Omit<CredentialPayload, "status">;

    const credential = await issueCredential(payload);
    res.status(201).json(credential);
  } catch (error) {
    next(error);
  }
};
