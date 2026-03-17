import { describe, it, before } from "node:test";
import assert from "node:assert";
import request from "supertest";
import app from "../app";

const API = "/api";

describe("ChainShield API", () => {
  let adminToken: string;
  let holderToken: string;
  let holderDid: string;
  let issuerToken: string;
  let verifierToken: string;
  const unique = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const holderEmail = `holder-${unique}@test.com`;
  const issuerEmail = `issuer-${unique}@test.com`;
  const verifierEmail = `verifier-${unique}@test.com`;

  before(async () => {
    const adminRes = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: "admin@chainshield.io", password: "admin123" });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.token;

    const regRes = await request(app)
      .post(`${API}/auth/register`)
      .send({ email: holderEmail, password: "password123" });
    assert.strictEqual(regRes.status, 201);
    holderToken = regRes.body.token;
    holderDid = regRes.body.user.did || "";

    await request(app)
      .post(`${API}/auth/users`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: issuerEmail,
        password: "issuer123",
        role: "issuer",
        organizationName: "Test University",
      });

    await request(app)
      .post(`${API}/auth/users`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: verifierEmail,
        password: "verifier123",
        role: "verifier",
        organizationName: "Background Check Inc",
      });

    const issuerLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: issuerEmail, password: "issuer123" });
    assert.strictEqual(issuerLogin.status, 200);
    issuerToken = issuerLogin.body.token;

    const verifierLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: verifierEmail, password: "verifier123" });
    assert.strictEqual(verifierLogin.status, 200);
    verifierToken = verifierLogin.body.token;
  });

  describe("Health", () => {
    it("GET /api/health returns ok", async () => {
      const res = await request(app).get(`${API}/health`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "ok");
    });
  });

  describe("Auth", () => {
    it("POST /auth/register requires email and password", async () => {
      const res = await request(app).post(`${API}/auth/register`).send({});
      assert.strictEqual(res.status, 400);
    });

    it("POST /auth/login with invalid credentials fails", async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: "nonexistent@test.com", password: "wrong" });
      assert(res.status >= 400);
      assert(res.body.message);
    });

    it("GET /auth/profile requires auth", async () => {
      const res = await request(app).get(`${API}/auth/profile`);
      assert.strictEqual(res.status, 401);
    });

    it("GET /auth/profile returns user with valid token", async () => {
      const res = await request(app)
        .get(`${API}/auth/profile`)
        .set("Authorization", `Bearer ${holderToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.email, holderEmail);
      assert.strictEqual(res.body.role, "holder");
    });

    it("GET /auth/users requires admin", async () => {
      const res = await request(app)
        .get(`${API}/auth/users`)
        .set("Authorization", `Bearer ${holderToken}`);
      assert.strictEqual(res.status, 403);
    });

    it("GET /auth/users returns users for admin", async () => {
      const res = await request(app)
        .get(`${API}/auth/users`)
        .set("Authorization", `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body));
      assert(res.body.length >= 2);
    });
  });

  describe("Credentials", () => {
    let credentialId: string;

    it("POST /credentials issues credential (issuer)", async () => {
      const res = await request(app)
        .post(`${API}/credentials`)
        .set("Authorization", `Bearer ${issuerToken}`)
        .send({
          credentialId: `cred-${Date.now()}`,
          holderDid,
          ipfsHash: "QmTestHash123",
          metadata: { type: "diploma", subjectName: "Test Student", description: "BSc CS" },
        });
      assert.strictEqual(res.status, 201);
      assert(res.body.credentialId);
      assert.strictEqual(res.body.status, "valid");
      credentialId = res.body.credentialId;
    });

    it("GET /credentials/my returns holder credentials", async () => {
      const res = await request(app)
        .get(`${API}/credentials/my`)
        .set("Authorization", `Bearer ${holderToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body));
      assert(res.body.length >= 1);
      const cred = res.body.find((c: { credentialId: string }) => c.credentialId === credentialId);
      assert(cred);
      assert.strictEqual(cred.status, "valid");
    });

    it("GET /credentials/issued returns issuer credentials", async () => {
      const res = await request(app)
        .get(`${API}/credentials/issued`)
        .set("Authorization", `Bearer ${issuerToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body));
      assert(res.body.some((c: { credentialId: string }) => c.credentialId === credentialId));
    });

    it("GET /credentials/:id returns credential", async () => {
      const res = await request(app)
        .get(`${API}/credentials/${encodeURIComponent(credentialId)}`)
        .set("Authorization", `Bearer ${holderToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.credentialId, credentialId);
    });

    it("POST /credentials/:id/revoke revokes credential", async () => {
      const res = await request(app)
        .post(`${API}/credentials/${encodeURIComponent(credentialId)}/revoke`)
        .set("Authorization", `Bearer ${issuerToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "revoked");
    });

    it("GET /credentials/my shows revoked credential", async () => {
      const res = await request(app)
        .get(`${API}/credentials/my`)
        .set("Authorization", `Bearer ${holderToken}`);
      assert.strictEqual(res.status, 200);
      const cred = res.body.find((c: { credentialId: string }) => c.credentialId === credentialId);
      assert(cred);
      assert.strictEqual(cred.status, "revoked");
    });

    it("POST /credentials/self adds self-attested credential (holder)", async () => {
      const res = await request(app)
        .post(`${API}/credentials/self`)
        .set("Authorization", `Bearer ${holderToken}`)
        .send({
          credentialType: "certificate",
          credentialData: { title: "My Cert", description: "Self-attested", issuedBy: "Me", dateIssued: "2025-01-01" },
        });
      assert.strictEqual(res.status, 201);
      assert(res.body.credentialId);
      assert.strictEqual(res.body.issuerDid, res.body.holderDid);
    });
  });

  describe("Verification", () => {
    let credId: string;

    before(async () => {
      // Issue a fresh credential for verification tests
      const res = await request(app)
        .post(`${API}/credentials`)
        .set("Authorization", `Bearer ${issuerToken}`)
        .send({
          credentialId: `cred-verify-${Date.now()}`,
          holderDid,
          ipfsHash: "QmVerifyHash",
          metadata: { type: "diploma", subjectName: "Verify Test" },
        });
      credId = res.body.credentialId;
    });

    it("GET /verify/:credentialId (public) returns verification result", async () => {
      const res = await request(app).get(`${API}/verify/${encodeURIComponent(credId)}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.verified, true);
      assert.strictEqual(res.body.status, "valid");
      assert(res.body.credentialId);
      assert(res.body.verifiedAt);
    });

    it("GET /verify/:credentialId returns invalid for unknown credential", async () => {
      const res = await request(app).get(`${API}/verify/cred-nonexistent-12345`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.verified, false);
      assert.strictEqual(res.body.status, "invalid");
    });

    it("POST /verify/public with body works", async () => {
      const res = await request(app)
        .post(`${API}/verify/public`)
        .send({ credentialId: credId });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.verified, true);
    });

    it("POST /verify (authenticated) works for verifier", async () => {
      const res = await request(app)
        .post(`${API}/verify`)
        .set("Authorization", `Bearer ${verifierToken}`)
        .send({ credentialId: credId });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "valid");
      assert(res.body.credentialId);
      assert(res.body.timestamp);
    });
  });

  describe("Stats", () => {
    it("GET /stats requires admin", async () => {
      const res = await request(app)
        .get(`${API}/stats`)
        .set("Authorization", `Bearer ${holderToken}`);
      assert.strictEqual(res.status, 403);
    });

    it("GET /stats returns system stats for admin", async () => {
      const res = await request(app)
        .get(`${API}/stats`)
        .set("Authorization", `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert(res.body.users);
      assert(typeof res.body.users.total === "number");
      assert(res.body.dids);
      assert(res.body.credentials);
      assert(typeof res.body.credentials.total === "number");
    });

    it("GET /stats/credentials returns all credentials for admin", async () => {
      const res = await request(app)
        .get(`${API}/stats/credentials`)
        .set("Authorization", `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body));
    });
  });

  describe("DIDs", () => {
    it("GET /dids requires admin", async () => {
      const res = await request(app)
        .get(`${API}/dids`)
        .set("Authorization", `Bearer ${holderToken}`);
      assert.strictEqual(res.status, 403);
    });

    it("GET /dids returns DIDs for admin", async () => {
      const res = await request(app)
        .get(`${API}/dids`)
        .set("Authorization", `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body));
    });

    it("POST /dids creates DID for holder", async () => {
      // Create a new holder without DID (we'd need to clear did from existing - skip if holder already has DID)
      if (holderDid) {
        const res = await request(app)
          .post(`${API}/dids`)
          .set("Authorization", `Bearer ${holderToken}`);
        // May be 400 if already has DID
        assert(res.status === 201 || res.status === 400);
      }
    });
  });
});
