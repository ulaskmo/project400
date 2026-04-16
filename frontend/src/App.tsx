import { useState, useEffect } from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { PublicVerifyPage } from "./components/PublicVerifyPage";
import { UserPanel } from "./components/UserPanel";
import { IssuerPanel } from "./components/IssuerPanel";
import { VerifierPanel } from "./components/VerifierPanel";
import { AdminPanel } from "./components/AdminPanel";

type Tab = "user" | "issuer" | "verifier" | "admin";

// SVG Icons
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
    <path d="M12 10h.01"/><path d="M12 14h.01"/>
    <path d="M16 10h.01"/><path d="M16 14h.01"/>
    <path d="M8 10h.01"/><path d="M8 14h.01"/>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);

const BlockchainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="6" height="6" rx="1"/>
    <rect x="16" y="7" width="6" height="6" rx="1"/>
    <rect x="9" y="2" width="6" height="6" rx="1"/>
    <rect x="9" y="16" width="6" height="6" rx="1"/>
    <path d="M8 10h2"/><path d="M14 10h2"/><path d="M12 8v2"/><path d="M12 16v-2"/>
  </svg>
);

// Check URL for public verification route
function getPublicVerifyId(): string | null {
  // Check hash: #/verify/cred-123
  const hash = window.location.hash;
  if (hash.startsWith("#/verify/")) {
    return decodeURIComponent(hash.replace("#/verify/", ""));
  }
  // Check query: ?verify=cred-123
  const params = new URLSearchParams(window.location.search);
  const verifyId = params.get("verify");
  if (verifyId) {
    return verifyId;
  }
  return null;
}

function MainApp() {
  const { user, logout, hasRole, isLoading } = useAuth();
  const [publicVerifyId, setPublicVerifyId] = useState<string | null>(getPublicVerifyId());
  
  // Listen for URL changes
  useEffect(() => {
    const handleHashChange = () => {
      setPublicVerifyId(getPublicVerifyId());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Determine default tab based on role
  const getDefaultTab = (): Tab => {
    if (!user) return "user";
    switch (user.role) {
      case "admin": return "admin";
      case "issuer": return "issuer";
      case "verifier": return "verifier";
      default: return "user";
    }
  };

  const [activeTab, setActiveTab] = useState<Tab>(getDefaultTab());

  // Show public verification page if URL contains verify parameter
  if (publicVerifyId) {
    return <PublicVerifyPage credentialId={publicVerifyId} />;
  }

  // Also show public verification page at #/verify (without ID)
  if (window.location.hash === "#/verify") {
    return <PublicVerifyPage />;
  }

  if (isLoading) {
    return (
      <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="loading">
          <span className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Get available tabs based on role
  const getTabs = () => {
    const tabs: { id: Tab; label: string; icon: React.FC; roles: string[] }[] = [
      { id: "user", label: "Identity Holder", icon: UserIcon, roles: ["holder", "admin"] },
      { id: "issuer", label: "Credential Issuer", icon: BuildingIcon, roles: ["issuer", "admin"] },
      { id: "verifier", label: "Verifier", icon: SearchIcon, roles: ["verifier", "admin"] },
      { id: "admin", label: "Admin Panel", icon: SettingsIcon, roles: ["admin"] },
    ];
    return tabs.filter(tab => tab.roles.includes(user.role));
  };

  const availableTabs = getTabs();

  // Role badge color
  const getRoleBadgeColor = () => {
    switch (user.role) {
      case "admin": return "var(--danger-400)";
      case "issuer": return "var(--success-400)";
      case "verifier": return "var(--brand-300)";
      default: return "var(--brand-400)";
    }
  };

  return (
    <div className="app-container">
      <div className="bg-animation" />

      {/* Header */}
      <header className="header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <div className="logo-container" style={{ marginBottom: 0 }}>
            <div className="logo-icon">
              <img src="/chainshield.png" alt="ChainShield" />
            </div>
            <h1>ChainShield</h1>
          </div>

          {/* User info & logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.875rem", color: "var(--gray-300)" }}>{user.email}</div>
              <div style={{ 
                fontSize: "0.75rem", 
                color: getRoleBadgeColor(),
                fontWeight: 600,
                textTransform: "uppercase"
              }}>
                {user.role}
              </div>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary"
              style={{ padding: "var(--space-2) var(--space-3)" }}
            >
              <LogoutIcon />
            </button>
          </div>
        </div>

        {user.role !== "admin" && (
          <p className="header-subtitle" style={{ marginTop: "var(--space-4)" }}>
            {user.role === "holder" && "Manage your decentralized identity and credentials"}
            {user.role === "issuer" && `Issuing credentials as ${user.organizationName || "Organization"}`}
            {user.role === "verifier" && `Verifying credentials as ${user.organizationName || "Organization"}`}
          </p>
        )}

        {user.role === "admin" && (
          <div className="header-badge" style={{ marginTop: "var(--space-4)" }}>
            <span className="dot" style={{ background: "var(--danger-400)" }} />
            Admin Mode - Full Access
          </div>
        )}
      </header>

      {/* Navigation - only show if multiple tabs available */}
      {availableTabs.length > 1 && (
        <nav className="nav-tabs">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon"><tab.icon /></span>
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {/* Main Content */}
      <main className="main-content">
        {activeTab === "user" && hasRole("holder", "admin") && <UserPanel />}
        {activeTab === "issuer" && hasRole("issuer", "admin") && <IssuerPanel />}
        {activeTab === "verifier" && hasRole("verifier", "admin") && <VerifierPanel />}
        {activeTab === "admin" && hasRole("admin") && <AdminPanel />}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          ChainShield SSI Platform • Built with React & Solidity • 
          <span className="blockchain-badge" style={{ marginLeft: '8px' }}>
            <BlockchainIcon />
            Blockchain Secured
          </span>
        </p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
