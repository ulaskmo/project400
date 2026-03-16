const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry", function () {
  let registry;
  let owner, issuer, holder;

  beforeEach(async function () {
    [owner, issuer, holder] = await ethers.getSigners();
    registry = await ethers.deployContract("CredentialRegistry");
    await registry.waitForDeployment();
  });

  describe("registerCredential", function () {
    it("should register a new credential", async function () {
      const id = "cred-001";
      const issuerDid = "did:chainshield:issuer1";
      const holderDid = "did:chainshield:holder1";
      const ipfsHash = "QmTestHash123";
      const signature = "sig_test_123";

      await expect(
        registry.connect(issuer).registerCredential(id, issuerDid, holderDid, ipfsHash, signature)
      ).to.emit(registry, "CredentialRegistered");

      const [rIssuer, rHolder, rHash, rSig, status, issuedAt] =
        await registry.getCredential(id);

      expect(rIssuer).to.equal(issuerDid);
      expect(rHolder).to.equal(holderDid);
      expect(rHash).to.equal(ipfsHash);
      expect(rSig).to.equal(signature);
      expect(status).to.equal(0); // Valid
      expect(issuedAt).to.be.gt(0);
    });

    it("should reject empty credential ID", async function () {
      await expect(
        registry.registerCredential("", "did:i", "did:h", "hash", "sig")
      ).to.be.revertedWith("Credential ID required");
    });

    it("should reject duplicate credential ID", async function () {
      await registry.registerCredential("cred-dup", "did:i", "did:h", "hash", "sig");

      await expect(
        registry.registerCredential("cred-dup", "did:i2", "did:h2", "hash2", "sig2")
      ).to.be.revertedWith("Credential already registered");
    });

    it("should register multiple credentials", async function () {
      await registry.registerCredential("cred-a", "did:i", "did:h1", "hash1", "sig1");
      await registry.registerCredential("cred-b", "did:i", "did:h2", "hash2", "sig2");
      await registry.registerCredential("cred-c", "did:i", "did:h3", "hash3", "sig3");

      const [, h1] = await registry.getCredential("cred-a");
      const [, h2] = await registry.getCredential("cred-b");
      const [, h3] = await registry.getCredential("cred-c");

      expect(h1).to.equal("did:h1");
      expect(h2).to.equal("did:h2");
      expect(h3).to.equal("did:h3");
    });
  });

  describe("revokeCredential", function () {
    beforeEach(async function () {
      await registry.registerCredential("cred-rev", "did:i", "did:h", "hash", "sig");
    });

    it("should revoke a valid credential", async function () {
      await expect(registry.revokeCredential("cred-rev"))
        .to.emit(registry, "CredentialRevoked");

      const [, , , , status, , revokedAt] = await registry.getCredential("cred-rev");
      expect(status).to.equal(1); // Revoked
      expect(revokedAt).to.be.gt(0);
    });

    it("should reject revoking non-existent credential", async function () {
      await expect(
        registry.revokeCredential("cred-nonexistent")
      ).to.be.revertedWith("Credential not found");
    });

    it("should reject revoking already revoked credential", async function () {
      await registry.revokeCredential("cred-rev");

      await expect(
        registry.revokeCredential("cred-rev")
      ).to.be.revertedWith("Credential not active");
    });
  });

  describe("getCredential", function () {
    it("should return full credential data", async function () {
      await registry.registerCredential("cred-full", "did:issuer", "did:holder", "QmHash", "signature123");

      const [issuerDid, holderDid, ipfsHash, signature, status, issuedAt, revokedAt] =
        await registry.getCredential("cred-full");

      expect(issuerDid).to.equal("did:issuer");
      expect(holderDid).to.equal("did:holder");
      expect(ipfsHash).to.equal("QmHash");
      expect(signature).to.equal("signature123");
      expect(status).to.equal(0);
      expect(issuedAt).to.be.gt(0);
      expect(revokedAt).to.equal(0);
    });

    it("should revert for non-existent credential", async function () {
      await expect(
        registry.getCredential("cred-missing")
      ).to.be.revertedWith("Credential not found");
    });

    it("should reflect revoked status after revocation", async function () {
      await registry.registerCredential("cred-status", "did:i", "did:h", "hash", "sig");
      
      let [, , , , status] = await registry.getCredential("cred-status");
      expect(status).to.equal(0); // Valid

      await registry.revokeCredential("cred-status");

      [, , , , status] = await registry.getCredential("cred-status");
      expect(status).to.equal(1); // Revoked
    });
  });
});
