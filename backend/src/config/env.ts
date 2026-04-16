import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT) || 4000,
  web3ProviderUrl: process.env.WEB3_PROVIDER_URL ?? "",
  didRegistryAddress: process.env.DID_REGISTRY_ADDRESS ?? "",
  credentialRegistryAddress: process.env.CREDENTIAL_REGISTRY_ADDRESS ?? "",
  ipfsApiUrl: process.env.IPFS_API_URL ?? "",
  issuerPrivateKey: process.env.ISSUER_PRIVATE_KEY ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "chainshield_dev_secret",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  appUrl: process.env.APP_URL ?? "http://localhost:5173"
};

