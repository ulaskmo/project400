const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "wei");
  console.log("");

  const didRegistry = await hre.ethers.deployContract("DIDRegistry");
  await didRegistry.waitForDeployment();
  const didAddress = await didRegistry.getAddress();

  const credentialRegistry = await hre.ethers.deployContract("CredentialRegistry");
  await credentialRegistry.waitForDeployment();
  const credAddress = await credentialRegistry.getAddress();

  console.log("DIDRegistry:", didAddress);
  console.log("CredentialRegistry:", credAddress);
  console.log("");
  console.log("--- Add this to backend/.env ---");
  const rpc = process.env.WEB3_PROVIDER_URL || "https://rpc-amoy.polygon.technology";
  console.log(`WEB3_PROVIDER_URL=${rpc}`);
  console.log(`DID_REGISTRY_ADDRESS=${didAddress}`);
  console.log(`CREDENTIAL_REGISTRY_ADDRESS=${credAddress}`);
  console.log("ISSUER_PRIVATE_KEY=<your_private_key_or_same_as_DEPLOYER_PRIVATE_KEY>");
  console.log("--------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
