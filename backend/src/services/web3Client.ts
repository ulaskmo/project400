import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { env } from "../config/env";

const didRegistryAbi = [
  "function registerDID(string did, string publicKey) external",
  "function getDID(string did) external view returns (address controller, string publicKey, uint256 createdAt)"
];

const credentialRegistryAbi = [
  "function registerCredential(string credentialId,string issuerDid,string holderDid,string ipfsHash,string signature) external",
  "function revokeCredential(string credentialId) external",
  "function getCredential(string credentialId) external view returns (string issuerDid,string holderDid,string ipfsHash,string signature,uint8 status,uint256 issuedAt,uint256 revokedAt)"
];

const provider = new JsonRpcProvider(env.web3ProviderUrl);

const getSigner = () => {
  if (!env.issuerPrivateKey) {
    throw new Error("Missing ISSUER_PRIVATE_KEY");
  }
  return new Wallet(env.issuerPrivateKey, provider);
};

const getDidRegistry = () => {
  if (!env.didRegistryAddress) {
    throw new Error("Missing DID_REGISTRY_ADDRESS");
  }
  return new Contract(env.didRegistryAddress, didRegistryAbi, getSigner());
};

const getCredentialRegistry = () => {
  if (!env.credentialRegistryAddress) {
    throw new Error("Missing CREDENTIAL_REGISTRY_ADDRESS");
  }
  return new Contract(
    env.credentialRegistryAddress,
    credentialRegistryAbi,
    getSigner()
  );
};

const getReadOnlyDidRegistry = () => {
  if (!env.didRegistryAddress) {
    throw new Error("Missing DID_REGISTRY_ADDRESS");
  }
  return new Contract(env.didRegistryAddress, didRegistryAbi, provider);
};

const getReadOnlyCredentialRegistry = () => {
  if (!env.credentialRegistryAddress) {
    throw new Error("Missing CREDENTIAL_REGISTRY_ADDRESS");
  }
  return new Contract(
    env.credentialRegistryAddress,
    credentialRegistryAbi,
    provider
  );
};

export {
  getCredentialRegistry,
  getDidRegistry,
  getReadOnlyCredentialRegistry,
  getReadOnlyDidRegistry,
  provider
};
