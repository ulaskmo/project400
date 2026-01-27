import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { createDid } from "./didService";

// User roles
export type UserRole = "holder" | "issuer" | "verifier" | "admin";

export interface User {
  id: string;
  email: string;
  password: string; // In production, this would be hashed
  role: UserRole;
  did?: string; // For holders, their associated DID
  organizationName?: string; // For issuers/verifiers
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    did?: string;
    organizationName?: string;
  };
}

// In-memory user store (demo mode)
const users = new Map<string, User>();

// Create default admin user
const adminUser: User = {
  id: "admin-001",
  email: "admin@chainshield.io",
  password: "admin123", // In production, this would be hashed!
  role: "admin",
  createdAt: new Date(),
};
users.set(adminUser.id, adminUser);
users.set(adminUser.email, adminUser); // Index by email too

console.log("[Auth Service] Default admin created: admin@chainshield.io / admin123");

const JWT_SECRET = env.jwtSecret || "chainshield_dev_secret";
const JWT_EXPIRES_IN = "24h";

export const register = async (
  email: string,
  password: string,
  role: UserRole,
  organizationName?: string
): Promise<AuthResponse> => {
  // Check if email already exists
  if (users.has(email)) {
    throw new Error("Email already registered");
  }

  const user: User = {
    id: randomUUID(),
    email,
    password, // In production: await bcrypt.hash(password, 10)
    role,
    organizationName: role !== "holder" ? organizationName : undefined,
    createdAt: new Date(),
  };

  // Auto-generate DID for holders
  if (role === "holder") {
    try {
      const didRecord = await createDid();
      user.did = didRecord.did;
      console.log(`[Auth] Auto-generated DID for holder: ${didRecord.did}`);
    } catch (err) {
      console.error("[Auth] Failed to auto-generate DID:", err);
    }
  }

  users.set(user.id, user);
  users.set(user.email, user); // Index by email

  console.log(`[Auth] User registered: ${email} (${role})`);

  const token = generateToken(user);
  return {
    token,
    user: sanitizeUser(user),
  };
};

export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const user = users.get(email);
  
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // In production: await bcrypt.compare(password, user.password)
  if (user.password !== password) {
    throw new Error("Invalid email or password");
  }

  console.log(`[Auth] User logged in: ${email} (${user.role})`);

  const token = generateToken(user);
  return {
    token,
    user: sanitizeUser(user),
  };
};

export const getUserById = (id: string): User | null => {
  return users.get(id) || null;
};

export const getUserByEmail = (email: string): User | null => {
  return users.get(email) || null;
};

export const updateUserDid = (userId: string, did: string): User | null => {
  const user = users.get(userId);
  if (!user) return null;
  
  user.did = did;
  return user;
};

export const getAllUsers = (): User[] => {
  // Return unique users (not the email-indexed duplicates)
  const uniqueUsers = new Map<string, User>();
  users.forEach((user) => {
    uniqueUsers.set(user.id, user);
  });
  return Array.from(uniqueUsers.values());
};

export const verifyToken = (token: string): { userId: string; role: UserRole } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole };
    return decoded;
  } catch {
    return null;
  }
};

// Helper functions
const generateToken = (user: User): string => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const sanitizeUser = (user: User) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  did: user.did,
  organizationName: user.organizationName,
});
