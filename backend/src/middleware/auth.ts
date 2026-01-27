import { Request, Response, NextFunction } from "express";
import { verifyToken, getUserById, UserRole } from "../services/authService";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

// Middleware to verify JWT token
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  // Verify user still exists
  const user = getUserById(decoded.userId);
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }

  req.user = {
    id: decoded.userId,
    role: decoded.role,
  };

  next();
};

// Middleware to check if user has required role(s)
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}` 
      });
      return;
    }

    next();
  };
};

// Specific role middlewares for convenience
export const holderOnly = authorize("holder", "admin");
export const issuerOnly = authorize("issuer", "admin");
export const verifierOnly = authorize("verifier", "admin");
export const adminOnly = authorize("admin");
