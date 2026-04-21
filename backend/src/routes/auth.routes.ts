import { Router } from "express";
import {
  handleRegister,
  handleAdminCreateUser,
  handleLogin,
  handleGetProfile,
  handleGetAllUsers,
  handleForgotPassword,
  handleResetPassword,
  handleSetTrustLevel,
} from "../controllers/authController";
import { authenticate, adminOnly } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", handleRegister); // For holders self-registering
router.post("/login", handleLogin);
router.post("/forgot-password", handleForgotPassword);
router.post("/reset-password", handleResetPassword);

// Protected routes
router.get("/profile", authenticate, handleGetProfile);
router.get("/users", authenticate, adminOnly, handleGetAllUsers);

// Admin-only: create issuer/verifier/admin accounts
router.post("/users", authenticate, adminOnly, handleAdminCreateUser);

// Admin-only: set trust level (unverified / verified / accredited)
router.post(
  "/users/:id/trust-level",
  authenticate,
  adminOnly,
  handleSetTrustLevel
);

export default router;
