import { Router } from "express";
import { handleGetStats, handleGetAllCredentials } from "../controllers/statsController";
import { authenticate, adminOnly } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, adminOnly, handleGetStats);
router.get("/credentials", authenticate, adminOnly, handleGetAllCredentials);

export default router;
