/**
 * Presentation Exchange (DIF PEX-inspired, simplified).
 *
 * Verifiers create presentation requests describing the credential
 * types/fields they need. Holders fulfil them by submitting signed
 * Verifiable Presentations that include selectively-disclosed
 * Verifiable Credentials.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { env } from "../config/env";
import {
  VerifiableCredential,
  VerifiablePresentation,
  verifyVerifiablePresentation,
} from "./vcService";

const DATA_DIR = join(process.cwd(), "data");
const REQUESTS_FILE = join(DATA_DIR, "pex_requests.json");
const RESPONSES_FILE = join(DATA_DIR, "pex_responses.json");
const INTERESTS_FILE = join(DATA_DIR, "pex_interests.json");

const isSupabaseEnabled = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
let supabase: SupabaseClient | null = null;
let pexTablesAvailable = isSupabaseEnabled;
if (isSupabaseEnabled) {
  supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function disablePexSupabase(reason: string) {
  if (!pexTablesAvailable) return;
  pexTablesAvailable = false;
  console.warn(
    `[PresentationService] Falling back to local JSON (${reason}). Apply scripts/ssi-schema.sql to enable Supabase.`
  );
}

function supabaseTableMissing(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  // 42P01 = undefined_table, PGRST205 = schema cache (table not found)
  const msg = (err.message || "").toLowerCase();
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("not found in the schema cache")
  );
}

function pexSupabase(): SupabaseClient | null {
  return pexTablesAvailable ? supabase : null;
}

export type RequestAudience = "direct" | "broadcast";

export interface PresentationRequest {
  id: string;
  verifierUserId: string;
  verifierDid: string;
  verifierName?: string;
  verifierTrustLevel?: "unverified" | "verified" | "accredited";
  purpose: string;
  requiredTypes: string[];
  requiredFields?: Record<string, string[]>;
  targetHolderDid?: string;
  audience: RequestAudience;
  status: "pending" | "fulfilled" | "expired" | "cancelled";
  expiresAt?: string;
  createdAt: string;
}

export interface PresentationInterest {
  requestId: string;
  holderUserId: string;
  holderDid: string;
  createdAt: string;
}

export interface PresentationResponse {
  id: string;
  requestId: string;
  holderUserId: string;
  holderDid: string;
  vp: VerifiablePresentation;
  disclosedFields: Record<string, string[]>;
  vpSignatureValid: boolean;
  vcSignaturesValid: boolean;
  summary?: string;
  createdAt: string;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(path: string): T[] {
  try {
    ensureDir();
    if (!existsSync(path)) return [];
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return [];
  }
}

function writeJson<T>(path: string, data: T[]) {
  try {
    ensureDir();
    writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("[PresentationService] write failed:", e);
  }
}

interface RequestRow {
  id: string;
  verifier_user_id: string;
  verifier_did: string;
  verifier_name: string | null;
  purpose: string;
  required_types: string[];
  required_fields: Record<string, string[]> | null;
  target_holder_did: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
}

function rowToRequest(row: RequestRow): PresentationRequest {
  const targetHolderDid = row.target_holder_did ?? undefined;
  return {
    id: row.id,
    verifierUserId: row.verifier_user_id,
    verifierDid: row.verifier_did,
    verifierName: row.verifier_name ?? undefined,
    purpose: row.purpose,
    requiredTypes: row.required_types,
    requiredFields: row.required_fields ?? undefined,
    targetHolderDid,
    audience: targetHolderDid ? "direct" : "broadcast",
    status: row.status as PresentationRequest["status"],
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
  };
}

interface ResponseRow {
  id: string;
  request_id: string;
  holder_user_id: string;
  holder_did: string;
  vp_json: VerifiablePresentation;
  disclosed_fields: Record<string, string[]> | null;
  vp_signature_valid: boolean;
  vc_signatures_valid: boolean;
  summary: string | null;
  created_at: string;
}

function rowToResponse(row: ResponseRow): PresentationResponse {
  return {
    id: row.id,
    requestId: row.request_id,
    holderUserId: row.holder_user_id,
    holderDid: row.holder_did,
    vp: row.vp_json,
    disclosedFields: row.disclosed_fields ?? {},
    vpSignatureValid: row.vp_signature_valid,
    vcSignaturesValid: row.vc_signatures_valid,
    summary: row.summary ?? undefined,
    createdAt: row.created_at,
  };
}

export async function createRequest(params: {
  verifierUserId: string;
  verifierDid: string;
  verifierName?: string;
  purpose: string;
  requiredTypes: string[];
  requiredFields?: Record<string, string[]>;
  targetHolderDid?: string;
  audience?: RequestAudience;
  expiresAt?: string;
}): Promise<PresentationRequest> {
  const audience: RequestAudience =
    params.audience ?? (params.targetHolderDid ? "direct" : "broadcast");
  const row: PresentationRequest = {
    id: randomUUID(),
    verifierUserId: params.verifierUserId,
    verifierDid: params.verifierDid,
    verifierName: params.verifierName,
    purpose: params.purpose,
    requiredTypes: params.requiredTypes,
    requiredFields: params.requiredFields,
    targetHolderDid: audience === "broadcast" ? undefined : params.targetHolderDid,
    audience,
    status: "pending",
    expiresAt: params.expiresAt,
    createdAt: new Date().toISOString(),
  };

  const sb = pexSupabase();
  if (!sb) {
    const all = readJson<PresentationRequest>(REQUESTS_FILE);
    all.push(row);
    writeJson(REQUESTS_FILE, all);
    return row;
  }

  const { error } = await sb.from("presentation_requests").insert({
    id: row.id,
    verifier_user_id: row.verifierUserId,
    verifier_did: row.verifierDid,
    verifier_name: row.verifierName ?? null,
    purpose: row.purpose,
    required_types: row.requiredTypes,
    required_fields: row.requiredFields ?? null,
    target_holder_did: row.targetHolderDid ?? null,
    status: row.status,
    expires_at: row.expiresAt ?? null,
    created_at: row.createdAt,
  });
  if (error) {
    if (supabaseTableMissing(error)) {
      disablePexSupabase(error.message);
      const all = readJson<PresentationRequest>(REQUESTS_FILE);
      all.push(row);
      writeJson(REQUESTS_FILE, all);
      return row;
    }
    throw new Error(`Create request failed: ${error.message}`);
  }
  return row;
}

export async function getRequest(id: string): Promise<PresentationRequest | null> {
  const sb = pexSupabase();
  if (!sb) {
    return readJson<PresentationRequest>(REQUESTS_FILE).find((r) => r.id === id) ?? null;
  }
  const { data, error } = await sb
    .from("presentation_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (supabaseTableMissing(error)) {
      disablePexSupabase(error.message);
      return readJson<PresentationRequest>(REQUESTS_FILE).find((r) => r.id === id) ?? null;
    }
    return null;
  }
  return data ? rowToRequest(data as RequestRow) : null;
}

export async function listRequestsByVerifier(
  verifierUserId: string
): Promise<PresentationRequest[]> {
  const sb = pexSupabase();
  if (!sb) {
    return readJson<PresentationRequest>(REQUESTS_FILE)
      .filter((r) => r.verifierUserId === verifierUserId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data, error } = await sb
    .from("presentation_requests")
    .select("*")
    .eq("verifier_user_id", verifierUserId)
    .order("created_at", { ascending: false });
  if (error) {
    if (supabaseTableMissing(error)) {
      disablePexSupabase(error.message);
      return listRequestsByVerifier(verifierUserId);
    }
    return [];
  }
  return (data as RequestRow[]).map(rowToRequest);
}

/**
 * Silently trip "expired" status on any pending request whose expiresAt
 * has passed. Callers can then filter by status === "pending".
 */
async function reapExpired(requests: PresentationRequest[]): Promise<PresentationRequest[]> {
  const toExpire = requests.filter(
    (r) => r.status === "pending" && isExpired(r)
  );
  await Promise.all(
    toExpire.map((r) =>
      markRequestExpired(r.id).catch(() => {
        /* best effort */
      })
    )
  );
  if (toExpire.length === 0) return requests;
  const expiredIds = new Set(toExpire.map((r) => r.id));
  return requests.map((r) =>
    expiredIds.has(r.id) ? { ...r, status: "expired" } : r
  );
}

/**
 * Returns the set of requests that should appear in the holder's inbox:
 * (a) pending requests directly targeted at their DID, AND
 * (b) pending broadcast requests the holder explicitly expressed interest in.
 */
export async function listRequestsForHolder(
  holderUserId: string,
  holderDid: string
): Promise<PresentationRequest[]> {
  const interests = listInterestsForHolder(holderUserId);
  const interestedIds = new Set(interests.map((i) => i.requestId));

  const sb = pexSupabase();
  let all: PresentationRequest[];
  if (!sb) {
    all = loadRequests();
  } else {
    const { data, error } = await sb
      .from("presentation_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      if (supabaseTableMissing(error)) {
        disablePexSupabase(error.message);
        return listRequestsForHolder(holderUserId, holderDid);
      }
      return [];
    }
    all = (data as RequestRow[]).map(rowToRequest);
  }

  all = await reapExpired(all);
  return all
    .filter(
      (r) =>
        r.status === "pending" &&
        ((r.audience === "direct" && r.targetHolderDid === holderDid) ||
          (r.audience === "broadcast" && interestedIds.has(r.id)))
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Returns open broadcast requests for the public flow/feed.
 */
export async function listBroadcastRequests(): Promise<PresentationRequest[]> {
  const sb = pexSupabase();
  let all: PresentationRequest[];
  if (!sb) {
    all = loadRequests();
  } else {
    const { data, error } = await sb
      .from("presentation_requests")
      .select("*")
      .eq("status", "pending")
      .is("target_holder_did", null)
      .order("created_at", { ascending: false });
    if (error) {
      if (supabaseTableMissing(error)) {
        disablePexSupabase(error.message);
        return listBroadcastRequests();
      }
      return [];
    }
    all = (data as RequestRow[]).map(rowToRequest);
  }

  all = await reapExpired(all);
  return all
    .filter(
      (r) => r.status === "pending" && r.audience === "broadcast"
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Hydrates a list of requests with audience defaults for legacy rows
 * (rows created before the audience field existed).
 */
function loadRequests(): PresentationRequest[] {
  return readJson<PresentationRequest>(REQUESTS_FILE).map((r) => ({
    ...r,
    audience: r.audience ?? (r.targetHolderDid ? "direct" : "broadcast"),
  }));
}

export async function cancelRequest(
  requesterId: string,
  id: string
): Promise<boolean> {
  const req = await getRequest(id);
  if (!req || req.verifierUserId !== requesterId) return false;
  const sb = pexSupabase();
  if (!sb) {
    const all = readJson<PresentationRequest>(REQUESTS_FILE);
    const idx = all.findIndex((r) => r.id === id);
    if (idx >= 0) {
      all[idx].status = "cancelled";
      writeJson(REQUESTS_FILE, all);
      return true;
    }
    return false;
  }
  const { error } = await sb
    .from("presentation_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error && supabaseTableMissing(error)) {
    disablePexSupabase(error.message);
    return cancelRequest(requesterId, id);
  }
  return !error;
}

async function markRequestFulfilled(id: string): Promise<void> {
  const sb = pexSupabase();
  if (!sb) {
    const all = readJson<PresentationRequest>(REQUESTS_FILE);
    const idx = all.findIndex((r) => r.id === id);
    if (idx >= 0) {
      all[idx].status = "fulfilled";
      writeJson(REQUESTS_FILE, all);
    }
    return;
  }
  const { error } = await sb
    .from("presentation_requests")
    .update({ status: "fulfilled" })
    .eq("id", id);
  if (error && supabaseTableMissing(error)) {
    disablePexSupabase(error.message);
    await markRequestFulfilled(id);
  }
}

export async function markRequestExpired(id: string): Promise<void> {
  const sb = pexSupabase();
  if (!sb) {
    const all = readJson<PresentationRequest>(REQUESTS_FILE);
    const idx = all.findIndex((r) => r.id === id);
    if (idx >= 0 && all[idx].status === "pending") {
      all[idx].status = "expired";
      writeJson(REQUESTS_FILE, all);
    }
    return;
  }
  const { error } = await sb
    .from("presentation_requests")
    .update({ status: "expired" })
    .eq("id", id)
    .eq("status", "pending");
  if (error && supabaseTableMissing(error)) {
    disablePexSupabase(error.message);
    await markRequestExpired(id);
  }
}

export function isExpired(req: PresentationRequest): boolean {
  return (
    !!req.expiresAt && new Date(req.expiresAt).getTime() <= Date.now()
  );
}

export async function submitResponse(params: {
  requestId: string;
  holderUserId: string;
  holderDid: string;
  vp: VerifiablePresentation;
  disclosedFields: Record<string, string[]>;
  summary?: string;
}): Promise<PresentationResponse> {
  const req = await getRequest(params.requestId);
  if (!req) throw new Error("Presentation request not found");
  if (req.status !== "pending") throw new Error("Request is no longer pending");
  if (isExpired(req)) {
    // Lazy state transition: flip to "expired" so subsequent reads see it.
    await markRequestExpired(req.id).catch(() => {
      /* best-effort */
    });
    throw new Error(
      "This presentation request has expired and no longer accepts responses"
    );
  }

  const vpCheck = await verifyVerifiablePresentation(params.vp);

  const row: PresentationResponse = {
    id: randomUUID(),
    requestId: params.requestId,
    holderUserId: params.holderUserId,
    holderDid: params.holderDid,
    vp: params.vp,
    disclosedFields: params.disclosedFields,
    vpSignatureValid: vpCheck.signatureValid,
    vcSignaturesValid: vpCheck.allCredentialsValid,
    summary: params.summary,
    createdAt: new Date().toISOString(),
  };

  const sb = pexSupabase();
  if (!sb) {
    const all = readJson<PresentationResponse>(RESPONSES_FILE);
    all.push(row);
    writeJson(RESPONSES_FILE, all);
  } else {
    const { error } = await sb.from("presentation_responses").insert({
      id: row.id,
      request_id: row.requestId,
      holder_user_id: row.holderUserId,
      holder_did: row.holderDid,
      vp_json: row.vp as unknown as object,
      disclosed_fields: row.disclosedFields as unknown as object,
      vp_signature_valid: row.vpSignatureValid,
      vc_signatures_valid: row.vcSignaturesValid,
      summary: row.summary ?? null,
      created_at: row.createdAt,
    });
    if (error) {
      if (supabaseTableMissing(error)) {
        disablePexSupabase(error.message);
        const all = readJson<PresentationResponse>(RESPONSES_FILE);
        all.push(row);
        writeJson(RESPONSES_FILE, all);
      } else {
        throw new Error(`Submit response failed: ${error.message}`);
      }
    }
  }

  // Broadcast requests stay open so other interested holders can respond too.
  if (req.audience === "direct") {
    await markRequestFulfilled(params.requestId);
  }
  return row;
}

export async function listResponsesForRequest(
  requestId: string
): Promise<PresentationResponse[]> {
  const sb = pexSupabase();
  if (!sb) {
    return readJson<PresentationResponse>(RESPONSES_FILE)
      .filter((r) => r.requestId === requestId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data, error } = await sb
    .from("presentation_responses")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) {
    if (supabaseTableMissing(error)) {
      disablePexSupabase(error.message);
      return listResponsesForRequest(requestId);
    }
    return [];
  }
  return (data as ResponseRow[]).map(rowToResponse);
}

export async function listResponsesByHolder(
  holderUserId: string
): Promise<PresentationResponse[]> {
  const sb = pexSupabase();
  if (!sb) {
    return readJson<PresentationResponse>(RESPONSES_FILE)
      .filter((r) => r.holderUserId === holderUserId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data, error } = await sb
    .from("presentation_responses")
    .select("*")
    .eq("holder_user_id", holderUserId)
    .order("created_at", { ascending: false });
  if (error) {
    if (supabaseTableMissing(error)) {
      disablePexSupabase(error.message);
      return listResponsesByHolder(holderUserId);
    }
    return [];
  }
  return (data as ResponseRow[]).map(rowToResponse);
}

// ---------- Interest tracking (local JSON sidestore) ----------

function loadInterests(): PresentationInterest[] {
  return readJson<PresentationInterest>(INTERESTS_FILE);
}

function saveInterests(all: PresentationInterest[]): void {
  writeJson(INTERESTS_FILE, all);
}

export function listInterestsForHolder(
  holderUserId: string
): PresentationInterest[] {
  return loadInterests().filter((i) => i.holderUserId === holderUserId);
}

export function listInterestsForRequest(
  requestId: string
): PresentationInterest[] {
  return loadInterests().filter((i) => i.requestId === requestId);
}

export function hasExpressedInterest(
  holderUserId: string,
  requestId: string
): boolean {
  return loadInterests().some(
    (i) => i.holderUserId === holderUserId && i.requestId === requestId
  );
}

export function addInterest(params: {
  requestId: string;
  holderUserId: string;
  holderDid: string;
}): PresentationInterest {
  const all = loadInterests();
  const existing = all.find(
    (i) =>
      i.requestId === params.requestId && i.holderUserId === params.holderUserId
  );
  if (existing) return existing;
  const row: PresentationInterest = {
    requestId: params.requestId,
    holderUserId: params.holderUserId,
    holderDid: params.holderDid,
    createdAt: new Date().toISOString(),
  };
  all.push(row);
  saveInterests(all);
  return row;
}

export function removeInterest(
  holderUserId: string,
  requestId: string
): boolean {
  const all = loadInterests();
  const filtered = all.filter(
    (i) => !(i.holderUserId === holderUserId && i.requestId === requestId)
  );
  if (filtered.length === all.length) return false;
  saveInterests(filtered);
  return true;
}

/**
 * Evaluates whether a credential can satisfy a given request.
 * Matches if the credential's type includes one of the required types
 * AND (if specified) all required fields are present in the credential.
 */
export function credentialMatchesRequest(
  vc: VerifiableCredential,
  req: PresentationRequest
): { matches: boolean; matchedType?: string; missingFields: string[] } {
  const vcTypes = vc.type || [];
  const matchedType = req.requiredTypes.find((t) =>
    vcTypes.some((vt) => vt === t || vt.endsWith(`:${t}`))
  );
  if (!matchedType) {
    return { matches: false, missingFields: [] };
  }
  const fieldsNeeded = req.requiredFields?.[matchedType] ?? [];
  const available = Object.keys(vc.credentialSubject || {});
  const missing = fieldsNeeded.filter((f) => !available.includes(f));
  return {
    matches: missing.length === 0,
    matchedType,
    missingFields: missing,
  };
}
