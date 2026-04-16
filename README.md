# ChainShield — Self-Sovereign Identity Platform

A blockchain-based Self-Sovereign Identity (SSI) platform for issuing, holding, and verifying decentralized credentials. Built with React, Express, Solidity, and Hardhat.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│  LoginPage · UserPanel · IssuerPanel · VerifierPanel    │
│  AdminPanel · PublicVerifyPage                           │
├─────────────────────────────────────────────────────────┤
│                  Backend API (Express + TS)              │
│  Auth (JWT + bcrypt) · DID · Credential · Verification  │
│  Stats · Middleware (auth, error handling)               │
├─────────────────────────────────────────────────────────┤
│              Smart Contracts (Solidity 0.8.20)           │
│           DIDRegistry · CredentialRegistry              │
├─────────────────────────────────────────────────────────┤
│            Blockchain (Polygon / Hardhat local)          │
└─────────────────────────────────────────────────────────┘
```

### Roles

| Role | Capabilities |
|------|-------------|
| **Holder** | Create DID, receive credentials, self-attest credentials, share via QR |
| **Issuer** | Issue verifiable credentials to holders, revoke credentials |
| **Verifier** | Verify credential authenticity via ID, QR data, or URL |
| **Admin** | Manage users, view system stats, browse all credentials and DIDs |

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

The API starts at `http://localhost:4000`. A default admin account is created automatically:
- Email: `admin@chainshield.io`
- Password: `admin123`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### 3. Smart Contracts (optional)

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

To deploy to a local Hardhat node:

```bash
npx hardhat node                    # Terminal 1
npx hardhat run scripts/deploy.js --network localhost  # Terminal 2
```

## Connect to Polygon Amoy (Real Blockchain)

To use the real Polygon Amoy testnet instead of demo mode:

1. **Create `contracts/.env`** (or use the one from `create-test-wallet`):
   ```bash
   cp contracts/.env.example contracts/.env
   ```
   Add `DEPLOYER_PRIVATE_KEY=0x...` (your wallet private key).

2. **Get test MATIC** — Go to [Polygon Faucet](https://faucet.polygon.technology/), select **Polygon Amoy**, paste your wallet address, and request test MATIC.

3. **Deploy and configure**:
   ```bash
   node scripts/deploy-and-configure.js
   ```
   This deploys the contracts to Polygon Amoy and creates `backend/.env` automatically.

4. **Restart the backend**:
   ```bash
   cd backend && npm run dev
   ```

You should see `[DID Service]` and `[Credential Service]` without "DEMO MODE" — you're now on-chain.

**Optional:** Generate a new test wallet: `node scripts/create-test-wallet.js`

## QR Codes & Phone Scanning

QR codes embed a verification URL. On localhost, that URL won't work when scanned from a phone. To fix:

1. **Deploy the frontend** (Vercel, Netlify, etc.) and set `VITE_APP_URL=https://your-app.vercel.app` in the build environment.
2. **Or use ngrok for local testing:** `ngrok http 5173`, then create `frontend/.env.local` with `VITE_APP_URL=https://your-ngrok-url.ngrok.io` and restart the dev server.

## Project Structure

```
project400/
├── frontend/                 # React + Vite SPA
│   └── src/
│       ├── api/client.ts     # API client with auth
│       ├── components/       # LoginPage, UserPanel, IssuerPanel, VerifierPanel, AdminPanel, PublicVerifyPage
│       └── context/          # AuthContext (JWT state management)
├── backend/                  # Express + TypeScript API
│   └── src/
│       ├── config/           # Environment configuration
│       ├── controllers/      # Route handlers
│       ├── middleware/        # Auth (JWT), error handling
│       ├── routes/           # API route definitions
│       └── services/         # Business logic (auth, DID, credential, verification, mock storage, web3)
├── contracts/                # Hardhat + Solidity
│   ├── contracts/            # DIDRegistry.sol, CredentialRegistry.sol
│   ├── test/                 # Contract tests
│   └── scripts/              # Deploy scripts
└── docs/                     # Architecture & setup documentation
```

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register as holder |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/profile` | JWT | Get current user |
| GET | `/api/auth/users` | Admin | List all users |
| POST | `/api/auth/users` | Admin | Create user (any role) |

### DIDs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/dids` | Holder | Create DID |
| GET | `/api/dids` | Admin | List all DIDs |

### Credentials
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/credentials` | Issuer | Issue credential |
| POST | `/api/credentials/self` | Holder | Self-attest credential |
| GET | `/api/credentials/my` | Holder | My credentials |
| GET | `/api/credentials/issued` | Issuer | Issued credentials |
| GET | `/api/credentials/:id` | Auth | Get credential |
| POST | `/api/credentials/:id/revoke` | Issuer | Revoke credential |

### Verification
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/verify/:credentialId` | Public | Public verification |
| POST | `/api/verify` | Verifier | Authenticated verification |

### Stats
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stats` | Admin | System statistics |
| GET | `/api/stats/credentials` | Admin | All credentials |

## Smart Contracts

### DIDRegistry
- `registerDID(did, publicKey)` — Register a new DID
- `getDID(did)` — Resolve DID to controller, public key, and timestamp

### CredentialRegistry
- `registerCredential(id, issuerDid, holderDid, ipfsHash, signature)` — Register credential
- `revokeCredential(id)` — Revoke a credential
- `getCredential(id)` — Get credential details and status

## Security

- Passwords hashed with **bcrypt** (10 rounds)
- JWT authentication with 24-hour expiry
- Role-based access control (holder, issuer, verifier, admin)
- Helmet security headers
- CORS configuration
- Input validation on all endpoints

## Demo Mode

When blockchain environment variables are not set, the backend runs in **demo mode** using in-memory storage. This allows full functionality without deploying contracts. Set the following in `backend/.env` to connect to a real blockchain:

```
WEB3_PROVIDER_URL=https://polygon-amoy.infura.io/v3/YOUR_KEY
DID_REGISTRY_ADDRESS=0x...
CREDENTIAL_REGISTRY_ADDRESS=0x...
ISSUER_PRIVATE_KEY=0x...
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7 |
| Backend | Node.js, Express 5, TypeScript |
| Auth | JWT, bcrypt |
| Blockchain | Solidity 0.8.20, Hardhat, ethers.js |
| Testing | Hardhat (contracts), Node.js test runner (backend) |

## License

ISC
