import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "../config/env";
import { createDid } from "./didService";
import { loadUsers, saveUsers, StoredUser } from "./userStorage";

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

// User store - load from file, persist on changes
const users = new Map<string, User>();

function toUser(stored: StoredUser): User {
  return {
    ...stored,
    role: stored.role as UserRole,
    createdAt: new Date(stored.createdAt),
  };
}

function toStored(user: User): StoredUser {
  return {
    id: user.id,
    email: user.email,
    password: user.password,
    role: user.role,
    did: user.did,
    organizationName: user.organizationName,
    createdAt: user.createdAt.toISOString(),
  };
}

function persistUsers() {
  const seen = new Set<string>();
  const list: StoredUser[] = [];
  for (const [, user] of users) {
    if (!seen.has(user.id)) {
      seen.add(user.id);
      list.push(toStored(user));
    }
  }
  saveUsers(list);
}

// Load users from file on startup
const stored = loadUsers();
stored.forEach((s) => {
  const user = toUser(s);
  users.set(user.id, user);
  users.set(user.email, user);
});

// Create default admin if not exists (admin is recreated on each startup for consistency)
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
if (!users.has("admin@chainshield.io")) {
  initAdmin();
}
persistUsers();

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
  persistUsers();

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
  persistUsers();
  return user;
};

export const getAllUsers = (): User[] => {
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
