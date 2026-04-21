import { Request, Response, NextFunction } from "express";
import {
  register,
  login,
  getAllUsers,
  getUserById,
  requestPasswordReset,
  resetPassword,
  setTrustLevel,
  UserRole,
} from "../services/authService";

// Public registration - holders, issuers, and verifiers
export const handleRegister = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, role, organizationName } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    // Allow holder, issuer, verifier — but NOT admin via public registration
    const allowedRoles: UserRole[] = ["holder", "issuer", "verifier"];
    const userRole: UserRole = role || "holder";

    if (!allowedRoles.includes(userRole)) {
      res.status(400).json({ message: "Invalid role for public registration" });
      return;
    }

    if ((userRole === "issuer" || userRole === "verifier") && !organizationName) {
      res.status(400).json({
        message: "Organization name required for issuer/verifier accounts"
      });
      return;
    }

    const result = await register(email, password, userRole, organizationName);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Admin-only: create any type of user
export const handleAdminCreateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, role, organizationName } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    // Validate role
    const validRoles: UserRole[] = ["holder", "issuer", "verifier", "admin"];
    const userRole: UserRole = role || "holder";
    
    if (!validRoles.includes(userRole)) {
      res.status(400).json({ message: "Invalid role" });
      return;
    }

    // Issuers and verifiers need organization name
    if ((userRole === "issuer" || userRole === "verifier") && !organizationName) {
      res.status(400).json({ 
        message: "Organization name required for issuer/verifier accounts" 
      });
      return;
    }

    const result = await register(email, password, userRole, organizationName);
    
    // Return user info without logging them in (admin stays logged in)
    res.status(201).json({
      message: "User created successfully",
      user: result.user
    });
  } catch (error) {
    next(error);
  }
};

export const handleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const result = await login(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const handleGetProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user = await getUserById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      did: user.did,
      organizationName: user.organizationName,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

export const handleForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    await requestPasswordReset(email.trim().toLowerCase());

    res.json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const handleResetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ message: "Token and new password are required" });
      return;
    }

    await resetPassword(token, newPassword);
    res.json({ message: "Password updated successfully. You can now sign in." });
  } catch (error) {
    const msg = (error as Error).message || "Could not reset password";
    res.status(400).json({ message: msg });
  }
};

export const handleGetAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = (await getAllUsers()).map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      did: u.did,
      organizationName: u.organizationName,
      createdAt: u.createdAt,
      trustLevel: u.trustLevel ?? "unverified",
      trustNote: u.trustNote,
    }));
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const handleSetTrustLevel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { level, note } = req.body;
    const updated = await setTrustLevel(id, level, note);
    if (!updated) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      id: updated.id,
      email: updated.email,
      role: updated.role,
      trustLevel: updated.trustLevel,
      trustNote: updated.trustNote,
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};
