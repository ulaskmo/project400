import { Router } from "express";
import { handleVerifyCredential, handlePublicVerify } from "../controllers/verificationController";
import { authenticate, verifierOnly } from "../middleware/auth";

const router = Router();

// PUBLIC verification - anyone can verify a credential (this is the real-world use case)
// No login required - just scan QR and verify
router.get("/:credentialId", handlePublicVerify);

// Also allow POST for public verification (for apps that prefer POST)
router.post("/public", handlePublicVerify);

// Authenticated verification (for registered verifiers who want to track their verifications)
router.post("/", authenticate, verifierOnly, handleVerifyCredential);

export default router;
