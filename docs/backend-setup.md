## Backend Setup (ChainShield API)

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Create `.env`**
   ```
   PORT=4000
   NODE_ENV=development
   WEB3_PROVIDER_URL=https://polygon-mumbai.infura.io/v3/KEY
   IPFS_API_URL=https://ipfs.infura.io:5001
   ISSUER_PRIVATE_KEY=0xYOUR_KEY
   JWT_SECRET=super_secret_string
   ```

3. **Run in development**
   ```bash
   npm run dev
   ```

4. **Build & start**
   ```bash
   npm run build
   npm start
   ```

The API boots with a health check at `/api/health` and placeholder routes under `/api/dids`, `/api/credentials`, and `/api/verify` that will be wired to blockchain/IPFS integrations in upcoming steps.

