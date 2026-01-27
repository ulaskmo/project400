import { Request, Response, NextFunction } from "express";
import { register, login, getAllUsers, getUserById, UserRole } from "../services/authService";

// Public registration - ONLY for holders
export const handleRegister = async (
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

    // Public registration is ONLY for holders
    const result = await register(email, password, "holder");
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

    const user = getUserById(req.user.id);
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

export const handleGetAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = getAllUsers().map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      did: u.did,
      organizationName: u.organizationName,
      createdAt: u.createdAt,
    }));
    res.json(users);
  } catch (error) {
    next(error);
  }
};
