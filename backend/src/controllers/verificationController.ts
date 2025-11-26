import { Request, Response, NextFunction } from "express";
import { verifyCredential } from "../services/verificationService";

export const handleVerifyCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { credentialId } = req.body;
    const result = await verifyCredential(credentialId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

