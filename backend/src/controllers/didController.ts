import { Request, Response, NextFunction } from "express";
import { createDid, listDids } from "../services/didService";
import { updateUserDid, getUserById } from "../services/authService";

export const handleCreateDid = async (
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
    if (user?.did) {
      res.status(400).json({ 
        message: "You already have a DID", 
        did: user.did 
      });
      return;
    }

    console.log(`[DID Controller] Creating DID for user ${req.user.id}...`);
    const didRecord = await createDid();

    await updateUserDid(req.user.id, didRecord.did);
    
    console.log(`[DID Controller] DID created and linked: ${didRecord.did}`);
    res.status(201).json(didRecord);
  } catch (error) {
    console.error("[DID Controller] Error:", error);
    next(error);
  }
};

export const handleListDids = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const dids = await listDids();
    res.json(dids);
  } catch (error) {
    next(error);
  }
};
