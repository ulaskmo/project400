import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../api/client";
import { apiGet, apiPost } from "../api/client";

interface UserData {
  id: string;
  email: string;
  role: UserRole;
  did?: string;
  organizationName?: string;
  createdAt: string;
}

interface SystemStats {
  users: { total: number; holders: number; issuers: number; verifiers: number; admins: number };
  dids: { total: number };
  credentials: { total: number; valid: number; revoked: number; expired: number };
}

interface CredentialData {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  status: string;
  issuedAt: string;
  revokedAt?: string;
  metadata?: { type?: string; subjectName?: string; description?: string; issuedBy?: string };
}

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const DatabaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/>
    <path d="M3 12A9 3 0 0 0 21 12"/>
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
  </svg>
);

const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
  </svg>
);

type AdminTab = "overview" | "users" | "credentials";

export function AdminPanel() {
  useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [credentials, setCredentials] = useState<CredentialData[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "issuer" as UserRole,
    organizationName: "",
  });

  useEffect(() => {
    loadStats();
    loadUsers();
  }, []);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const data = await apiGet<SystemStats>("/stats");
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<UserData[]>("/auth/users");
      setUsers(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const data = await apiGet<CredentialData[]>("/stats/credentials");
      setCredentials(data);
    } catch (e) {
      console.error("Failed to load credentials:", e);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await apiPost("/auth/users", newUser);
      setSuccess(`User ${newUser.email} created successfully!`);
      setNewUser({ email: "", password: "", role: "issuer", organizationName: "" });
      setShowCreateForm(false);
      loadUsers();
      loadStats();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case "admin": return "invalid";
      case "issuer": return "valid";
      case "verifier": return "pending";
      default: return "valid";
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon" style={{ background: "var(--danger-50)", borderColor: "rgba(239,68,68,0.15)", color: "var(--danger-500)" }}>
          <SettingsIcon />
        </div>
        <h2 className="panel-title">Admin Dashboard</h2>
        <p className="panel-description">
          Manage users, monitor credentials, and oversee the ChainShield platform.
        </p>
      </div>

      {/* Admin Sub-tabs */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", justifyContent: "center" }}>
        {([
          { id: "overview" as AdminTab, label: "System Overview", icon: <DatabaseIcon /> },
          { id: "users" as AdminTab, label: "User Management", icon: <UsersIcon /> },
          { id: "credentials" as AdminTab, label: "Credentials", icon: <FileIcon /> },
        ]).map(tab => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "credentials" && credentials.length === 0) loadCredentials();
            }}
            style={{ padding: "var(--space-2) var(--space-4)", fontSize: "0.875rem" }}
          >
            <span style={{ width: 16, height: 16, display: "inline-flex" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          <div className="stats-row">
            {statsLoading ? (
              <div style={{ textAlign: "center", padding: "var(--space-4)", width: "100%" }}>
                <span className="loading"><span className="spinner" /></span>
              </div>
            ) : (
              <>
                <div className="stat-item">
                  <div className="stat-value" style={{ color: "var(--brand-700)" }}>{stats?.users.total ?? "—"}</div>
                  <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value" style={{ color: "var(--success-600)" }}>{stats?.credentials.total ?? "—"}</div>
                  <div className="stat-label">Credentials</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value" style={{ color: "var(--brand-500)" }}>{stats?.dids.total ?? "—"}</div>
                  <div className="stat-label">DIDs Registered</div>
                </div>
              </>
            )}
          </div>

          <div className="card-grid">
            {/* User Breakdown */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon"><UsersIcon /></div>
                <div>
                  <h3 className="card-title">User Breakdown</h3>
                  <p className="card-subtitle">By role</p>
                </div>
                <button className="btn btn-secondary" onClick={() => { loadStats(); loadUsers(); }} style={{ padding: "var(--space-2)" }}>
                  <RefreshIcon />
                </button>
              </div>
              <div className="card-body">
                {[
                  { label: "Holders", value: stats?.users.holders ?? 0, color: "var(--brand-700)" },
                  { label: "Issuers", value: stats?.users.issuers ?? 0, color: "var(--success-600)" },
                  { label: "Verifiers", value: stats?.users.verifiers ?? 0, color: "var(--brand-500)" },
                  { label: "Admins", value: stats?.users.admins ?? 0, color: "var(--danger-500)" },
                ].map(item => (
                  <div key={item.label} className="data-row">
                    <span className="data-label">{item.label}</span>
                    <span style={{ fontSize: "1.125rem", fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credential Status */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon" style={{ background: "var(--success-50)", color: "var(--success-600)" }}>
                  <ShieldIcon />
                </div>
                <div>
                  <h3 className="card-title">Credential Status</h3>
                  <p className="card-subtitle">Platform-wide</p>
                </div>
              </div>
              <div className="card-body">
                {[
                  { label: "Valid", value: stats?.credentials.valid ?? 0, color: "var(--success-600)" },
                  { label: "Revoked", value: stats?.credentials.revoked ?? 0, color: "var(--danger-500)" },
                  { label: "Expired", value: stats?.credentials.expired ?? 0, color: "var(--warning-400)" },
                ].map(item => (
                  <div key={item.label} className="data-row">
                    <span className="data-label">{item.label}</span>
                    <span style={{ fontSize: "1.125rem", fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                ))}
                <div className="divider" />
                <div className="data-row">
                  <span className="data-label" style={{ fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--gray-900)" }}>{stats?.credentials.total ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Users */}
          {users.length > 0 && (
            <div className="card" style={{ marginTop: "var(--space-6)" }}>
              <div className="card-header">
                <div className="card-icon"><UsersIcon /></div>
                <div>
                  <h3 className="card-title">Recent Users</h3>
                  <p className="card-subtitle">Last 5 registered</p>
                </div>
              </div>
              <div className="card-body">
                {users.slice(-5).reverse().map(u => (
                  <div key={u.id} className="data-row">
                    <div>
                      <span style={{ color: "var(--gray-800)", fontWeight: 500 }}>{u.email}</span>
                      {u.organizationName && (
                        <span style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginLeft: "var(--space-2)" }}>
                          ({u.organizationName})
                        </span>
                      )}
                    </div>
                    <span className={`status-badge ${getRoleBadgeClass(u.role)}`}>
                      <span className="status-dot" />{u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="card-grid">
          <div className="card">
            <div className="card-header">
              <div className="card-icon"><UsersIcon /></div>
              <div>
                <h3 className="card-title">All Users</h3>
                <p className="card-subtitle">{users.length} registered</p>
              </div>
            </div>

            <div className="card-body">
              <div className="action-row" style={{ marginBottom: "var(--space-4)" }}>
                <button className="btn btn-primary" onClick={loadUsers} disabled={loading}>
                  <RefreshIcon /> {loading ? "Loading..." : "Refresh"}
                </button>
                <button className="btn btn-success" onClick={() => setShowCreateForm(!showCreateForm)}>
                  <PlusIcon /> Create User
                </button>
              </div>

              {users.length > 0 && (
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {users.map((u) => (
                    <div 
                      key={u.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "var(--space-3)",
                        background: "var(--surface-inset)",
                        borderRadius: "var(--radius-md)",
                        marginBottom: "var(--space-2)"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, color: "var(--gray-800)" }}>{u.email}</div>
                        {u.organizationName && (
                          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>{u.organizationName}</div>
                        )}
                        {u.did && (
                          <div style={{ fontSize: "0.7rem", color: "var(--gray-600)", fontFamily: "var(--font-mono)" }}>
                            {u.did.slice(0, 35)}...
                          </div>
                        )}
                      </div>
                      <span className={`status-badge ${getRoleBadgeClass(u.role)}`}>
                        <span className="status-dot" />{u.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showCreateForm && (
            <div className="card">
              <div className="card-header">
                <div className="card-icon success"><PlusIcon /></div>
                <div>
                  <h3 className="card-title">Create New User</h3>
                  <p className="card-subtitle">Add issuer, verifier, or holder accounts</p>
                </div>
              </div>

              <form onSubmit={createUser}>
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input type="email" className="input" value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Password</label>
                  <input type="password" className="input" value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />
                </div>
                <div className="input-group">
                  <label className="input-label">Role</label>
                  <select className="input" value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                    <option value="issuer">Issuer</option>
                    <option value="verifier">Verifier</option>
                    <option value="holder">Holder</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {(newUser.role === "issuer" || newUser.role === "verifier") && (
                  <div className="input-group">
                    <label className="input-label">Organization Name</label>
                    <input type="text" className="input" value={newUser.organizationName}
                      onChange={(e) => setNewUser({ ...newUser, organizationName: e.target.value })}
                      required placeholder="e.g., University of Example" />
                  </div>
                )}
                <button type="submit" className="btn btn-success btn-lg w-full" disabled={loading}>
                  <PlusIcon /> Create User
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Credentials Tab */}
      {activeTab === "credentials" && (
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ background: "var(--success-50)", color: "var(--success-600)" }}>
              <FileIcon />
            </div>
            <div style={{ flex: 1 }}>
              <h3 className="card-title">All Credentials</h3>
              <p className="card-subtitle">{credentials.length} total on platform</p>
            </div>
            <button className="btn btn-secondary" onClick={loadCredentials} style={{ padding: "var(--space-2) var(--space-3)" }}>
              <RefreshIcon />
            </button>
          </div>

          <div className="card-body" style={{ maxHeight: 500, overflowY: "auto" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
                <span className="loading"><span className="spinner" /></span>
              </div>
            ) : credentials.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--gray-500)" }}>
                <p>No credentials issued yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {credentials.map((cred) => (
                  <div key={cred.credentialId} style={{
                    padding: "var(--space-4)",
                    background: "var(--surface-inset)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--surface-border)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--gray-800)" }}>
                          {cred.credentialId}
                        </div>
                        {cred.metadata?.subjectName && (
                          <div style={{ fontSize: "0.8125rem", color: "var(--gray-300)", marginTop: 2 }}>
                            Subject: {cred.metadata.subjectName}
                          </div>
                        )}
                        <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 2 }}>
                          Issuer: {cred.issuerDid.slice(0, 30)}...
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                          Holder: {cred.holderDid.slice(0, 30)}...
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--gray-600)", marginTop: 2 }}>
                          Issued: {new Date(cred.issuedAt).toLocaleDateString()}
                          {cred.metadata?.type && ` • Type: ${cred.metadata.type}`}
                          {cred.metadata?.issuedBy && ` • By: ${cred.metadata.issuedBy}`}
                        </div>
                      </div>
                      <span className={`status-badge ${cred.status === "valid" ? "valid" : "invalid"}`}>
                        <span className="status-dot" />{cred.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="result-card success" style={{ marginTop: "var(--space-4)" }}>
          <div className="result-header">
            <div className="result-icon success"><CheckCircleIcon /></div>
            <div className="result-title">{success}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message" style={{ marginTop: "var(--space-4)" }}>
          <AlertCircleIcon /><span>{error}</span>
        </div>
      )}

      <div className="info-box" style={{ marginTop: "var(--space-6)" }}>
        <div className="info-box-content">
          <strong>Admin Capabilities:</strong><br />
          • View system-wide statistics and health metrics<br />
          • Create issuer accounts (universities, employers)<br />
          • Create verifier accounts (background check services)<br />
          • Monitor all credentials across the platform<br />
          • Access all panels (Holder, Issuer, Verifier)
        </div>
      </div>
    </div>
  );
}
