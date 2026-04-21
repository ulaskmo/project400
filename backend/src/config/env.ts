import dotenv from "dotenv";
import { randomBytes } from "crypto";

dotenv.config();

// JWT secret handling:
//  - In production, REQUIRE JWT_SECRET. Refuse to boot without it.
//  - In development, generate a random ephemeral secret per process so we
//    never rely on a shared hard-coded string. Tokens won't survive a
//    restart, which is fine for local development.
function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if ((process.env.NODE_ENV ?? "development") === "production") {
    throw new Error(
      "JWT_SECRET is required in production. Set it in your environment."
    );
  }
  const generated = randomBytes(32).toString("hex");
  // eslint-disable-next-line no-console
  console.warn(
    "[Env] JWT_SECRET not set — using an ephemeral random secret for this dev process."
  );
  return generated;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT) || 4000,
  web3ProviderUrl: process.env.WEB3_PROVIDER_URL ?? "",
  didRegistryAddress: process.env.DID_REGISTRY_ADDRESS ?? "",
  credentialRegistryAddress: process.env.CREDENTIAL_REGISTRY_ADDRESS ?? "",
  issuerPrivateKey: process.env.ISSUER_PRIVATE_KEY ?? "",
  jwtSecret: resolveJwtSecret(),
  keyEncryptionSecret: process.env.KEY_ENCRYPTION_SECRET ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  enableDefaultAdmin: process.env.ENABLE_DEFAULT_ADMIN === "true",
};

/**
 * Single source of truth for "is the backend in blockchain mode?".
 * Previously the health endpoint, credential service and DID service each
 * computed this differently, which could report "blockchain" from /health
 * while credentials silently ran in demo mode.
 */
export function isBlockchainMode(): boolean {
  return Boolean(
    env.web3ProviderUrl &&
      env.credentialRegistryAddress &&
      env.didRegistryAddress &&
      env.issuerPrivateKey
  );
}

