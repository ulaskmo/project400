import { useState } from "react";
import { WalletPanel } from "./WalletPanel";
import { FriendsPanel } from "./FriendsPanel";

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

type SubTab = "wallet" | "friends";

export function UserPanel() {
  const [subTab, setSubTab] = useState<SubTab>("wallet");

  const titles: Record<SubTab, { title: string; description: string }> = {
    wallet: {
      title: "My Digital Identity",
      description: "Your decentralized identity and credential wallet.",
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
        <button style={tabStyle(subTab === "friends")}
          onClick={() => setSubTab("friends")}>
          <span style={{ width: 16, height: 16 }}><UsersIcon /></span>
          Friends
        </button>
      </div>

      {subTab === "wallet" && <WalletPanel />}
      {subTab === "friends" && <FriendsPanel />}
    </div>
  );
}
