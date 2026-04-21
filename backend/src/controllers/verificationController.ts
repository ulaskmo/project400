import { Request, Response, NextFunction } from "express";
import { verifyCredential } from "../services/verificationService";

// Authenticated verification (for registered verifiers)
export const handleVerifyCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { credentialId } = req.body;
    if (!credentialId) {
      res.status(400).json({ message: "credentialId is required" });
      return;
    }
    const result = await verifyCredential(credentialId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// PUBLIC verification - no login required
// This is the real-world use case: anyone scans QR code and can verify
export const handlePublicVerify = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Accept credentialId from URL param, query string, or body
    const credentialId = req.params.credentialId || req.query.id || req.body?.credentialId;
    
    if (!credentialId) {
      res.status(400).json({ 
        message: "Credential ID is required",
        usage: "GET /api/verify/:credentialId or POST with {credentialId: '...'}"
      });
      return;
    }

    console.log(`[Public Verify] Verifying credential: ${credentialId}`);
    const result = await verifyCredential(credentialId as string);
    
    // Return a clean response for public consumption
    res.json({
      verified: result.status === "valid",
      credentialId: result.credentialId,
      status: result.status,
      message: result.details,
      issuer: result.issuer?.did,
      issuerName: result.issuer?.name,
      issuerRole: result.issuer?.role,
      issuerTrustLevel: result.issuer?.trustLevel,
      holder: result.holder?.did,
      credentialType: result.metadata?.type,
      subjectName: result.metadata?.subjectName,
      description: result.metadata?.description,
      expiresAt: result.metadata?.expiresAt,
      cryptoProof: result.cryptoProof,
      verifiedAt: result.timestamp,
    });
  } catch (error) {
    next(error);
  }
};
