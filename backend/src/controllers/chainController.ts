import { Request, Response } from "express";
import { getChainInfo, verifyCredentialOnChain } from "../services/chainService";
import { getCredentialsByHolder, getCredentialsByIssuer } from "../services/credentialService";
import { loadCredentials } from "../services/credentialStorage";
import { getUserById } from "../services/authService";

export async function handleChainInfo(_req: Request, res: Response) {
  try {
    const info = await getChainInfo();
    res.json(info);
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
