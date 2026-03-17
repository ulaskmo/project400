import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "../config/env";
import { createDid } from "./didService";

const BCRYPT_ROUNDS = 10;

export type UserRole = "holder" | "issuer" | "verifier" | "admin";

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  did?: string;
  organizationName?: string;
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

// Create default admin user with hashed password (sync so it exists before first request)
const initAdmin = () => {
  const hashedPassword = bcrypt.hashSync("admin123", BCRYPT_ROUNDS);
  const adminUser: User = {
    id: "admin-001",
    email: "admin@chainshield.io",
    password: hashedPassword,
    role: "admin",
    createdAt: new Date(),
  };
  users.set(adminUser.id, adminUser);
  users.set(adminUser.email, adminUser);
  console.log("[Auth Service] Default admin created: admin@chainshield.io / admin123");
};
initAdmin();

const JWT_SECRET = env.jwtSecret || "chainshield_dev_secret";
const JWT_EXPIRES_IN = "24h";

export const register = async (
  email: string,
  password: string,
  role: UserRole,
  organizationName?: string
): Promise<AuthResponse> => {
  if (users.has(email)) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user: User = {
    id: randomUUID(),
    email,
    password: hashedPassword,
    role,
    organizationName: role !== "holder" ? organizationName : undefined,
    createdAt: new Date(),
  };

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
  users.set(user.email, user);

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

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
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
