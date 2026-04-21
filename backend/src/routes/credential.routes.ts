import { Router } from "express";
import {
  handleGetCredential,
  handleGetMyCredentials,
  handleGetIssuedCredentials,
  handleIssueCredential,
  handleSelfIssueCredential,
  handleRevokeCredential,
  handleGetRawVc,
  handleVerifyVc,
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

// Raw signed W3C Verifiable Credential (public — used by verifier + holder UI)
router.get("/:credentialId/vc", handleGetRawVc);

// Cryptographically verify the VC signature + selective-disclosure digests
router.get("/:credentialId/verify-signature", handleVerifyVc);

// Issuers can revoke credentials they issued; holders can revoke credentials they hold
router.post(
  "/:credentialId/revoke",
  authenticate,
  authorize("issuer", "holder", "admin"),
  handleRevokeCredential
);

export default router;
