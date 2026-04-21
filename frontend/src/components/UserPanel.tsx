import { useEffect, useRef, useState } from "react";
import { WalletPanel } from "./WalletPanel";
import { FriendsPanel } from "./FriendsPanel";
import { HolderPresentationInbox } from "./HolderPresentationInbox";
import { FlowPanel } from "./FlowPanel";
import { apiGet } from "../api/client";

const FingerprintIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2"/>
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
    <path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M2 16h.01"/>
    <path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2"/>
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const InboxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
);

const FlowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);

type SubTab = "wallet" | "flow" | "inbox" | "friends";

interface UserPanelProps {
  // When present, auto-switch to the inbox and open this specific request.
  // Populated by the /#/present/:id deep link from VerifierRequestsPanel.
  presentRequestId?: string;
}

export function UserPanel({ presentRequestId }: UserPanelProps = {}) {
  const [subTab, setSubTab] = useState<SubTab>(
    presentRequestId ? "inbox" : "wallet"
  );

  useEffect(() => {
    if (presentRequestId) setSubTab("inbox");
  }, [presentRequestId]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const prevUnreadRef = useRef(0);

  useEffect(() => {
    let stopped = false;

    const fetchUnread = async () => {
      try {
        const data = await apiGet<{ count: number }>(
          "/social/messages/unread-count"
        );
        if (stopped) return;

        const newCount = data.count ?? 0;
        const prev = prevUnreadRef.current;

        // If the Friends tab is open, new messages are being read immediately,
        // so don't spam toasts. Only surface a toast when count goes up AND
        // we're on another tab.
        if (newCount > prev && subTab !== "friends") {
          const delta = newCount - prev;
          setToast(
            `${delta} new message${delta === 1 ? "" : "s"} waiting in Friends`
          );
          setTimeout(() => setToast(null), 4000);
        }

        prevUnreadRef.current = newCount;
        setUnreadCount(newCount);
      } catch {
        // silently ignore – user may not have Supabase social configured.
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 8000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [subTab]);

  // Clear the badge the moment the user navigates into Friends; the
  // ConversationView will mark messages as read on the backend too.
  useEffect(() => {
    if (subTab === "friends") {
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    }
  }, [subTab]);

  const titles: Record<SubTab, { title: string; description: string }> = {
    wallet: {
      title: "My Digital Identity",
      description: "Your decentralized identity and credential wallet.",
    },
    flow: {
      title: "Community Flow",
      description: "Discover verifier broadcasts and opt in to ones that interest you.",
    },
    inbox: {
      title: "Presentation Inbox",
      description: "Respond to verifier requests with selective disclosure.",
    },
    friends: {
      title: "Friends",
      description: "Connect with other users, chat, and share credentials.",
    },
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "10px 16px",
    background: "transparent",
    border: "none",
    borderBottom: active ? "2px solid var(--brand-600)" : "2px solid transparent",
    color: active ? "var(--brand-700)" : "var(--gray-500)",
    fontWeight: 600,
    fontSize: "0.875rem",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 150ms ease",
    marginBottom: -1,
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon"><FingerprintIcon /></div>
        <h2 className="panel-title">{titles[subTab].title}</h2>
        <p className="panel-description">{titles[subTab].description}</p>
      </div>

      {/* Sub-tab navigation */}
      <div style={{
        display: "flex",
        gap: "var(--space-1)",
        borderBottom: "1px solid var(--surface-border)",
        marginBottom: "var(--space-5)",
      }}>
        <button style={tabStyle(subTab === "wallet")}
          onClick={() => setSubTab("wallet")}>
          <span style={{ width: 16, height: 16 }}><WalletIcon /></span>
          Wallet
        </button>
        <button style={tabStyle(subTab === "flow")}
          onClick={() => setSubTab("flow")}>
          <span style={{ width: 16, height: 16 }}><FlowIcon /></span>
          Flow
        </button>
        <button style={tabStyle(subTab === "inbox")}
          onClick={() => setSubTab("inbox")}>
          <span style={{ width: 16, height: 16 }}><InboxIcon /></span>
          Inbox
        </button>
        <button style={tabStyle(subTab === "friends")}
          onClick={() => setSubTab("friends")}>
          <span style={{ width: 16, height: 16 }}><UsersIcon /></span>
          Friends
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 4,
                minWidth: 18,
                height: 18,
                padding: "0 6px",
                borderRadius: 999,
                background: "var(--danger-500, #ef4444)",
                color: "white",
                fontSize: "0.7rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 2px var(--surface-card, #fff)",
                animation: "chainshield-pulse 1.8s ease-in-out infinite",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {subTab === "wallet" && <WalletPanel />}
      {subTab === "flow" && <FlowPanel />}
      {subTab === "inbox" && (
        <HolderPresentationInbox autoOpenRequestId={presentRequestId} />
      )}
      {subTab === "friends" && <FriendsPanel />}

      {toast && (
        <div
          onClick={() => setSubTab("friends")}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 10000,
            padding: "12px 16px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(99, 102, 241, 0.35)",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "chainshield-slide-in 220ms ease-out",
          }}
          role="status"
        >
          <span style={{ fontSize: "1.1rem" }}>💬</span>
          <div>
            <div>{toast}</div>
            <div style={{ fontSize: "0.7rem", opacity: 0.85, marginTop: 2 }}>
              Click to open
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chainshield-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 2px var(--surface-card, #fff), 0 0 0 0 rgba(239,68,68,0.6); }
          50% { transform: scale(1.06); box-shadow: 0 0 0 2px var(--surface-card, #fff), 0 0 0 6px rgba(239,68,68,0.0); }
        }
        @keyframes chainshield-slide-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
