import { Request, Response, NextFunction } from "express";
import { getAllUsers } from "../services/authService";
import { listDids } from "../services/didService";
import { getAllCredentials } from "../services/credentialService";

export const handleGetStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = getAllUsers();
    const dids = await listDids();
    const credentials = getAllCredentials();

    res.json({
      users: {
        total: users.length,
        holders: users.filter(u => u.role === "holder").length,
        issuers: users.filter(u => u.role === "issuer").length,
        verifiers: users.filter(u => u.role === "verifier").length,
        admins: users.filter(u => u.role === "admin").length,
      },
      dids: {
        total: dids.length,
      },
      credentials: {
        total: credentials.length,
        valid: credentials.filter(c => c.status === "valid").length,
        revoked: credentials.filter(c => c.status === "revoked").length,
        expired: credentials.filter(c => c.status === "expired").length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetAllCredentials = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const credentials = getAllCredentials();
    res.json(credentials);
  } catch (error) {
    next(error);
  }
};
