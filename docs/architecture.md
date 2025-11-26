## ChainShield Architecture Overview

### System Layers
1. **Smart Contracts / Blockchain**
   - DID registry: maps decentralized identifiers to public keys and revocation metadata.
   - Credential hash registry: stores IPFS hash + issuer signature for verifiable credentials.
   - Revocation registry: flag credentials as revoked/expired with on-chain timestamps.
   - Target network: Polygon (EVM compatible) for low fees; abstract to allow Hyperledger Indy later.

2. **Off-chain Storage**
   - IPFS pinning service holds encrypted credential payloads and metadata.
   - Hash of content + issuer signature stored on-chain; raw data stays off-chain.
   - Optional local Secure Storage (Secure Enclave / Keychain) keeps private keys, AES keys.

3. **Backend API (Node.js + Express)**
   - DID management: onboarding flow, DID document generation, key pair assistance (if user delegates).
   - Credential issuance: issuers upload credential payload, backend signs via issuer key or brokers signing.
   - Revocation endpoints: issuer can mark credential revoked, syncs to smart contract.
   - Verification service: resolve DID, fetch credential hash, validate signature, produce verification result + ZKP hooks.
   - Integration API: REST hooks/webhooks for universities, employers, agencies.
   - External dependencies: Web3 provider (Alchemy/Infura), IPFS SDK, optional Indy SDK for ZKP.

4. **Frontend (React)**
   - User dashboard: DID status, credential vault, sharing controls.
   - Issuer portal: issue/revoke credentials, view pending requests.
   - Verifier console: QR scanner, verification result page.
   - Wallet-like key management: guides users through local key storage, backup phrase.
   - ZKP UX: selective disclosure toggles, proof generation progress.

### Data Flow
1. **Registration**
   - Frontend generates key pair client-side.
   - DID document constructed and sent to backend for anchoring on-chain.
   - Smart contract emits DIDRegistered event; backend indexes for quick lookup.

2. **Credential Issuance**
   - User submits request → issuer verifies off-chain.
   - Issuer portal uploads credential JSON; backend encrypts (AES-256) and pins to IPFS.
   - Smart contract `registerCredential` stores `(credentialId, issuerDid, holderDid, ipfsHash, signature, status)`.

3. **Verification**
   - Verifier scans QR containing credentialId + optional proof.
   - Frontend verifier calls backend `/verify/:credentialId`.
   - Backend pulls on-chain data, fetches IPFS hash if user consent provided, runs signature + revocation checks.
   - Returns `valid/invalid/revoked` plus optional minimal disclosure payload.

4. **Zero-Knowledge Proof**
   - Use zk-SNARK circuits (e.g., circom + snarkjs) or Indy AnonCreds.
   - Proof generation occurs client-side using credential attributes + proving key.
   - Verifier receives proof + public signals, backend verifies using verifier key and returns result without raw data.

### Security Considerations
- Private keys never leave client; backend only sees public DID data.
- All credential payloads encrypted before IPFS upload.
- JWT + DID-auth for API requests.
- Rate limiting + audit logging on issuer/verifier endpoints.
- Revocation checks mandatory on every verification call.

### Next Steps
1. Scaffold backend (Express + TypeScript) with placeholder routes for DID, credentials, verification.
2. Scaffold frontend (React + Vite) with modular pages for User, Issuer, Verifier.
3. Define smart contract interfaces (Solidity) and local Hardhat env.
4. Integrate IPFS SDK + Web3 provider stubs.
5. Add documentation for onboarding, developer setup, and deployment process.

