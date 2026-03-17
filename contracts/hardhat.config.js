require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Polygon Amoy testnet (Mumbai deprecated)
const AMOY_RPC = process.env.WEB3_PROVIDER_URL || "https://rpc-amoy.polygon.technology";

module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    polygonAmoy: {
      url: AMOY_RPC,
      chainId: 80002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : []
    },
    polygonMumbai: {
      url: process.env.WEB3_PROVIDER_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : []
    }
  }
};
