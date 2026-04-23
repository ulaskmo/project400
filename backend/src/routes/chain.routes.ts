import { Router } from "express";
import {
  handleChainInfo,
  handleVerifyCredential,
  handleMyAnchors,
  handleIpfsStatus,
  handleFetchCredentialFromIpfs,
} from "../controllers/chainController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public: lets the login page / public verify page show chain status.
router.get("/info", handleChainInfo);

// Public: quick IPFS health / configuration probe.
router.get("/ipfs/status", handleIpfsStatus);

// Public: pull the signed VC back from IPFS by credential id. Used by
// the verifier panel to prove that what's on-chain resolves to a real
// off-chain payload.
router.get("/credentials/:credentialId/ipfs", handleFetchCredentialFromIpfs);

// Authenticated: credentials visible to this user, with anchor metadata.
router.get("/my-anchors", authenticate, handleMyAnchors);

// Authenticated: fetch a single credential straight from the contract
// and return a local-vs-on-chain match breakdown.
router.get("/credentials/:credentialId", authenticate, handleVerifyCredential);

export default router;
