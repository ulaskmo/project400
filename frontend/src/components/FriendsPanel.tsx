import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost } from "../api/client";
import { getVerificationUrl } from "../utils/url";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// ---------- Types ----------

interface Friend {
  friendshipId: string;
  userId: string;
  email: string;
  organizationName?: string;
  role: string;
  did?: string;
  since: string;
}

interface PendingRequest {
  friendshipId: string;
  direction: "incoming" | "outgoing";
  otherUserId: string;
  otherEmail: string;
  otherRole: string;
  otherDid?: string;
  createdAt: string;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  credentialRef: string | null;
  readAt: string | null;
  createdAt: string;
}

interface Credential {
  credentialId: string;
  metadata?: { subjectName?: string; type?: string; issuedBy?: string };
}

// ---------- Icons ----------

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const UserPlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const PaperclipIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

// ---------- Utils ----------

function initialsFromEmail(email: string): string {
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function roleColor(role: string): string {
  switch (role) {
    case "admin": return "var(--danger-600)";
    case "issuer": return "var(--success-600)";
    case "verifier": return "var(--brand-500)";
    default: return "var(--brand-600)";
  }
}

// ---------- Main panel ----------

export function FriendsPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add friend form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Conversation view
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, p] = await Promise.all([
        apiGet<Friend[]>("/social/friends"),
        apiGet<PendingRequest[]>("/social/friends/pending"),
      ]);
      setFriends(f);
      setPending(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingFriend(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const email = addEmail.trim().toLowerCase();
      if (email === user?.email) {
        throw new Error("You can't add yourself");
      }
      const result = await apiPost<{ status: string }>("/social/friends/request", { email });
      setAddSuccess(
        result.status === "accepted"
          ? "You're already friends now — they had sent you a request!"
          : "Friend request sent."
      );
      setAddEmail("");
      await loadAll();
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setAddingFriend(false);
    }
  };

  const respond = async (friendshipId: string, action: "accept" | "decline") => {
    setError(null);
    try {
      await apiPost(`/social/friends/${friendshipId}/respond`, { action });
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (friendshipId: string) => {
    if (!confirm("Remove this friend?")) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/social/friends/${friendshipId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not remove friend");
      }
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (activeFriend) {
    return (
      <ConversationView
        friend={activeFriend}
        onBack={() => {
          setActiveFriend(null);
          loadAll();
        }}
      />
    );
  }

  const incomingCount = pending.filter((p) => p.direction === "incoming").length;

  return (
    <div>
      {/* Top bar with segmented tabs and Add friend button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "var(--surface-inset)", borderRadius: "var(--radius-md)", padding: 3 }}>
          <button onClick={() => setTab("friends")}
            style={{
              padding: "8px 16px", border: "none", borderRadius: "var(--radius-sm)",
              background: tab === "friends" ? "var(--surface-card)" : "transparent",
              color: tab === "friends" ? "var(--gray-900)" : "var(--gray-500)",
              fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit",
              boxShadow: tab === "friends" ? "var(--shadow-sm)" : "none",
              transition: "all 150ms ease"
            }}>
            Friends ({friends.length})
          </button>
          <button onClick={() => setTab("requests")}
            style={{
              padding: "8px 16px", border: "none", borderRadius: "var(--radius-sm)",
              background: tab === "requests" ? "var(--surface-card)" : "transparent",
              color: tab === "requests" ? "var(--gray-900)" : "var(--gray-500)",
              fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit",
              boxShadow: tab === "requests" ? "var(--shadow-sm)" : "none",
              transition: "all 150ms ease",
              display: "flex", alignItems: "center", gap: 6
            }}>
            Requests
            {incomingCount > 0 && (
              <span style={{
                background: "var(--danger-500)", color: "#fff", fontSize: "0.625rem",
                padding: "0 6px", borderRadius: "999px", fontWeight: 700, minWidth: 18, textAlign: "center"
              }}>{incomingCount}</span>
            )}
          </button>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button className="btn btn-secondary" onClick={loadAll} disabled={loading}
            style={{ padding: "8px 10px" }}>
            <RefreshIcon />
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddForm((s) => !s)}>
            <UserPlusIcon /> Add Friend
          </button>
        </div>
      </div>

      {/* Add friend card */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: "var(--space-5)", background: "var(--brand-50)", borderColor: "var(--brand-200)" }}>
          <form onSubmit={handleAddFriend}>
            <div className="input-group" style={{ marginBottom: "var(--space-3)" }}>
              <label className="input-label">Friend's email address</label>
              <input type="email" className="input" value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="friend@example.com" required autoFocus />
            </div>
            {addError && (
              <div className="error-message" style={{ marginBottom: "var(--space-3)" }}>
                <AlertCircleIcon /><span>{addError}</span>
              </div>
            )}
            {addSuccess && (
              <div style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                padding: "var(--space-3) var(--space-4)",
                background: "var(--success-50)", border: "1px solid rgba(34, 197, 94, 0.2)",
                borderRadius: "var(--radius-lg)", color: "var(--success-700)",
                fontSize: "0.875rem", marginBottom: "var(--space-3)"
              }}>
                <CheckIcon /><span>{addSuccess}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button type="submit" className="btn btn-primary" disabled={addingFriend || !addEmail}>
                {addingFriend ? (
                  <span className="loading"><span className="spinner" /> Sending...</span>
                ) : (
                  <><SendIcon /> Send Request</>
                )}
              </button>
              <button type="button" className="btn btn-secondary"
                onClick={() => { setShowAddForm(false); setAddError(null); setAddSuccess(null); }}>
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="error-message" style={{ marginBottom: "var(--space-4)" }}>
          <AlertCircleIcon /><span>{error}</span>
        </div>
      )}

      {/* Friends tab */}
      {tab === "friends" && (
        <div className="card">
          {loading ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
              <span className="loading"><span className="spinner" /> Loading...</span>
            </div>
          ) : friends.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--gray-500)" }}>
              <div style={{
                width: 48, height: 48, margin: "0 auto var(--space-3)",
                background: "var(--surface-inset)", borderRadius: "var(--radius-md)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <UsersIcon />
              </div>
              <p style={{ fontSize: "0.875rem" }}>No friends yet</p>
              <p style={{ fontSize: "0.8125rem", marginTop: "var(--space-1)" }}>
                Add friends to share credentials and chat with them.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {friends.map((f, idx) => (
                <div key={f.friendshipId}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                    padding: "var(--space-3) 0",
                    borderTop: idx > 0 ? "1px solid var(--surface-border)" : undefined
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "var(--brand-100)", color: "var(--brand-700)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 600, fontSize: "0.8125rem", flexShrink: 0
                  }}>
                    {initialsFromEmail(f.email)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--gray-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.email}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                      <span style={{ color: roleColor(f.role), fontWeight: 600, textTransform: "capitalize" }}>
                        {f.role}
                      </span>
                      {f.organizationName && (
                        <>
                          <span style={{ color: "var(--gray-300)" }}>•</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.organizationName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-1)" }}>
                    <button className="btn btn-primary"
                      onClick={() => setActiveFriend(f)}
                      style={{ padding: "6px 10px", fontSize: "0.8125rem" }}>
                      <MessageIcon /> Message
                    </button>
                    <button className="btn btn-secondary"
                      onClick={() => remove(f.friendshipId)}
                      style={{ padding: "6px 8px", color: "var(--danger-600)" }}
                      title="Remove friend">
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requests tab */}
      {tab === "requests" && (
        <div className="card">
          {loading ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
              <span className="loading"><span className="spinner" /> Loading...</span>
            </div>
          ) : pending.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--gray-500)" }}>
              <p style={{ fontSize: "0.875rem" }}>No pending requests</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {pending.map((p, idx) => (
                <div key={p.friendshipId}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                    padding: "var(--space-3) 0",
                    borderTop: idx > 0 ? "1px solid var(--surface-border)" : undefined
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "var(--brand-100)", color: "var(--brand-700)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 600, fontSize: "0.8125rem", flexShrink: 0
                  }}>
                    {initialsFromEmail(p.otherEmail)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--gray-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.otherEmail}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 1 }}>
                      {p.direction === "incoming" ? "Sent you a request" : "Request sent — awaiting response"}
                    </div>
                  </div>
                  {p.direction === "incoming" ? (
                    <div style={{ display: "flex", gap: "var(--space-1)" }}>
                      <button className="btn btn-primary"
                        onClick={() => respond(p.friendshipId, "accept")}
                        style={{ padding: "6px 10px", fontSize: "0.8125rem" }}>
                        <CheckIcon /> Accept
                      </button>
                      <button className="btn btn-secondary"
                        onClick={() => respond(p.friendshipId, "decline")}
                        style={{ padding: "6px 10px", fontSize: "0.8125rem" }}>
                        <XIcon /> Decline
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--gray-500)", fontStyle: "italic" }}>
                      Pending
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Conversation View ----------

function ConversationView({ friend, onBack }: { friend: Friend; onBack: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myCredentials, setMyCredentials] = useState<Credential[]>([]);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [attachedCredId, setAttachedCredId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Message[]>(`/social/messages/${friend.userId}`);
      setMessages(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [friend.userId]);

  useEffect(() => {
    load();
    apiGet<Credential[]>("/credentials/my").then(setMyCredentials).catch(() => {});
    // Mark any unread messages from this friend as read as soon as the
    // conversation is opened. Errors are ignored (endpoint is idempotent).
    apiPost(`/social/messages/${friend.userId}/read`, {}).catch(() => {});
  }, [load, friend.userId]);

  useEffect(() => {
    // poll for new messages every 5s while the view is open, and keep
    // marking them read so the unread badge clears while chatting.
    const id = setInterval(() => {
      load();
      apiPost(`/social/messages/${friend.userId}/read`, {}).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [load, friend.userId]);

  useEffect(() => {
    // auto-scroll to bottom when messages change
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !attachedCredId) return;
    setSending(true);
    setError(null);
    try {
      const msgContent = content.trim() || (attachedCredId ? "Shared a credential" : "");
      const sent = await apiPost<Message>("/social/messages", {
        recipientId: friend.userId,
        content: msgContent,
        credentialRef: attachedCredId || undefined,
      });
      setMessages((prev) => [...prev, sent]);
      setContent("");
      setAttachedCredId(null);
      setShowShareMenu(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const attachedCred = attachedCredId
    ? myCredentials.find((c) => c.credentialId === attachedCredId)
    : null;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "calc(100vh - 280px)", minHeight: 420 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        padding: "var(--space-4)",
        borderBottom: "1px solid var(--surface-border)",
        background: "var(--surface-card)"
      }}>
        <button className="btn btn-secondary" onClick={onBack}
          style={{ padding: "6px 8px" }} aria-label="Back">
          <ArrowLeftIcon />
        </button>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "var(--brand-100)", color: "var(--brand-700)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 600, fontSize: "0.8125rem", flexShrink: 0
        }}>
          {initialsFromEmail(friend.email)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--gray-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {friend.email}
          </div>
          <div style={{ fontSize: "0.75rem", color: roleColor(friend.role), fontWeight: 600, textTransform: "capitalize" }}>
            {friend.role}{friend.organizationName ? ` • ${friend.organizationName}` : ""}
          </div>
        </div>
      </div>

      {/* Messages scroll area */}
      <div ref={scrollRef}
        style={{
          flex: 1, overflowY: "auto",
          padding: "var(--space-4)",
          background: "var(--surface-bg)",
          display: "flex", flexDirection: "column", gap: "var(--space-2)"
        }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--gray-500)" }}>
            <span className="loading"><span className="spinner" /> Loading...</span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--gray-500)", fontSize: "0.875rem" }}>
            No messages yet. Say hello.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div key={m.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start"
                }}>
                <div style={{
                  maxWidth: "75%",
                  background: mine ? "var(--brand-700)" : "var(--surface-card)",
                  color: mine ? "#fff" : "var(--gray-900)",
                  padding: "8px 12px",
                  borderRadius: 12,
                  borderTopRightRadius: mine ? 4 : 12,
                  borderTopLeftRadius: mine ? 12 : 4,
                  border: mine ? undefined : "1px solid var(--surface-border)",
                  fontSize: "0.875rem",
                  lineHeight: 1.45,
                  wordBreak: "break-word"
                }}>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  {m.credentialRef && (
                    <a href={getVerificationUrl(m.credentialRef)} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginTop: 6, padding: "6px 8px",
                        background: mine ? "rgba(255,255,255,0.15)" : "var(--brand-50)",
                        border: mine ? "1px solid rgba(255,255,255,0.2)" : "1px solid var(--brand-200)",
                        borderRadius: 6,
                        color: mine ? "#fff" : "var(--brand-700)",
                        fontSize: "0.75rem", textDecoration: "none", fontWeight: 500
                      }}>
                      <PaperclipIcon />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Credential — open to verify
                      </span>
                    </a>
                  )}
                  <div style={{
                    fontSize: "0.6875rem",
                    color: mine ? "rgba(255,255,255,0.7)" : "var(--gray-500)",
                    marginTop: 4, textAlign: "right"
                  }}>
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Attached credential preview */}
      {attachedCred && (
        <div style={{
          padding: "var(--space-2) var(--space-4)",
          background: "var(--brand-50)",
          borderTop: "1px solid var(--brand-200)",
          display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "0.8125rem"
        }}>
          <PaperclipIcon />
          <span style={{ flex: 1, color: "var(--gray-700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Attaching: {attachedCred.metadata?.subjectName || attachedCred.credentialId}
          </span>
          <button className="btn btn-secondary" onClick={() => setAttachedCredId(null)}
            style={{ padding: "2px 6px" }}><XIcon /></button>
        </div>
      )}

      {/* Share menu */}
      {showShareMenu && myCredentials.length > 0 && (
        <div style={{
          position: "relative", padding: "var(--space-3) var(--space-4)",
          background: "var(--surface-card)",
          borderTop: "1px solid var(--surface-border)",
          maxHeight: 200, overflowY: "auto"
        }}>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", fontWeight: 600, marginBottom: "var(--space-2)" }}>
            Pick a credential to share
          </div>
          {myCredentials.map((c) => (
            <button key={c.credentialId}
              onClick={() => { setAttachedCredId(c.credentialId); setShowShareMenu(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                width: "100%", padding: "8px 10px",
                background: "transparent", border: "1px solid var(--surface-border)",
                borderRadius: "var(--radius-md)", cursor: "pointer",
                fontFamily: "inherit", marginBottom: 4, textAlign: "left"
              }}>
              <PaperclipIcon />
              <span style={{ flex: 1, fontSize: "0.8125rem", color: "var(--gray-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.metadata?.subjectName || c.credentialId}
              </span>
              <span style={{ fontSize: "0.6875rem", color: "var(--gray-500)" }}>
                {c.metadata?.type || "credential"}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="error-message" style={{ margin: "var(--space-2) var(--space-4)" }}>
          <AlertCircleIcon /><span>{error}</span>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handleSend}
        style={{
          display: "flex", gap: "var(--space-2)",
          padding: "var(--space-3) var(--space-4)",
          borderTop: "1px solid var(--surface-border)",
          background: "var(--surface-card)"
        }}>
        <button type="button" className="btn btn-secondary"
          onClick={() => setShowShareMenu((s) => !s)}
          disabled={myCredentials.length === 0}
          title={myCredentials.length === 0 ? "No credentials to share" : "Attach a credential"}
          style={{ padding: "8px 10px" }}>
          <PaperclipIcon />
        </button>
        <input type="text" className="input"
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary"
          disabled={sending || (!content.trim() && !attachedCredId)}>
          {sending ? <span className="spinner" /> : <SendIcon />}
        </button>
      </form>
    </div>
  );
}
