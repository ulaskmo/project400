import { Router } from "express";
import {
  handleRegister,
  handleAdminCreateUser,
  handleLogin,
  handleGetProfile,
  handleGetAllUsers,
} from "../controllers/authController";
import { authenticate, adminOnly } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", handleRegister); // For holders self-registering
router.post("/login", handleLogin);

// Protected routes
router.get("/profile", authenticate, handleGetProfile);
router.get("/users", authenticate, adminOnly, handleGetAllUsers);

// Admin-only: create issuer/verifier/admin accounts
router.post("/users", authenticate, adminOnly, handleAdminCreateUser);

export default router;
