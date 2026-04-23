# ChainShield – Deploying to Polygon Amoy

This guide turns ChainShield from **demo mode** (local JSON only) into
**blockchain mode** where every issued credential is anchored on the
Polygon Amoy public testnet and the new **Blockchain** tab in the UI
can prove it.

> Amoy is Polygon's **free public testnet**. Transactions are real, but
> they use test MATIC (POL) that costs nothing.

---

## 1. Get a wallet + test MATIC

1. Install MetaMask (or use any wallet that can export a private key).
2. Create a new account. **Do not use real funds on this key** — it
   will live in a `.env` file.
3. Copy the **private key** (MetaMask → Account details → Show private key).
4. Add the Amoy network to MetaMask if it isn't there:

   | Setting | Value |
   |---|---|
   | Network name | Polygon Amoy |
   | RPC URL | `https://rpc-amoy.polygon.technology` |
   | Chain ID | `80002` |
   | Currency | `POL` (formerly MATIC) |
   | Explorer | `https://amoy.polygonscan.com` |

5. Request free test MATIC from a faucet:
   - https://faucet.polygon.technology/ (choose Amoy)
   - Paste your wallet address, wait ~30s. You only need ~0.1 POL.

Confirm your balance at
`https://amoy.polygonscan.com/address/<YOUR_ADDRESS>`.

---

## 2. Deploy the contracts

From the repo root:

```bash
cd contracts
cp .env.example .env     # if you have one; otherwise create .env
```

Edit `contracts/.env`:

```bash
WEB3_PROVIDER_URL=https://rpc-amoy.polygon.technology
DEPLOYER_PRIVATE_KEY=0x<your_private_key_without_leading_0x_optional>
```

Install deps and deploy:

```bash
npm install
npm run deploy
```

You will see something like:

```
Deploying with account: 0xabc...
Account balance: 99000000000000000 wei

DIDRegistry: 0x1234...
CredentialRegistry: 0x5678...

--- Add this to backend/.env ---
WEB3_PROVIDER_URL=https://rpc-amoy.polygon.technology
DID_REGISTRY_ADDRESS=0x1234...
CREDENTIAL_REGISTRY_ADDRESS=0x5678...
ISSUER_PRIVATE_KEY=<your_private_key_or_same_as_DEPLOYER_PRIVATE_KEY>
--------------------------------
```

---

## 3. Point the backend at the deployed contracts

Open **`backend/.env`** (copy from `.env.example` if it doesn't exist) and add:

```bash
WEB3_PROVIDER_URL=https://rpc-amoy.polygon.technology
DID_REGISTRY_ADDRESS=0x1234...           # from deploy output
CREDENTIAL_REGISTRY_ADDRESS=0x5678...    # from deploy output
ISSUER_PRIVATE_KEY=0x<your_private_key>  # MUST have MATIC for gas
```

Restart the backend:

```bash
cd backend
npm run dev
```

On startup you should now see:

```
[Credential Service] Running in BLOCKCHAIN MODE - credentials stored on-chain + local index
```

---

## 4. Verify it works in the UI

1. Log into the app and click the new **Blockchain** tab.
2. The status card should show:
   - **Connected to Polygon Amoy**
   - **Chain ID** `80002`
   - **Latest block** ticking up
   - Links to your **CredentialRegistry** contract and **issuer wallet** on PolygonScan
3. Issue a credential (as an issuer). After a few seconds the Blockchain
   tab refreshes and the credential shows:
   - A green **On-chain** badge
   - A **Tx** hash and **Block** number
   - A **View on explorer** link to the actual PolygonScan page
4. Click **Verify on chain** — the backend reads the record directly
   from the contract and shows a side-by-side **local vs on-chain**
   match table with green ticks.

If issuance fails with `insufficient funds`, top up your wallet from
the faucet.

---

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| "Demo mode" still shown | Env not loaded — restart backend after editing `.env` |
| "Blockchain not reachable" | RPC URL typo or Amoy is temporarily down; try again or swap to an Alchemy/Infura Amoy URL |
| `insufficient funds` on issue | Faucet your `ISSUER_PRIVATE_KEY` wallet |
| `Credential already registered` | Contract enforces unique IDs. Issue a new one. |
| Tx shows but explorer says 404 | Give PolygonScan ~15s to index, then refresh |

---

## What actually goes on-chain?

Only the **registry record** — **not** the full credential JSON. Per
`contracts/contracts/CredentialRegistry.sol`:

```solidity
struct CredentialRecord {
    address registeredBy;
    string issuerDid;
    string holderDid;
    string ipfsHash;     // ipfs://<cid> (Pinata) or sha256:<hex> fallback
    string signature;    // issuer's Ed25519 signature
    CredentialStatus status;
    uint256 issuedAt;
    uint256 revokedAt;
}
```

The full W3C Verifiable Credential is pinned to **IPFS via Pinata** on
issuance (see IPFS setup below) and a copy is kept in the local
`credentials.json` index for fast reads. The blockchain anchors the
**integrity + existence** of each credential; the Blockchain tab in the
UI proves that anchoring and lets verifiers re-fetch the VC from any
IPFS gateway.

---

## 6. IPFS via Pinata (optional but recommended)

Without IPFS configured, the backend stores a deterministic
`sha256:<hex>` content hash in the `ipfsHash` slot. With Pinata it
stores an `ipfs://<cid>` pointer that any public gateway can resolve.

1. Create a free account at https://www.pinata.cloud (1 GB free tier).
2. **Keys → New Key**. Grant it the `pinJSONToIPFS` and
   `testAuthentication` permissions. Copy the generated **JWT**.
3. Add to `backend/.env`:

   ```bash
   PINATA_JWT=eyJhbGciOi...
   # Optional — override the default gateway used by the UI:
   # IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
   ```

4. Restart the backend. On issuance you'll see:

   ```
   [Credentials] Pinned VC to IPFS: ipfs://bafy… (sha256 abc123…)
   ```

5. Probe the status:

   ```bash
   curl http://localhost:4000/api/chain/ipfs/status
   ```

6. Retrieve a credential straight from IPFS:

   ```bash
   curl http://localhost:4000/api/chain/credentials/<credentialId>/ipfs
   ```

   The response shows the gateway URL that served the CID, and the
   exact JSON that was pinned.

### What does the backend actually pin?

The **signed W3C Verifiable Credential** — identical to what is stored
locally and returned by `GET /api/credentials/:id/vc`. That's the full
Ed25519-signed JSON with `credentialSubjectCommitments` (so selective
disclosure still works). Because the CID is a hash of the canonical
JSON, any tampering with the off-chain copy immediately breaks both the
IPFS lookup *and* the on-chain match check.
