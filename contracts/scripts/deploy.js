const hre = require("hardhat");

async function main() {
  const didRegistry = await hre.ethers.deployContract("DIDRegistry");
  await didRegistry.waitForDeployment();

  const credentialRegistry = await hre.ethers.deployContract(
    "CredentialRegistry"
  );
  await credentialRegistry.waitForDeployment();

  console.log("DIDRegistry:", await didRegistry.getAddress());
  console.log("CredentialRegistry:", await credentialRegistry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
