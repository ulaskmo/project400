import { Router } from "express";
import {
  handleGetCredential,
  handleIssueCredential,
  handleRevokeCredential
} from "../controllers/credentialController";

const router = Router();

router.post("/", handleIssueCredential);
router.get("/:credentialId", handleGetCredential);
router.post("/:credentialId/revoke", handleRevokeCredential);

export default router;

