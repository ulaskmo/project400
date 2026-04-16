# ChainShield — Changes Report

A summary of what has been changed and what currently does not work.

---

## What Has Been Changed

### 1. QR Modal — Stays Open Longer

**File:** `frontend/src/components/UserPanel.tsx`

**Problem:** The credential QR modal was closing immediately after opening, before users could scan it.

**Fix:** Added a 400ms delay before allowing backdrop clicks to close the modal. This avoids the same tap that opens the modal from being interpreted as a backdrop click.

- Added `modalOpenedAt` state to record when the modal opens
- Backdrop `onClick` now ignores clicks within 400ms of opening
- Modal still closes via the X button or by clicking the backdrop after the delay

---

### 2. User Persistence — Survives Restart & Refresh

**Files:**
- `backend/src/services/userStorage.ts` (new)
- `backend/src/services/authService.ts` (updated)
- `.gitignore` (updated)

**Problem:** Users were stored only in memory and were lost on backend restart or page refresh.

**Fix:** Users are now persisted to a JSON file.

- **userStorage.ts:** Loads/saves users from `backend/data/users.json`
- **authService.ts:** Loads users on startup and saves on register/login
- **.gitignore:** Added `backend/data/` so user data is not committed

Registered users now persist across:
- Page refreshes
- Backend restarts

---

### 3. Previously Completed (from earlier work)

| Area | Change |
|------|--------|
| **Password security** | bcrypt hashing (10 rounds) |
| **Credential metadata** | type, subjectName, description, issuedBy, expiresAt |
| **Admin stats** | `/api/stats`, `/api/stats/credentials` |
| **Health endpoint** | `/api/health` returns `{ status, mode: "blockchain" \| "demo" }` |
| **Backend tests** | 24 API tests (supertest + Node test runner) |
| **Blockchain** | Deployed to Polygon Amoy; backend uses real contracts when env vars are set |
| **IssuerPanel** | Revoke button, subject/description/expiry, richer credential cards |
| **AdminPanel** | Tabs (Overview, Users, Credentials), system stats |
| **UserPanel** | DID copy button, richer credential details, QR modal |
| **VerifierPanel** | URL verification mode, verification history |
| **LoginPage** | Shows "Blockchain mode" or "Demo mode" based on `/api/health` |
| **QR URL** | `frontend/src/utils/url.ts` with `getVerificationUrl()` using `VITE_APP_URL` when set |
| **Contracts** | 16 Hardhat tests for DIDRegistry and CredentialRegistry |

---

## What Does Not Work

### 1. Backend API Tests — 3 Failing Credential Tests

**Status:** 21 of 24 tests pass. 3 credential tests fail.

**Failing tests:**
- `GET /credentials/my returns holder credentials` — expects `res.body.length >= 1`, gets empty
- `GET /credentials/issued returns issuer credentials` — expects credential in list, gets empty
- `GET /credentials/my shows revoked credential` — expects credential in list, gets undefined

**Likely cause:** When the backend runs with blockchain env vars set (`WEB3_PROVIDER_URL`, `CREDENTIAL_REGISTRY_ADDRESS`, `ISSUER_PRIVATE_KEY`), it uses blockchain mode. In blockchain mode, `getCredentialsByHolder` and `getCredentialsByIssuer` in `credentialService.ts` return empty arrays because they are not implemented for blockchain:

```typescript
// credentialService.ts lines 135–136, 154–155
// Real blockchain mode would query events or use subgraph
return [];
```

Credentials are written to the blockchain, but listing by holder/issuer is not implemented for blockchain mode.

---

### 2. Blockchain Mode — Credential Listing Not Implemented

**File:** `backend/src/services/credentialService.ts`

**Issue:** In blockchain mode:
- `getCredentialsByHolder(holderDid)` always returns `[]`
- `getCredentialsByIssuer(issuerDid)` always returns `[]`

**Impact:** Holders cannot see their credentials, issuers cannot see issued credentials, and the UI shows empty lists when using Polygon Amoy or another real blockchain.

**Required fix:** Query blockchain events (e.g. `CredentialRegistered`, `CredentialRevoked`) or use a subgraph/indexer to list credentials by holder/issuer.

---

### 3. Credentials Not Persisted in Demo Mode

**File:** `backend/src/services/mockStorage.ts`

**Issue:** Credentials in demo mode are stored in an in-memory `Map`. They are lost when the backend restarts.

**Impact:** In demo mode, all credentials disappear after restart. Users are persisted (via JSON file), but credentials are not.

---

### 4. QR Code — Phone Scanning on Localhost

**Issue:** QR codes embed a verification URL. On localhost, that URL points to `http://localhost:5173/verify/...`, which is not reachable from a phone on another network.

**Workaround:** Use ngrok (`ngrok http 5173`) or deploy the frontend, then set `VITE_APP_URL` in `.env.local` to the public URL.

---

### 5. Stats API in Blockchain Mode

**File:** `backend/src/controllers/statsController.ts`

**Issue:** Admin stats (`/api/stats`, `/api/stats/credentials`) use `mockCredentialRegistry.listAll()`, which is empty in blockchain mode.

**Impact:** Admin dashboard shows zero credentials and incorrect stats when using a real blockchain.

---

## Summary Table

| Feature | Demo Mode | Blockchain Mode |
|---------|-----------|-----------------|
| User registration/login | ✅ Works | ✅ Works |
| User persistence | ✅ Works (JSON file) | ✅ Works (JSON file) |
| Issue credential | ✅ Works | ✅ Works |
| Get single credential | ✅ Works | ✅ Works |
| List holder credentials | ✅ Works | ❌ Returns empty |
| List issuer credentials | ✅ Works | ❌ Returns empty |
| Revoke credential | ✅ Works | ✅ Works |
| Verification (public) | ✅ Works | ✅ Works |
| Admin stats | ✅ Works | ❌ Uses mock (empty) |
| Credential persistence | ❌ Lost on restart | ✅ On-chain |
| QR modal | ✅ Fixed (stays open) | ✅ Fixed (stays open) |

---

## Recommendations

1. **Implement credential listing for blockchain mode** — Query contract events or add a subgraph.
2. **Add credential persistence in demo mode** — Use a JSON file similar to user storage.
3. **Update stats controller for blockchain mode** — Query on-chain data instead of mock storage.
4. **Fix or skip credential tests when blockchain env is set** — Or run tests in demo mode only.
