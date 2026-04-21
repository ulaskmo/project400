import { Router } from "express";
import authRoutes from "./auth.routes";
import didRoutes from "./did.routes";
import credentialRoutes from "./credential.routes";
import verificationRoutes from "./verification.routes";
import statsRoutes from "./stats.routes";
import socialRoutes from "./social.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/dids", didRoutes);
router.use("/credentials", credentialRoutes);
router.use("/verify", verificationRoutes);
router.use("/stats", statsRoutes);
router.use("/social", socialRoutes);

export default router;
