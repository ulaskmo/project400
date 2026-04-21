import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

const supabase =
  env.supabaseUrl && env.supabaseServiceRoleKey
    ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Social features require Supabase. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return supabase;
}

// ---------- Types ----------

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  credential_ref: string | null;
  read_at: string | null;
  created_at: string;
}

export interface FriendSummary {
  friendshipId: string;
  userId: string;
  email: string;
  organizationName?: string;
  role: string;
  did?: string;
  since: string;
}

export interface PendingRequest {
  friendshipId: string;
  direction: "incoming" | "outgoing";
  otherUserId: string;
  otherEmail: string;
  otherRole: string;
  otherDid?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  credentialRef: string | null;
  readAt: string | null;
  createdAt: string;
}

// ---------- Friendships ----------

export async function sendFriendRequest(
  requesterId: string,
  targetEmail: string
): Promise<{ friendshipId: string; status: string }> {
  const db = requireSupabase();

  const { data: target, error: findErr } = await db
    .from("users")
    .select("id, email")
    .eq("email", targetEmail.trim().toLowerCase())
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (!target) throw new Error("No user found with that email");
  if (target.id === requesterId) {
    throw new Error("You can't send a friend request to yourself");
  }

  // Check for any existing record in either direction
  const { data: existing } = await db
    .from("friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${requesterId},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${requesterId})`
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      throw new Error("You're already friends with this user");
    }
    if (existing.status === "pending") {
      if (existing.requester_id === requesterId) {
        throw new Error("You've already sent a request to this user");
      }
      // Auto-accept their pending request to us
      const { error: updErr } = await db
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      return { friendshipId: existing.id, status: "accepted" };
    }
    if (existing.status === "declined") {
      // Re-open: flip direction, mark pending again
      const { error: updErr } = await db
        .from("friendships")
        .update({
          requester_id: requesterId,
          addressee_id: target.id,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      return { friendshipId: existing.id, status: "pending" };
    }
    throw new Error("Cannot send request (user is blocked)");
  }

  const { data, error } = await db
    .from("friendships")
    .insert({
      requester_id: requesterId,
      addressee_id: target.id,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { friendshipId: data.id, status: "pending" };
}

export async function respondToFriendRequest(
  userId: string,
  friendshipId: string,
  action: "accept" | "decline"
): Promise<void> {
  const db = requireSupabase();

  const { data: friendship, error: findErr } = await db
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (!friendship) throw new Error("Friend request not found");
  if (friendship.addressee_id !== userId) {
    throw new Error("You can only respond to requests addressed to you");
  }
  if (friendship.status !== "pending") {
    throw new Error("This request is no longer pending");
  }

  const newStatus = action === "accept" ? "accepted" : "declined";
  const { error: updErr } = await db
    .from("friendships")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", friendshipId);

  if (updErr) throw new Error(updErr.message);
}

export async function removeFriend(
  userId: string,
  friendshipId: string
): Promise<void> {
  const db = requireSupabase();

  const { data: friendship, error: findErr } = await db
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (!friendship) throw new Error("Friendship not found");
  if (
    friendship.requester_id !== userId &&
    friendship.addressee_id !== userId
  ) {
    throw new Error("You are not part of this friendship");
  }

  const { error: delErr } = await db
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (delErr) throw new Error(delErr.message);
}

export async function listFriends(userId: string): Promise<FriendSummary[]> {
  const db = requireSupabase();

  const { data: friendships, error } = await db
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) throw new Error(error.message);
  if (!friendships || friendships.length === 0) return [];

  const otherIds = friendships.map((f: FriendshipRow) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );

  const { data: users, error: usersErr } = await db
    .from("users")
    .select("id, email, role, organization_name, did")
    .in("id", otherIds);

  if (usersErr) throw new Error(usersErr.message);

  const userMap = new Map((users || []).map((u) => [u.id, u]));

  return friendships
    .map((f: FriendshipRow) => {
      const otherId =
        f.requester_id === userId ? f.addressee_id : f.requester_id;
      const u = userMap.get(otherId);
      if (!u) return null;
      return {
        friendshipId: f.id,
        userId: u.id,
        email: u.email,
        organizationName: u.organization_name ?? undefined,
        role: u.role,
        did: u.did ?? undefined,
        since: f.updated_at,
      } as FriendSummary;
    })
    .filter((x): x is FriendSummary => x !== null)
    .sort((a, b) => (a.email < b.email ? -1 : 1));
}

export async function listPendingRequests(
  userId: string
): Promise<PendingRequest[]> {
  const db = requireSupabase();

  const { data: friendships, error } = await db
    .from("friendships")
    .select("*")
    .eq("status", "pending")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!friendships || friendships.length === 0) return [];

  const otherIds = friendships.map((f: FriendshipRow) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );

  const { data: users, error: usersErr } = await db
    .from("users")
    .select("id, email, role, did")
    .in("id", otherIds);

  if (usersErr) throw new Error(usersErr.message);

  const userMap = new Map((users || []).map((u) => [u.id, u]));

  return friendships
    .map((f: FriendshipRow) => {
      const isOutgoing = f.requester_id === userId;
      const otherId = isOutgoing ? f.addressee_id : f.requester_id;
      const u = userMap.get(otherId);
      if (!u) return null;
      return {
        friendshipId: f.id,
        direction: isOutgoing ? "outgoing" : "incoming",
        otherUserId: u.id,
        otherEmail: u.email,
        otherRole: u.role,
        otherDid: u.did ?? undefined,
        createdAt: f.created_at,
      } as PendingRequest;
    })
    .filter((x): x is PendingRequest => x !== null);
}

// ---------- Messages ----------

function rowToMessage(r: MessageRow): Message {
  return {
    id: r.id,
    senderId: r.sender_id,
    recipientId: r.recipient_id,
    content: r.content,
    credentialRef: r.credential_ref,
    readAt: r.read_at,
    createdAt: r.created_at,
  };
}

/** Confirm that userA and userB are actually friends (status=accepted). */
async function assertFriends(userA: string, userB: string): Promise<void> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${userA},addressee_id.eq.${userB}),and(requester_id.eq.${userB},addressee_id.eq.${userA})`
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("You can only message accepted friends");
}

export async function sendMessage(
  senderId: string,
  recipientId: string,
  content: string,
  credentialRef?: string
): Promise<Message> {
  const db = requireSupabase();
  if (senderId === recipientId) throw new Error("Cannot message yourself");
  if (!content || !content.trim()) throw new Error("Message cannot be empty");
  if (content.length > 4000) throw new Error("Message too long (max 4000 chars)");

  await assertFriends(senderId, recipientId);

  const { data, error } = await db
    .from("messages")
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      content: content.trim(),
      credential_ref: credentialRef?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToMessage(data as MessageRow);
}

export async function getConversation(
  userId: string,
  otherUserId: string,
  limit = 100
): Promise<Message[]> {
  const db = requireSupabase();
  await assertFriends(userId, otherUserId);

  const { data, error } = await db
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
    )
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as MessageRow[]).map(rowToMessage);
}

export async function markConversationRead(
  userId: string,
  otherUserId: string
): Promise<void> {
  const db = requireSupabase();
  const { error } = await db
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .eq("sender_id", otherUserId)
    .is("read_at", null);

  if (error) throw new Error(error.message);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = requireSupabase();
  const { count, error } = await db
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
