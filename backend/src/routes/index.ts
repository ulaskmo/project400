import { Router } from "express";
import didRoutes from "./did.routes";
import credentialRoutes from "./credential.routes";
import verificationRoutes from "./verification.routes";

const router = Router();

router.use("/dids", didRoutes);
router.use("/credentials", credentialRoutes);
router.use("/verify", verificationRoutes);

export default router;

