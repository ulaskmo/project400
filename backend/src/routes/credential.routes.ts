import { Router } from "express";
import {
  handleGetCredential,
  handleGetMyCredentials,
  handleGetIssuedCredentials,
  handleIssueCredential,
  handleSelfIssueCredential,
  handleRevokeCredential
} from "../controllers/credentialController";
import { authenticate, issuerOnly, holderOnly, authorize } from "../middleware/auth";

const router = Router();

// Holders can get their own credentials
router.get("/my", authenticate, holderOnly, handleGetMyCredentials);

// Issuers can get credentials they issued
router.get("/issued", authenticate, issuerOnly, handleGetIssuedCredentials);

// Only issuers can issue credentials to others
router.post("/", authenticate, issuerOnly, handleIssueCredential);

// Holders can self-issue credentials (add their own documents/certificates)
router.post("/self", authenticate, holderOnly, handleSelfIssueCredential);

// Issuers and holders can view specific credentials
router.get("/:credentialId", authenticate, authorize("issuer", "holder", "admin"), handleGetCredential);

// Only issuers can revoke credentials they issued
router.post("/:credentialId/revoke", authenticate, issuerOnly, handleRevokeCredential);

export default router;
