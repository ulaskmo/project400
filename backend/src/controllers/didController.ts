import { Request, Response, NextFunction } from "express";
import { createDid, listDids } from "../services/didService";

export const handleCreateDid = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const didRecord = await createDid();
    res.status(201).json(didRecord);
  } catch (error) {
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

