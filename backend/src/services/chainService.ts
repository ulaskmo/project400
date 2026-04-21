import { env, isBlockchainMode } from "../config/env";
import { loadCredentials, StoredCredentialRecord } from "./credentialStorage";

export interface ChainInfo {
  mode: "blockchain" | "demo";
  ready: boolean;
  providerUrl?: string;
  chainId?: number;
  networkName?: string;
  latestBlock?: number;
  contractAddress?: string;
  didRegistryAddress?: string;
  issuerAddress?: string;
  issuerBalanceWei?: string;
  explorerBase?: string;
  error?: string;
}

const KNOWN_NETWORKS: Record<
  number,
  { name: string; explorerBase: string }
> = {
  80002: {
    name: "Polygon Amoy",
    explorerBase: "https://amoy.polygonscan.com",
  },
  137: {
    name: "Polygon Mainnet",
    explorerBase: "https://polygonscan.com",
  },
  1: {
    name: "Ethereum Mainnet",
    explorerBase: "https://etherscan.io",
  },
  11155111: {
    name: "Sepolia",
    explorerBase: "https://sepolia.etherscan.io",
  },
  31337: {
    name: "Hardhat Local",
    explorerBase: "",
  },
};

const isDemoMode = () => !isBlockchainMode();

export async function getChainInfo(): Promise<ChainInfo> {
  if (isDemoMode()) {
    return {
      mode: "demo",
      ready: false,
      error:
        "Blockchain mode disabled. Set WEB3_PROVIDER_URL, CREDENTIAL_REGISTRY_ADDRESS, and ISSUER_PRIVATE_KEY in backend/.env, then restart.",
    };
  }

  try {
    const { provider } = await import("./web3Client");
    const { Wallet } = await import("ethers");

    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
    ]);

    const chainId = Number(network.chainId);
    const known = KNOWN_NETWORKS[chainId];

    let issuerAddress: string | undefined;
    let issuerBalanceWei: string | undefined;
    if (env.issuerPrivateKey) {
      try {
        const wallet = new Wallet(env.issuerPrivateKey, provider);
        issuerAddress = wallet.address;
        const bal = await provider.getBalance(wallet.address);
        issuerBalanceWei = bal.toString();
      } catch {
        // ignore bad key
      }
    }

    return {
      mode: "blockchain",
      ready: true,
      providerUrl: env.web3ProviderUrl,
      chainId,
      networkName: known?.name ?? network.name ?? `Chain ${chainId}`,
      latestBlock: blockNumber,
      contractAddress: env.credentialRegistryAddress,
      didRegistryAddress: env.didRegistryAddress || undefined,
      issuerAddress,
      issuerBalanceWei,
      explorerBase: known?.explorerBase,
    };
  } catch (err) {
    return {
      mode: "blockchain",
      ready: false,
      providerUrl: env.web3ProviderUrl,
      contractAddress: env.credentialRegistryAddress,
      error: (err as Error).message,
    };
  }
}

export interface OnChainCredentialRecord {
  issuerDid: string;
  holderDid: string;
  ipfsHash: string;
  signature: string;
  status: "valid" | "revoked" | "expired";
  issuedAt: string;
  revokedAt?: string;
}

export interface ChainVerificationResult {
  credentialId: string;
  localRecord: StoredCredentialRecord | null;
  onChainRecord: OnChainCredentialRecord | null;
  matches: {
    issuerDid: boolean;
    holderDid: boolean;
    ipfsHash: boolean;
    signature: boolean;
    status: boolean;
    all: boolean;
  } | null;
  chainInfo: {
    chainId?: number;
    networkName?: string;
    explorerBase?: string;
    txHash?: string;
    blockNumber?: number;
  };
  mode: "blockchain" | "demo";
  note?: string;
}

function mapStatus(
  status: number | bigint
): "valid" | "revoked" | "expired" {
  const n = Number(status);
  if (n === 1) return "revoked";
  if (n === 2) return "expired";
  return "valid";
}

export async function verifyCredentialOnChain(
  credentialId: string
): Promise<ChainVerificationResult> {
  const credentials = loadCredentials();
  const localRecord =
    credentials.find((c) => c.credentialId === credentialId) ?? null;

  const info = await getChainInfo();
  const baseChain = {
    chainId: info.chainId,
    networkName: info.networkName,
    explorerBase: info.explorerBase,
    txHash: localRecord?.txHash,
    blockNumber: localRecord?.blockNumber,
  };

  if (info.mode === "demo" || !info.ready) {
    return {
      credentialId,
      localRecord,
      onChainRecord: null,
      matches: null,
      chainInfo: baseChain,
      mode: "demo",
      note:
        "Blockchain mode is not active. Credentials shown here only exist in the local index. Configure .env to enable on-chain writes.",
    };
  }

  try {
    const { getReadOnlyCredentialRegistry } = await import("./web3Client");
    const registry = getReadOnlyCredentialRegistry();
    const [
      issuerDid,
      holderDid,
      ipfsHash,
      signature,
      status,
      issuedAt,
      revokedAt,
    ] = await registry.getCredential(credentialId);

    const onChainRecord: OnChainCredentialRecord = {
      issuerDid,
      holderDid,
      ipfsHash,
      signature,
      status: mapStatus(status),
      issuedAt: new Date(Number(issuedAt) * 1000).toISOString(),
      revokedAt:
        Number(revokedAt) > 0
          ? new Date(Number(revokedAt) * 1000).toISOString()
          : undefined,
    };

    const matches = localRecord
      ? {
          issuerDid: localRecord.issuerDid === onChainRecord.issuerDid,
          holderDid: localRecord.holderDid === onChainRecord.holderDid,
          ipfsHash: localRecord.ipfsHash === onChainRecord.ipfsHash,
          signature: localRecord.signature === onChainRecord.signature,
          status: localRecord.status === onChainRecord.status,
          all: false,
        }
      : null;
    if (matches) {
      matches.all =
        matches.issuerDid &&
        matches.holderDid &&
        matches.ipfsHash &&
        matches.signature &&
        matches.status;
    }

    return {
      credentialId,
      localRecord,
      onChainRecord,
      matches,
      chainInfo: baseChain,
      mode: "blockchain",
    };
  } catch (err) {
    return {
      credentialId,
      localRecord,
      onChainRecord: null,
      matches: null,
      chainInfo: baseChain,
      mode: "blockchain",
      note: `Not found on chain: ${(err as Error).message}`,
    };
  }
}
