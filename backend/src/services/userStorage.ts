import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { env } from "../config/env";

const DATA_DIR = join(process.cwd(), "data");
const USERS_FILE = join(DATA_DIR, "users.json");
const TRUST_SIDESTORE_FILE = join(DATA_DIR, "user_trust.json");

export type TrustLevel = "unverified" | "verified" | "accredited";

export interface StoredUser {
  id: string;
  email: string;
  password: string;
  role: string;
  did?: string;
  organizationName?: string;
  createdAt: string;
  trustLevel?: TrustLevel;
  trustNote?: string;
}

interface UserRow {
  id: string;
  email: string;
  password: string;
  role: string;
  did: string | null;
  organization_name: string | null;
  created_at: string;
  trust_level?: string | null;
  trust_note?: string | null;
}

const isSupabaseEnabled = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

let supabase: SupabaseClient | null = null;
if (isSupabaseEnabled) {
  supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log("[UserStorage] Using Supabase as user store");
} else {
  console.log("[UserStorage] Using local JSON file (Supabase not configured)");
}

function rowToUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    role: row.role,
    did: row.did ?? undefined,
    organizationName: row.organization_name ?? undefined,
    createdAt: row.created_at,
    trustLevel: (row.trust_level as TrustLevel | undefined) ?? "unverified",
    trustNote: row.trust_note ?? undefined,
  };
}

function userToRow(user: StoredUser): UserRow {
  return {
    id: user.id,
    email: user.email,
    password: user.password,
    role: user.role,
    did: user.did ?? null,
    organization_name: user.organizationName ?? null,
    created_at: user.createdAt,
    trust_level: user.trustLevel ?? "unverified",
    trust_note: user.trustNote ?? null,
  };
}

// JSON file fallback
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadFromFile(): StoredUser[] {
  try {
    ensureDataDir();
    if (existsSync(USERS_FILE)) {
      return JSON.parse(readFileSync(USERS_FILE, "utf8"));
    }
  } catch (err) {
    console.error("[UserStorage] Failed to load users from file:", err);
  }
  return [];
}

function saveToFile(users: StoredUser[]): void {
  try {
    ensureDataDir();
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("[UserStorage] Failed to save users to file:", err);
  }
}

// ---------- Trust sidestore ----------
// Persists trust_level / trust_note in a local JSON file so the feature
// works even if the Supabase trust_level column hasn't been added yet.

type TrustSidestore = Record<string, { trustLevel?: TrustLevel; trustNote?: string }>;

function loadTrustSidestore(): TrustSidestore {
  try {
    ensureDataDir();
    if (existsSync(TRUST_SIDESTORE_FILE)) {
      return JSON.parse(readFileSync(TRUST_SIDESTORE_FILE, "utf8"));
    }
  } catch (err) {
    console.error("[UserStorage] Failed to load trust sidestore:", err);
  }
  return {};
}

function saveTrustSidestore(store: TrustSidestore): void {
  try {
    ensureDataDir();
    writeFileSync(TRUST_SIDESTORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("[UserStorage] Failed to save trust sidestore:", err);
  }
}

function applyTrustSidestore(user: StoredUser): StoredUser {
  const store = loadTrustSidestore();
  const override = store[user.id];
  if (!override) return user;
  return {
    ...user,
    trustLevel: override.trustLevel ?? user.trustLevel,
    trustNote: override.trustNote ?? user.trustNote,
  };
}

function writeTrustSidestore(
  userId: string,
  updates: { trustLevel?: TrustLevel; trustNote?: string }
) {
  const store = loadTrustSidestore();
  store[userId] = { ...store[userId], ...updates };
  saveTrustSidestore(store);
}

function isMissingTrustColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  // 42703 = undefined_column, PGRST204 = missing column in schema cache
  return (
    err.code === "42703" ||
    err.code === "PGRST204" ||
    msg.includes("trust_level") ||
    msg.includes("trust_note") ||
    (msg.includes("column") && msg.includes("does not exist"))
  );
}

export async function loadAllUsers(): Promise<StoredUser[]> {
  if (!supabase) return loadFromFile().map(applyTrustSidestore);

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[UserStorage] Supabase loadAllUsers failed:", error.message);
    return [];
  }
  return (data as UserRow[]).map(rowToUser).map(applyTrustSidestore);
}

export async function getUserByEmailFromStore(email: string): Promise<StoredUser | null> {
  if (!supabase) {
    const u = loadFromFile().find((u) => u.email === email);
    return u ? applyTrustSidestore(u) : null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("[UserStorage] Supabase getUserByEmail failed:", error.message);
    return null;
  }
  return data ? applyTrustSidestore(rowToUser(data as UserRow)) : null;
}

export async function getUserByIdFromStore(id: string): Promise<StoredUser | null> {
  if (!supabase) {
    const u = loadFromFile().find((u) => u.id === id);
    return u ? applyTrustSidestore(u) : null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[UserStorage] Supabase getUserById failed:", error.message);
    return null;
  }
  return data ? applyTrustSidestore(rowToUser(data as UserRow)) : null;
}

export async function getUserByDidFromStore(
  did: string
): Promise<StoredUser | null> {
  if (!supabase) {
    const u = loadFromFile().find((u) => u.did === did);
    return u ? applyTrustSidestore(u) : null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("did", did)
    .maybeSingle();

  if (error) {
    console.error("[UserStorage] Supabase getUserByDid failed:", error.message);
    return null;
  }
  return data ? applyTrustSidestore(rowToUser(data as UserRow)) : null;
}

export async function insertUser(user: StoredUser): Promise<void> {
  if (!supabase) {
    const users = loadFromFile();
    if (users.some((u) => u.email === user.email)) {
      throw new Error("Email already registered");
    }
    users.push(user);
    saveToFile(users);
    return;
  }

  const { error } = await supabase.from("users").insert(userToRow(user));
  if (error) {
    if (error.code === "23505") throw new Error("Email already registered");
    throw new Error(`Failed to create user: ${error.message}`);
  }
}

export async function updateUser(
  id: string,
  updates: Partial<
    Pick<
      StoredUser,
      "did" | "organizationName" | "password" | "trustLevel" | "trustNote"
    >
  >
): Promise<StoredUser | null> {
  // Always mirror trust updates to the sidestore so the feature works
  // regardless of whether Supabase has the trust_level column.
  if (updates.trustLevel !== undefined || updates.trustNote !== undefined) {
    writeTrustSidestore(id, {
      trustLevel: updates.trustLevel,
      trustNote: updates.trustNote,
    });
  }

  if (!supabase) {
    const users = loadFromFile();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return null;
    users[idx] = { ...users[idx], ...updates };
    saveToFile(users);
    return applyTrustSidestore(users[idx]);
  }

  const patch: Record<string, string | null> = {};
  if (updates.did !== undefined) patch.did = updates.did ?? null;
  if (updates.organizationName !== undefined) patch.organization_name = updates.organizationName ?? null;
  if (updates.password !== undefined) patch.password = updates.password;
  if (updates.trustLevel !== undefined) patch.trust_level = updates.trustLevel;
  if (updates.trustNote !== undefined) patch.trust_note = updates.trustNote ?? null;

  const attemptUpdate = async (p: Record<string, string | null>) =>
    supabase!.from("users").update(p).eq("id", id).select().maybeSingle();

  let { data, error } = await attemptUpdate(patch);

  if (error && isMissingTrustColumn(error)) {
    // Retry without trust columns; sidestore already holds the new value.
    console.warn(
      "[UserStorage] trust_level column missing on Supabase users table; " +
        "persisting trust info to local sidestore instead. " +
        "Run scripts/trust-registry-schema.sql to move it to Supabase."
    );
    const stripped = { ...patch };
    delete stripped.trust_level;
    delete stripped.trust_note;
    if (Object.keys(stripped).length === 0) {
      // Nothing else to update - fetch the current row so we can return it.
      const existing = await getUserByIdFromStore(id);
      return existing;
    }
    ({ data, error } = await attemptUpdate(stripped));
  }

  if (error) {
    console.error("[UserStorage] Supabase updateUser failed:", error.message);
    return null;
  }
  return data ? applyTrustSidestore(rowToUser(data as UserRow)) : null;
}

export async function ensureDefaultAdmin(
  adminUser: StoredUser
): Promise<void> {
  const existing = await getUserByEmailFromStore(adminUser.email);
  if (!existing) {
    await insertUser(adminUser);
    console.log(`[UserStorage] Default admin created: ${adminUser.email}`);
  }
}

// ---------- Password reset tokens ----------

export interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: string;
  usedAt: string | null;
}

interface PasswordResetRow {
  token: string;
  user_id: string;
  email: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

function rowToResetToken(row: PasswordResetRow): PasswordResetToken {
  return {
    token: row.token,
    userId: row.user_id,
    email: row.email,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
  };
}

export async function createPasswordResetToken(
  token: string,
  userId: string,
  email: string,
  expiresAt: Date
): Promise<void> {
  if (!supabase) {
    throw new Error("Password reset requires Supabase to be configured");
  }
  const { error } = await supabase.from("password_resets").insert({
    token,
    user_id: userId,
    email,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    throw new Error(`Failed to create reset token: ${error.message}`);
  }
}

export async function getPasswordResetToken(
  token: string
): Promise<PasswordResetToken | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("password_resets")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("[UserStorage] getPasswordResetToken failed:", error.message);
    return null;
  }
  return data ? rowToResetToken(data as PasswordResetRow) : null;
}

export async function consumePasswordResetToken(token: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("password_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);
  if (error) {
    console.error("[UserStorage] consumePasswordResetToken failed:", error.message);
  }
}

export async function invalidateExistingResetTokens(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("password_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("used_at", null);
  if (error) {
    console.error("[UserStorage] invalidateExistingResetTokens failed:", error.message);
  }
}

/**
 * One-time migration: push all users from data/users.json into Supabase.
 * Safe to run multiple times (conflicts are skipped).
 */
export async function migrateJsonUsersToSupabase(): Promise<{
  migrated: number;
  skipped: number;
}> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
  const localUsers = loadFromFile();
  let migrated = 0;
  let skipped = 0;

  for (const u of localUsers) {
    const existing = await getUserByEmailFromStore(u.email);
    if (existing) {
      skipped++;
      continue;
    }
    try {
      await insertUser(u);
      migrated++;
    } catch (err) {
      console.error(`[UserStorage] Failed to migrate ${u.email}:`, err);
    }
  }
  return { migrated, skipped };
}
