import { useState } from "react";
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

// Icons
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/>
    <path d="M12 5v14"/>
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
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <path d="m9 11 3 3L22 4"/>
  </svg>
);

const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

export function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "issuer" as UserRole,
    organizationName: "",
  });

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

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Use admin endpoint to create users
      await apiPost("/auth/users", newUser);
      setSuccess(`User ${newUser.email} created successfully!`);
      setNewUser({ email: "", password: "", role: "issuer", organizationName: "" });
      setShowCreateForm(false);
      loadUsers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case "admin": return "invalid"; // red
      case "issuer": return "valid"; // green
      case "verifier": return "pending"; // yellow
      default: return "valid";
    }
  };

  return (
    <div className="panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-icon" style={{ background: "linear-gradient(135deg, var(--danger-500) 0%, #b91c1c 100%)" }}>
          <SettingsIcon />
        </div>
        <h2 className="panel-title">Admin Dashboard</h2>
        <p className="panel-description">
          Manage users, create issuer and verifier accounts, and monitor the system.
        </p>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--primary-400)" }}>{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--success-400)" }}>
            {users.filter(u => u.role === "issuer").length}
          </div>
          <div className="stat-label">Issuers</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--accent-400)" }}>
            {users.filter(u => u.role === "verifier").length}
          </div>
          <div className="stat-label">Verifiers</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "var(--gray-400)" }}>
            {users.filter(u => u.role === "holder").length}
          </div>
          <div className="stat-label">Holders</div>
        </div>
      </div>

      {/* Actions */}
      <div className="card-grid">
        {/* User Management Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon">
              <UsersIcon />
            </div>
            <div>
              <h3 className="card-title">User Management</h3>
              <p className="card-subtitle">View and manage all users</p>
            </div>
          </div>

          <div className="card-body">
            <div className="action-row" style={{ marginBottom: "var(--space-4)" }}>
              <button className="btn btn-primary" onClick={loadUsers} disabled={loading}>
                {loading ? "Loading..." : "Load Users"}
              </button>
              <button 
                className="btn btn-success" 
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                <PlusIcon />
                Create User
              </button>
            </div>

            {/* User List */}
            {users.length > 0 && (
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {users.map((u) => (
                  <div 
                    key={u.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "var(--space-3)",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "var(--radius-md)",
                      marginBottom: "var(--space-2)"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, color: "var(--gray-200)" }}>{u.email}</div>
                      {u.organizationName && (
                        <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                          {u.organizationName}
                        </div>
                      )}
                    </div>
                    <span className={`status-badge ${getRoleBadgeClass(u.role)}`}>
                      <span className="status-dot" />
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create User Card */}
        {showCreateForm && (
          <div className="card">
            <div className="card-header">
              <div className="card-icon success">
                <PlusIcon />
              </div>
              <div>
                <h3 className="card-title">Create New User</h3>
                <p className="card-subtitle">Add issuer or verifier accounts</p>
              </div>
            </div>

            <form onSubmit={createUser}>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  type="password"
                  className="input"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Role</label>
                <select
                  className="input"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                >
                  <option value="issuer">Issuer</option>
                  <option value="verifier">Verifier</option>
                  <option value="holder">Holder</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {(newUser.role === "issuer" || newUser.role === "verifier") && (
                <div className="input-group">
                  <label className="input-label">Organization Name</label>
                  <input
                    type="text"
                    className="input"
                    value={newUser.organizationName}
                    onChange={(e) => setNewUser({ ...newUser, organizationName: e.target.value })}
                    required
                    placeholder="e.g., University of Example"
                  />
                </div>
              )}

              <button type="submit" className="btn btn-success btn-lg w-full" disabled={loading}>
                Create User
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
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
          <AlertCircleIcon />
          <span>{error}</span>
        </div>
      )}

      {/* Info */}
      <div className="info-box" style={{ marginTop: "var(--space-6)" }}>
        <div className="info-box-content">
          <strong>Admin Capabilities:</strong><br />
          • Create issuer accounts (universities, employers)<br />
          • Create verifier accounts (background check services)<br />
          • View all system users<br />
          • Access all panels (Holder, Issuer, Verifier)
        </div>
      </div>
    </div>
  );
}
