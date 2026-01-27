import { Router } from "express";
import { handleCreateDid, handleListDids } from "../controllers/didController";
import { authenticate, holderOnly, adminOnly } from "../middleware/auth";

const router = Router();

// Holders can create their own DID
router.post("/", authenticate, holderOnly, handleCreateDid);

// Only admin can list all DIDs
router.get("/", authenticate, adminOnly, handleListDids);

export default router;
