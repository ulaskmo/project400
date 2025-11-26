import { Router } from "express";
import { handleVerifyCredential } from "../controllers/verificationController";

const router = Router();

router.post("/", handleVerifyCredential);

export default router;

