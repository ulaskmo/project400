import { Request, Response } from "express";
import { getChainInfo, verifyCredentialOnChain } from "../services/chainService";
import { getCredentialsByHolder, getCredentialsByIssuer, getCredential } from "../services/credentialService";
import { loadCredentials } from "../services/credentialStorage";
import { getUserById } from "../services/authService";
import {
  checkIpfsHealth,
  fetchJson,
  getIpfsConfig,
  resolvePointer,
} from "../services/ipfsService";

export async function handleChainInfo(_req: Request, res: Response) {
  try {
    const [info, ipfs] = await Promise.all([getChainInfo(), checkIpfsHealth()]);
    res.json({ ...info, ipfs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function handleIpfsStatus(_req: Request, res: Response) {
  try {
    const health = await checkIpfsHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * Fetch the signed VC payload for a credential from IPFS (when the
 * on-chain `ipfsHash` field is an `ipfs://<cid>` pointer). Falls back
 * to the locally-stored VC when the pointer is a `sha256:` hash.
 */
export async function handleFetchCredentialFromIpfs(req: Request, res: Response) {
  const { credentialId } = req.params;
  try {
    const credential = await getCredential(credentialId);
    if (!credential) {
      res.status(404).json({ error: "Credential not found" });
      return;
    }
    const pointer = credential.ipfsHash;
    const resolved = resolvePointer(pointer);

    if (resolved.kind === "ipfs") {
      const fetched = await fetchJson(pointer);
      res.json({
        source: "ipfs",
        pointer,
        cid: resolved.cid,
        gateway: fetched?.gateway,
        data: fetched?.data ?? null,
        localVc: credential.vc ?? null,
      });
      return;
    }

    if (resolved.kind === "sha256") {
      res.json({
        source: "local",
        pointer,
        contentHash: resolved.hash,
        data: credential.vc ?? null,
        note: "IPFS not configured when this credential was issued; returning locally-indexed VC.",
        ipfsConfig: getIpfsConfig(),
      });
      return;
    }

    res.json({
      source: "unknown",
      pointer,
      data: credential.vc ?? null,
      note: "Pointer format not recognised.",
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function handleVerifyCredential(req: Request, res: Response) {
  const { credentialId } = req.params;
  if (!credentialId) {
    res.status(400).json({ error: "credentialId required" });
    return;
  }
  try {
    const result = await verifyCredentialOnChain(credentialId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

// Returns credentials visible to the current user, annotated with their
// on-chain anchor metadata (txHash, blockNumber, onChain flag) so the
// blockchain UI can render them without re-fetching from the chain.
export async function handleMyAnchors(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const role = req.user.role;

    // The JWT middleware only injects { id, role }. Look up the full user
    // record to get the DID (which is what the credential index is keyed by).
    const me = await getUserById(req.user.id);
    const did =
      me?.did || `did:chainshield:${role}-${req.user.id}`;

    let scoped: Awaited<ReturnType<typeof getCredentialsByHolder>> = [];
    if (role === "holder") {
      scoped = await getCredentialsByHolder(did);
    } else if (role === "issuer") {
      scoped = await getCredentialsByIssuer(did);
    } else if (role === "admin" || role === "verifier") {
      // Admins and verifiers see everything so they can audit.
      const all = loadCredentials();
      scoped = all.map((r) => ({
        credentialId: r.credentialId,
        issuerDid: r.issuerDid,
        holderDid: r.holderDid,
        ipfsHash: r.ipfsHash,
        signature: r.signature,
        status: r.status,
        metadata: r.metadata,
      }));
    }

    // Enrich with anchor metadata from the local index file.
    const anchorIndex = new Map(
      loadCredentials().map((r) => [r.credentialId, r])
    );

    const enriched = scoped.map((c) => {
      const local = anchorIndex.get(c.credentialId);
      return {
        ...c,
        onChain: local?.onChain ?? false,
        txHash: local?.txHash,
        blockNumber: local?.blockNumber,
        chainId: local?.chainId,
        anchoredAt: local?.anchoredAt,
        issuedAt: local?.issuedAt,
      };
    });

    res.json({ credentials: enriched });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
