/**
 * W3C Verifiable Credential / Verifiable Presentation service with
 * Ed25519 signatures and SD-JWT-style selective disclosure.
 *
 * Design:
 *  - The VC's signature is computed over a canonicalised payload that
 *    binds issuer, issuance date, holder, credentialSubjectCommitments
 *    (map of field -> salted digest) and credentialSchema. It DOES NOT
 *    include the plaintext subject values, so holders can hide or
 *    reveal individual fields while keeping the signature intact.
 *  - The full credentialSubject plaintext and per-field salts are
 *    delivered to the holder alongside the signed VC so they can
 *    disclose selectively.
 *  - Verifiers re-derive the signed payload from the VC they receive
 *    and, for each disclosed field, recompute sha256(salt || field ||
 *    canonical(value)) and check it exists inside
 *    credentialSubjectCommitments.
 */
import { randomBytes } from "crypto";
import { sha256 } from "@noble/hashes/sha256";
import {
  canonicalize,
  getOrCreateKeypair,
  getPublicKey,
  sign as edSign,
  verify as edVerify,
} from "./keyService";
import { getUserByDid } from "./authService";

const VC_CONTEXT = [
  "https://www.w3.org/2018/credentials/v1",
  "https://chainshield.io/credentials/v1",
];

export interface CredentialSubject {
  id?: string;
  [k: string]: unknown;
}

export interface Proof {
  type: "Ed25519Signature2020";
  created: string;
  verificationMethod: string;
  proofPurpose: "assertionMethod" | "authentication";
  jws: string; // hex-encoded signature for our simple scheme
}

export interface VerifiableCredential {
  "@context": string[];
  type: string[];
  id: string;
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject;
  credentialSubjectCommitments: Record<string, string>;
  // Holder-only (not in signed payload): used to disclose selectively
  credentialSubjectSalts?: Record<string, string>;
  proof: Proof;
}

export interface VerifiablePresentation {
  "@context": string[];
  type: string[];
  id: string;
  holder: string;
  verifiableCredential: VerifiableCredential[];
  challenge?: string;
  domain?: string;
  proof: Proof;
}

function randomHex(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}

function hashHex(input: string): string {
  const bytes = sha256(new TextEncoder().encode(input));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function computeFieldDigest(salt: string, field: string, value: unknown): string {
  return hashHex(`${salt}|${field}|${canonicalize(value)}`);
}

/**
 * Build the canonical payload that the issuer signs.  The subject
 * values are NOT part of this payload - only the commitments are,
 * which lets us redact values without invalidating the signature.
 */
function buildVcSignPayload(vc: VerifiableCredential): Uint8Array {
  const holderId = vc.credentialSubject.id ?? "";
  const signable = {
    "@context": vc["@context"],
    type: vc.type,
    id: vc.id,
    issuer: vc.issuer,
    issuanceDate: vc.issuanceDate,
    expirationDate: vc.expirationDate,
    credentialSubject: { id: holderId },
    credentialSubjectCommitments: vc.credentialSubjectCommitments,
  };
  return new TextEncoder().encode(canonicalize(signable));
}

function buildVpSignPayload(vp: VerifiablePresentation): Uint8Array {
  const signable = {
    "@context": vp["@context"],
    type: vp.type,
    id: vp.id,
    holder: vp.holder,
    challenge: vp.challenge,
    domain: vp.domain,
    verifiableCredential: vp.verifiableCredential.map((c) => ({
      id: c.id,
      issuer: c.issuer,
      "@context": c["@context"],
      type: c.type,
      issuanceDate: c.issuanceDate,
      credentialSubject: c.credentialSubject,
      credentialSubjectCommitments: c.credentialSubjectCommitments,
      credentialSubjectSalts: c.credentialSubjectSalts,
      proof: c.proof,
    })),
  };
  return new TextEncoder().encode(canonicalize(signable));
}

export async function issueVerifiableCredential(params: {
  issuerUserId: string;
  issuerDid: string;
  holderDid: string;
  credentialId: string;
  types: string[];
  credentialSubject: Record<string, unknown>;
  expirationDate?: string;
}): Promise<VerifiableCredential> {
  const {
    issuerUserId,
    issuerDid,
    holderDid,
    credentialId,
    types,
    credentialSubject,
    expirationDate,
  } = params;

  const keypair = await getOrCreateKeypair(issuerUserId);

  // Build per-field salts + digests (skip the "id" field)
  const salts: Record<string, string> = {};
  const commitments: Record<string, string> = {};
  for (const [k, v] of Object.entries(credentialSubject)) {
    if (k === "id") continue;
    const salt = randomHex(12);
    salts[k] = salt;
    commitments[k] = computeFieldDigest(salt, k, v);
  }

  const vc: VerifiableCredential = {
    "@context": VC_CONTEXT,
    type: ["VerifiableCredential", ...types.filter((t) => t !== "VerifiableCredential")],
    id: credentialId,
    issuer: issuerDid,
    issuanceDate: new Date().toISOString(),
    expirationDate,
    credentialSubject: { id: holderDid, ...credentialSubject },
    credentialSubjectCommitments: commitments,
    credentialSubjectSalts: salts,
    proof: {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `${issuerDid}#key-1`,
      proofPurpose: "assertionMethod",
      jws: "",
    },
  };

  const payload = buildVcSignPayload(vc);
  vc.proof.jws = edSign(keypair.privateKeyHex, payload);

  return vc;
}

export interface VcVerificationResult {
  signatureValid: boolean;
  issuerKnown: boolean;
  disclosureChecks: Record<string, boolean>;
  allDisclosuresValid: boolean;
  reason?: string;
}

export async function verifyVerifiableCredential(
  vc: VerifiableCredential
): Promise<VcVerificationResult> {
  const issuer = await getUserByDid(vc.issuer);
  const pubHex = issuer ? await getPublicKey(issuer.id) : null;
  const result: VcVerificationResult = {
    signatureValid: false,
    issuerKnown: !!issuer,
    disclosureChecks: {},
    allDisclosuresValid: false,
  };

  if (!pubHex) {
    result.reason = "Issuer public key not found";
    return result;
  }

  const payload = buildVcSignPayload(vc);
  result.signatureValid = edVerify(pubHex, payload, vc.proof.jws);
  if (!result.signatureValid) {
    result.reason = "Ed25519 signature does not verify";
  }

  // Check each disclosed subject field (excluding id) against the commitments
  const salts = vc.credentialSubjectSalts ?? {};
  let allOk = true;
  for (const [field, value] of Object.entries(vc.credentialSubject)) {
    if (field === "id") continue;
    const commitment = vc.credentialSubjectCommitments[field];
    if (!commitment) {
      result.disclosureChecks[field] = false;
      allOk = false;
      continue;
    }
    const salt = salts[field];
    if (!salt) {
      result.disclosureChecks[field] = false;
      allOk = false;
      continue;
    }
    const digest = computeFieldDigest(salt, field, value);
    const ok = digest === commitment;
    result.disclosureChecks[field] = ok;
    if (!ok) allOk = false;
  }
  result.allDisclosuresValid = allOk;
  return result;
}

/**
 * Build a redacted copy of a VC that only discloses the listed fields.
 * All commitments are kept so the signature still verifies; only the
 * plaintext values + salts are pruned.
 */
export function redactCredential(
  vc: VerifiableCredential,
  discloseFields: string[]
): VerifiableCredential {
  const discloseSet = new Set(discloseFields);
  const subject: CredentialSubject = { id: vc.credentialSubject.id };
  const salts: Record<string, string> = {};
  for (const f of discloseFields) {
    if (f in vc.credentialSubject) {
      subject[f] = vc.credentialSubject[f];
    }
    if (vc.credentialSubjectSalts && f in vc.credentialSubjectSalts) {
      salts[f] = vc.credentialSubjectSalts[f];
    }
  }
  return {
    ...vc,
    credentialSubject: subject,
    credentialSubjectSalts: salts,
    credentialSubjectCommitments: { ...vc.credentialSubjectCommitments },
    _disclosedFields: Array.from(discloseSet),
  } as VerifiableCredential & { _disclosedFields: string[] };
}

export async function issueVerifiablePresentation(params: {
  holderUserId: string;
  holderDid: string;
  verifiableCredentials: VerifiableCredential[];
  challenge?: string;
  domain?: string;
}): Promise<VerifiablePresentation> {
  const keypair = await getOrCreateKeypair(params.holderUserId);

  const vp: VerifiablePresentation = {
    "@context": VC_CONTEXT,
    type: ["VerifiablePresentation", "ChainShieldPresentation"],
    id: `urn:vp:${randomHex(8)}`,
    holder: params.holderDid,
    verifiableCredential: params.verifiableCredentials,
    challenge: params.challenge,
    domain: params.domain,
    proof: {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: `${params.holderDid}#key-1`,
      proofPurpose: "authentication",
      jws: "",
    },
  };

  const payload = buildVpSignPayload(vp);
  vp.proof.jws = edSign(keypair.privateKeyHex, payload);
  return vp;
}

export interface VpVerificationResult {
  signatureValid: boolean;
  holderKnown: boolean;
  credentialResults: Array<{
    credentialId: string;
    issuer: string;
    disclosedFields: string[];
    vcVerification: VcVerificationResult;
  }>;
  allCredentialsValid: boolean;
}

export async function verifyVerifiablePresentation(
  vp: VerifiablePresentation
): Promise<VpVerificationResult> {
  const holder = await getUserByDid(vp.holder);
  const pubHex = holder ? await getPublicKey(holder.id) : null;

  const payload = buildVpSignPayload(vp);
  const signatureValid = pubHex ? edVerify(pubHex, payload, vp.proof.jws) : false;

  const credentialResults: VpVerificationResult["credentialResults"] = [];
  let allOk = true;
  for (const vc of vp.verifiableCredential) {
    const res = await verifyVerifiableCredential(vc);
    const disclosed = Object.keys(vc.credentialSubject).filter((k) => k !== "id");
    credentialResults.push({
      credentialId: vc.id,
      issuer: vc.issuer,
      disclosedFields: disclosed,
      vcVerification: res,
    });
    if (!res.signatureValid || !res.allDisclosuresValid) allOk = false;
  }

  return {
    signatureValid,
    holderKnown: !!holder,
    credentialResults,
    allCredentialsValid: allOk,
  };
}
