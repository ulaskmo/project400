import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT) || 4000,
  web3ProviderUrl: process.env.WEB3_PROVIDER_URL ?? "",
  ipfsApiUrl: process.env.IPFS_API_URL ?? "",
  issuerPrivateKey: process.env.ISSUER_PRIVATE_KEY ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "chainshield_dev_secret"
};

