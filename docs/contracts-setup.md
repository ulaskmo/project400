## Contracts Setup (Hardhat)

1. **Install dependencies**
   ```bash
   cd contracts
   npm install
   ```

2. **Create `.env`**
   ```
   WEB3_PROVIDER_URL=https://polygon-mumbai.infura.io/v3/KEY
   DEPLOYER_PRIVATE_KEY=0xYOUR_KEY
   ```

3. **Compile**
   ```bash
   npm run build
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

The deploy script prints the contract addresses for `DIDRegistry` and
`CredentialRegistry`. Copy those into the backend `.env` as
`DID_REGISTRY_ADDRESS` and `CREDENTIAL_REGISTRY_ADDRESS`.
