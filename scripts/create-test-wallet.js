#!/usr/bin/env node
/**
 * Generate a new wallet for Polygon Amoy deployment (testing only)
 * Run: node scripts/create-test-wallet.js
 * Then get test MATIC from https://faucet.polygon.technology/
 */
const path = require("path");
const { Wallet } = require(path.join(__dirname, "../contracts/node_modules/ethers"));

const wallet = Wallet.createRandom();

console.log("\n=== New Test Wallet for Polygon Amoy ===\n");
console.log("Address:", wallet.address);
console.log("Private Key:", wallet.privateKey);
console.log("\n1. Add to contracts/.env:");
console.log("   DEPLOYER_PRIVATE_KEY=" + wallet.privateKey);
console.log("\n2. Get test MATIC: https://faucet.polygon.technology/");
console.log("   (Select Polygon Amoy, paste address above)");
console.log("\n3. Run: node scripts/deploy-and-configure.js");
console.log("");
