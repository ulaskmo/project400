import { randomUUID, randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "../config/env";
import { createDid } from "./didService";
import { sendPasswordResetEmail } from "./emailService";
import {
  StoredUser,
  TrustLevel,
  loadAllUsers,
  getUserByEmailFromStore,
  getUserByIdFromStore,
  getUserByDidFromStore,
  insertUser,
  updateUser,
  ensureDefaultAdmin,
  createPasswordResetToken,
  getPasswordResetToken,
  consumePasswordResetToken,
  invalidateExistingResetTokens,
} from "./userStorage";

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
  trustLevel?: TrustLevel;
  trustNote?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    did?: string;
    organizationName?: string;
    trustLevel?: TrustLevel;
  };
}

function toUser(stored: StoredUser): User {
  return {
    id: stored.id,
    email: stored.email,
    password: stored.password,
    role: stored.role as UserRole,
    did: stored.did,
    organizationName: stored.organizationName,
    createdAt: new Date(stored.createdAt),
    trustLevel: stored.trustLevel ?? "unverified",
    trustNote: stored.trustNote,
  };
}

// Seed a default admin only when explicitly enabled via env.
// Production deployments must create the admin manually; we will not ship
// a well-known admin password in the default path.
const initAdmin = async () => {
  if (!env.enableDefaultAdmin) return;
  const defaultEmail =
    process.env.DEFAULT_ADMIN_EMAIL || "admin@chainshield.local";
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!defaultPassword || defaultPassword.length < 8) {
    console.error(
      "[Auth] ENABLE_DEFAULT_ADMIN=true but DEFAULT_ADMIN_PASSWORD is missing or < 8 chars. Skipping admin bootstrap."
    );
    return;
  }
  const hashedPassword = bcrypt.hashSync(defaultPassword, BCRYPT_ROUNDS);
  const adminUser: StoredUser = {
    id: "00000000-0000-0000-0000-000000000001",
    email: defaultEmail,
    password: hashedPassword,
    role: "admin",
    createdAt: new Date().toISOString(),
  };
  try {
    await ensureDefaultAdmin(adminUser);
    console.log(`[Auth] Default admin ensured: ${defaultEmail}`);
  } catch (err) {
    console.error("[Auth Service] Failed to ensure default admin:", err);
  }
};
initAdmin();

const JWT_SECRET = env.jwtSecret;
const JWT_EXPIRES_IN = "24h";

export const register = async (
  email: string,
  password: string,
  role: UserRole,
  organizationName?: string
): Promise<AuthResponse> => {
  const existing = await getUserByEmailFromStore(email);
  if (existing) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let did: string | undefined;
  if (role === "holder") {
    try {
      const didRecord = await createDid();
      did = didRecord.did;
      console.log(`[Auth] Auto-generated DID for holder: ${did}`);
    } catch (err) {
      console.error("[Auth] Failed to auto-generate DID:", err);
    }
  }

  const storedUser: StoredUser = {
    id: randomUUID(),
    email,
    password: hashedPassword,
    role,
    did,
    organizationName: role !== "holder" ? organizationName : undefined,
    createdAt: new Date().toISOString(),
  };

  await insertUser(storedUser);
  console.log(`[Auth] User registered: ${email} (${role})`);

  const user = toUser(storedUser);
  return {
    token: generateToken(user),
    user: sanitizeUser(user),
  };
};

export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const stored = await getUserByEmailFromStore(email);
  if (!stored) {
    throw new Error("Invalid email or password");
  }

  const passwordMatch = await bcrypt.compare(password, stored.password);
  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  const user = toUser(stored);
  console.log(`[Auth] User logged in: ${email} (${user.role})`);
  return {
    token: generateToken(user),
    user: sanitizeUser(user),
  };
};

export const getUserById = async (id: string): Promise<User | null> => {
  const stored = await getUserByIdFromStore(id);
  return stored ? toUser(stored) : null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const stored = await getUserByEmailFromStore(email);
  return stored ? toUser(stored) : null;
};

/**
 * Resolve a user from a DID.
 *
 * Credentials issued before users had real DIDs on file use a synthetic
 * DID of the form `did:chainshield:{role}-{userId}` (see
 * credentialController.handleIssueCredential). When a direct lookup fails
 * we try to extract the UUID and look up by user id, so the trust
 * registry, badges and verifier trust banners keep working for those
 * legacy credentials too.
 */
const SYNTHETIC_DID_RE =
  /^did:chainshield:(?:issuer|holder|verifier|admin)-([0-9a-f-]{36})$/i;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getUserByDid = async (did: string): Promise<User | null> => {
  const direct = await getUserByDidFromStore(did);
  if (direct) return toUser(direct);

  // Fallback 1: synthetic DID with role prefix
  const match = SYNTHETIC_DID_RE.exec(did);
  if (match) {
    const byId = await getUserByIdFromStore(match[1]);
    if (byId) return toUser(byId);
  }

  // Fallback 2: bare `did:chainshield:<uuid>` form
  const bare = did.replace(/^did:chainshield:/i, "");
  if (UUID_RE.test(bare)) {
    const byId = await getUserByIdFromStore(bare);
    if (byId) return toUser(byId);
  }

  return null;
};

export const updateUserDid = async (
  userId: string,
  did: string
): Promise<User | null> => {
  const stored = await updateUser(userId, { did });
  return stored ? toUser(stored) : null;
};

export const getAllUsers = async (): Promise<User[]> => {
  const stored = await loadAllUsers();
  return stored.map(toUser);
};

export const verifyToken = (
  token: string
): { userId: string; role: UserRole } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: UserRole;
    };
    return decoded;
  } catch {
    return null;
  }
};

const generateToken = (user: User): string => {
  return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const sanitizeUser = (user: User) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  did: user.did,
  organizationName: user.organizationName,
  trustLevel: user.trustLevel ?? "unverified",
});

export const setTrustLevel = async (
  userId: string,
  level: TrustLevel,
  note?: string
): Promise<User | null> => {
  if (!["unverified", "verified", "accredited"].includes(level)) {
    throw new Error("Invalid trust level");
  }
  const stored = await updateUser(userId, {
    trustLevel: level,
    trustNote: note ?? undefined,
  });
  return stored ? toUser(stored) : null;
};

// ---------- Password reset ----------

const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Request a password reset.
 * Always resolves successfully (no email enumeration).
 * If the email exists, generates a token and sends an email.
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  const stored = await getUserByEmailFromStore(email);
  if (!stored) {
    console.log(`[Auth] Password reset requested for unknown email: ${email}`);
    return;
  }

  await invalidateExistingResetTokens(stored.id);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await createPasswordResetToken(token, stored.id, stored.email, expiresAt);

  const appUrl = env.appUrl || "http://localhost:5173";
  const resetUrl = `${appUrl}/#/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(stored.email, resetUrl);
    console.log(`[Auth] Reset email sent to ${stored.email}`);
  } catch (err) {
    console.error("[Auth] Failed to send reset email:", err);
    throw new Error("Could not send reset email. Please try again later.");
  }
};

/**
 * Reset a user's password using a token.
 */
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<void> => {
  if (!token || !newPassword) {
    throw new Error("Token and new password are required");
  }
  if (newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const record = await getPasswordResetToken(token);
  if (!record) {
    throw new Error("Invalid or expired reset link");
  }
  if (record.usedAt) {
    throw new Error("This reset link has already been used");
  }
  if (new Date(record.expiresAt) < new Date()) {
    throw new Error("This reset link has expired");
  }

  const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const updated = await updateUser(record.userId, { password: hashed });
  if (!updated) {
    throw new Error("Could not update password");
  }

  await consumePasswordResetToken(token);
  console.log(`[Auth] Password reset for ${record.email}`);
};
