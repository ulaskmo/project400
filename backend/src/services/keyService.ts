/**
 * Key management service.
 * Provides Ed25519 keypairs for signing W3C Verifiable Credentials and
 * Verifiable Presentations. Falls back to local JSON storage when Supabase
 * is not configured.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { env } from "../config/env";
import {
  decryptPrivateKey,
  encryptPrivateKey,
  isEncrypted,
  isKeyEncryptionEnabled,
} from "./keyEncryption";

if (!isKeyEncryptionEnabled()) {
  console.warn(
    "[KeyService] KEY_ENCRYPTION_SECRET is not set — private keys are stored in plaintext. " +
      "Set KEY_ENCRYPTION_SECRET in your environment to encrypt keys at rest."
  );
}

// Wire sha512 into noble/ed25519 (required for v2+)
ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

const DATA_DIR = join(process.cwd(), "data");
const KEYS_FILE = join(DATA_DIR, "user_keys.json");

const isSupabaseEnabled = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
let supabase: SupabaseClient | null = null;
let keysTableAvailable = isSupabaseEnabled;
if (isSupabaseEnabled) {
  supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function supabaseTableMissing(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("not found in the schema cache")
  );
}

function keySupabase(): SupabaseClient | null {
  return keysTableAvailable ? supabase : null;
}

function disableKeysSupabase(reason: string) {
  if (!keysTableAvailable) return;
  keysTableAvailable = false;
  console.warn(
    `[KeyService] Falling back to local JSON (${reason}). Apply scripts/ssi-schema.sql to enable Supabase.`
  );
}

export interface UserKeypair {
  userId: string;
  publicKeyHex: string;
  privateKeyHex: string;
  algorithm: "Ed25519";
  createdAt: string;
}

type StoredRow = {
  user_id: string;
  public_key_hex: string;
  private_key_hex: string;
  algorithm: string;
  created_at: string;
};

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadFile(): UserKeypair[] {
  try {
    ensureDataDir();
    if (existsSync(KEYS_FILE)) {
      return JSON.parse(readFileSync(KEYS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("[KeyService] file load failed:", e);
  }
  return [];
}

function saveFile(keys: UserKeypair[]) {
  try {
    ensureDataDir();
    writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), "utf8");
  } catch (e) {
    console.error("[KeyService] file save failed:", e);
  }
}

function rowToKeypair(row: StoredRow): UserKeypair {
  return {
    userId: row.user_id,
    publicKeyHex: row.public_key_hex,
    privateKeyHex: decryptPrivateKey(row.private_key_hex),
    algorithm: (row.algorithm as "Ed25519") ?? "Ed25519",
    createdAt: row.created_at,
  };
}

/**
 * Shape a keypair for persistence: the public key is stored as-is and the
 * private key is encrypted if KEY_ENCRYPTION_SECRET is configured.
 */
function sealForStorage(kp: UserKeypair): UserKeypair {
  return {
    ...kp,
    privateKeyHex: encryptPrivateKey(kp.privateKeyHex),
  };
}

/**
 * Restore a keypair that was loaded from disk: if the private key is
 * marked encrypted, decrypt it before handing it back to callers.
 */
function unsealFromStorage(kp: UserKeypair): UserKeypair {
  return {
    ...kp,
    privateKeyHex: decryptPrivateKey(kp.privateKeyHex),
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function generateKeypair(): { publicKeyHex: string; privateKeyHex: string } {
  const priv = ed.utils.randomPrivateKey();
  const pub = ed.getPublicKey(priv);
  return { privateKeyHex: bytesToHex(priv), publicKeyHex: bytesToHex(pub) };
}

async function loadKey(userId: string): Promise<UserKeypair | null> {
  const sb = keySupabase();
  if (!sb) {
    const raw = loadFile().find((k) => k.userId === userId);
    if (!raw) return null;
    const plain = unsealFromStorage(raw);
    // Migrate legacy plaintext on-disk keys to encrypted form lazily on
    // first touch, as long as a master key is configured.
    if (isKeyEncryptionEnabled() && !isEncrypted(raw.privateKeyHex)) {
      await saveKey(plain, { silent: true });
    }
    return plain;
  }
  const { data, error } = await sb
    .from("user_keys")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (supabaseTableMissing(error)) {
      disableKeysSupabase(error.message);
      const raw = loadFile().find((k) => k.userId === userId);
      return raw ? unsealFromStorage(raw) : null;
    }
    console.error("[KeyService] load failed:", error.message);
    return null;
  }
  if (!data) return null;
  const row = data as StoredRow;
  const plain = rowToKeypair(row);
  if (isKeyEncryptionEnabled() && !isEncrypted(row.private_key_hex)) {
    // Re-upsert as encrypted so legacy rows get upgraded.
    await saveKey(plain, { silent: true });
  }
  return plain;
}

async function saveKey(
  kp: UserKeypair,
  opts: { silent?: boolean } = {}
): Promise<void> {
  const sealed = sealForStorage(kp);
  const sb = keySupabase();
  if (!sb) {
    const keys = loadFile().filter((k) => k.userId !== sealed.userId);
    keys.push(sealed);
    saveFile(keys);
    return;
  }
  const { error } = await sb.from("user_keys").upsert({
    user_id: sealed.userId,
    public_key_hex: sealed.publicKeyHex,
    private_key_hex: sealed.privateKeyHex,
    algorithm: sealed.algorithm,
    created_at: sealed.createdAt,
  });
  if (error) {
    if (supabaseTableMissing(error)) {
      disableKeysSupabase(error.message);
      const keys = loadFile().filter((k) => k.userId !== sealed.userId);
      keys.push(sealed);
      saveFile(keys);
      return;
    }
    if (!opts.silent) console.error("[KeyService] save failed:", error.message);
    throw new Error("Failed to store keypair");
  }
}

/**
 * Get the user's keypair, creating a new Ed25519 keypair if one doesn't exist.
 */
export async function getOrCreateKeypair(userId: string): Promise<UserKeypair> {
  const existing = await loadKey(userId);
  if (existing) return existing;

  const { publicKeyHex, privateKeyHex } = generateKeypair();
  const kp: UserKeypair = {
    userId,
    publicKeyHex,
    privateKeyHex,
    algorithm: "Ed25519",
    createdAt: new Date().toISOString(),
  };
  await saveKey(kp);
  console.log(`[KeyService] Generated new Ed25519 keypair for user ${userId}`);
  return kp;
}

/**
 * Fetch the public key (hex) for a user; returns null if none.
 */
export async function getPublicKey(userId: string): Promise<string | null> {
  const kp = await loadKey(userId);
  return kp?.publicKeyHex ?? null;
}

export function sign(privateKeyHex: string, message: Uint8Array): string {
  const sig = ed.sign(message, hexToBytes(privateKeyHex));
  return bytesToHex(sig);
}

export function verify(
  publicKeyHex: string,
  message: Uint8Array,
  signatureHex: string
): boolean {
  try {
    return ed.verify(hexToBytes(signatureHex), message, hexToBytes(publicKeyHex));
  } catch {
    return false;
  }
}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map(
      (k) =>
        `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`
    )
    .join(",")}}`;
}
