#!/usr/bin/env node
/**
 * Deploy contracts to Polygon Amoy and generate backend .env
 * Usage:
 *   1. Create contracts/.env with DEPLOYER_PRIVATE_KEY
 *   2. Get test MATIC: https://faucet.polygon.technology/
 *   3. Run: node scripts/deploy-and-configure.js
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONTRACTS = path.join(ROOT, "contracts");
const BACKEND = path.join(ROOT, "backend");

// Load contracts/.env
const envPath = path.join(CONTRACTS, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    });
}

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const RPC = process.env.WEB3_PROVIDER_URL || "https://rpc-amoy.polygon.technology";

if (!DEPLOYER_KEY) {
  console.error("Error: DEPLOYER_PRIVATE_KEY not set in contracts/.env");
  console.error("");
  console.error("1. Copy contracts/.env.example to contracts/.env");
  console.error("2. Add your wallet private key (with test MATIC on Amoy)");
  console.error("3. Get test MATIC: https://faucet.polygon.technology/");
  process.exit(1);
}

console.log("Deploying to Polygon Amoy...\n");

let deployOutput;
try {
  deployOutput = execSync("npm run deploy", {
    cwd: CONTRACTS,
    encoding: "utf8",
    env: { ...process.env, WEB3_PROVIDER_URL: RPC, DEPLOYER_PRIVATE_KEY: DEPLOYER_KEY },
  });
  console.log(deployOutput);
} catch (e) {
  process.exit(1);
}

const didMatch = deployOutput.match(/DIDRegistry:\s*(0x[a-fA-F0-9]{40})/);
const credMatch = deployOutput.match(/CredentialRegistry:\s*(0x[a-fA-F0-9]{40})/);

if (!didMatch || !credMatch) {
  console.error("Could not parse contract addresses from deploy output");
  process.exit(1);
}

const didAddress = didMatch[1];
const credAddress = credMatch[1];

const envContent = `# ChainShield Backend - Polygon Amoy (auto-generated)
PORT=4000
NODE_ENV=development

WEB3_PROVIDER_URL=${RPC}
DID_REGISTRY_ADDRESS=${didAddress}
CREDENTIAL_REGISTRY_ADDRESS=${credAddress}
ISSUER_PRIVATE_KEY=${DEPLOYER_KEY}

JWT_SECRET=chainshield_production_secret
`;

const backendEnvPath = path.join(BACKEND, ".env");
fs.writeFileSync(backendEnvPath, envContent);

console.log("\n✅ Backend .env created at backend/.env");
console.log("   Restart the backend: cd backend && npm run dev");
console.log("");
