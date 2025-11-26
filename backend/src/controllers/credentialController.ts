import { Request, Response, NextFunction } from "express";
import {
  CredentialPayload,
  getCredential,
  issueCredential,
  revokeCredential
} from "../services/credentialService";

export const handleIssueCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const payload = req.body as Omit<CredentialPayload, "status">;
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

