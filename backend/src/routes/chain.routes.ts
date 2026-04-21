import { Router } from "express";
import {
  handleChainInfo,
  handleVerifyCredential,
  handleMyAnchors,
} from "../controllers/chainController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public: lets the login page / public verify page show chain status.
router.get("/info", handleChainInfo);

// Authenticated: credentials visible to this user, with anchor metadata.
router.get("/my-anchors", authenticate, handleMyAnchors);

// Authenticated: fetch a single credential straight from the contract
// and return a local-vs-on-chain match breakdown.
router.get("/credentials/:credentialId", authenticate, handleVerifyCredential);

export default router;
