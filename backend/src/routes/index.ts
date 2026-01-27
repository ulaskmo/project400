import { Router } from "express";
import authRoutes from "./auth.routes";
import didRoutes from "./did.routes";
import credentialRoutes from "./credential.routes";
import verificationRoutes from "./verification.routes";

const router = Router();

// Auth routes (public)
router.use("/auth", authRoutes);

// Protected routes
router.use("/dids", didRoutes);
router.use("/credentials", credentialRoutes);
router.use("/verify", verificationRoutes);

export default router;
