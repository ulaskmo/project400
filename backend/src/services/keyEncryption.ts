/**
 * Symmetric encryption for Ed25519 private keys at rest.
 *
 * The master key is derived from KEY_ENCRYPTION_SECRET via scrypt so the
 * operator can use any human-readable string. We use AES-256-GCM, which
 * also authenticates the ciphertext (detects tampering on decrypt).
 *
 * Stored format: "enc:v1:<ivHex>:<authTagHex>:<cipherHex>"
 *
 * Keys written before encryption was enabled are plain hex (no "enc:"
 * prefix); we detect that and transparently re-encrypt on next save.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { env } from "../config/env";

const ENC_PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
// Fixed salt is intentional — the master key itself is the secret. A
// rotating salt would require a separate KMS to store it.
const SALT = Buffer.from("chainshield/key-at-rest/v1", "utf8");

let cachedKey: Buffer | null = null;

function masterKey(): Buffer | null {
  if (!env.keyEncryptionSecret) return null;
  if (cachedKey) return cachedKey;
  cachedKey = scryptSync(env.keyEncryptionSecret, SALT, KEY_LEN);
  return cachedKey;
}

export function isKeyEncryptionEnabled(): boolean {
  return Boolean(env.keyEncryptionSecret);
}

export function encryptPrivateKey(privateKeyHex: string): string {
  const key = masterKey();
  if (!key) return privateKeyHex;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([
    cipher.update(Buffer.from(privateKeyHex, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decryptPrivateKey(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }
  const key = masterKey();
  if (!key) {
    throw new Error(
      "Encountered an encrypted private key but KEY_ENCRYPTION_SECRET is not configured. " +
        "Set KEY_ENCRYPTION_SECRET to the same value used when the keys were stored."
    );
  }
  const body = stored.slice(ENC_PREFIX.length);
  const [ivHex, tagHex, ctHex] = body.split(":");
  if (!ivHex || !tagHex || !ctHex) {
    throw new Error("Malformed encrypted key payload");
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(ENC_PREFIX);
}
