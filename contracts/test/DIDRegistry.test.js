const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DIDRegistry", function () {
  let registry;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    registry = await ethers.deployContract("DIDRegistry");
    await registry.waitForDeployment();
  });

  describe("registerDID", function () {
    it("should register a new DID", async function () {
      const did = "did:chainshield:abc123";
      const publicKey = "0xPublicKey123";

      const tx = await registry.connect(addr1).registerDID(did, publicKey);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(registry, "DIDRegistered")
        .withArgs(did, addr1.address, publicKey, block.timestamp);

      const [controller, storedKey, createdAt] = await registry.getDID(did);
      expect(controller).to.equal(addr1.address);
      expect(storedKey).to.equal(publicKey);
      expect(createdAt).to.equal(block.timestamp);
    });

    it("should reject empty DID string", async function () {
      await expect(
        registry.registerDID("", "0xkey")
      ).to.be.revertedWith("DID required");
    });

    it("should reject duplicate DID registration", async function () {
      const did = "did:chainshield:duplicate";
      await registry.registerDID(did, "0xkey1");

      await expect(
        registry.connect(addr1).registerDID(did, "0xkey2")
      ).to.be.revertedWith("DID already registered");
    });

    it("should allow different users to register different DIDs", async function () {
      await registry.connect(addr1).registerDID("did:chainshield:user1", "0xkey1");
      await registry.connect(addr2).registerDID("did:chainshield:user2", "0xkey2");

      const [controller1] = await registry.getDID("did:chainshield:user1");
      const [controller2] = await registry.getDID("did:chainshield:user2");

      expect(controller1).to.equal(addr1.address);
      expect(controller2).to.equal(addr2.address);
    });
  });

  describe("getDID", function () {
    it("should return DID data for registered DID", async function () {
      const did = "did:chainshield:lookup-test";
      const publicKey = "0xLookupKey";

      await registry.connect(addr1).registerDID(did, publicKey);

      const [controller, storedKey, createdAt] = await registry.getDID(did);
      expect(controller).to.equal(addr1.address);
      expect(storedKey).to.equal(publicKey);
      expect(createdAt).to.be.gt(0);
    });

    it("should revert for non-existent DID", async function () {
      await expect(
        registry.getDID("did:chainshield:nonexistent")
      ).to.be.revertedWith("DID not found");
    });
  });
});

async function getBlockTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}
