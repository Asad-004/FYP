import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard({
  history,
  onClearHistory,
  config,
  setConfig,
  loading,
  onStopScan,
}) {
  const {
    currentUser,
    users,
    auditLogs,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    recordLog,
  } = useAuth();

  const [adminTab, setAdminTab] = useState('users'); // 'users' | 'scans' | 'settings' | 'logs'
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newLimit, setNewLimit] = useState(5);
  const [formMsg, setFormMsg] = useState('');

  if (currentUser?.role !== 'admin') {
    return (
      <div className="page-container">
        <div className="tl-card">
          <h2>Access Denied</h2>
          <p>Administrator privileges are required to view this console.</p>
        </div>
      </div>
    );
  }

  const handleCreateUser = (e) => {
    e.preventDefault();
    const res = createUserByAdmin({
      name: newName,
      email: newEmail,
      password: newPassword,
      role: newRole,
      scanLimit: newLimit,
    });
    if (!res.ok) {
      setFormMsg(res.error);
      return;
    }
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setFormMsg('User account provisioned successfully.');
  };

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <span className="admin-eyebrow">ADMINISTRATION CONSOLE</span>
          <h1 className="page-title">Admin Dashboard</h1>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="admin-kpi-grid">
        <div className="tl-card kpi-box">
          <span className="metric-label">Total Registered Users</span>
          <div className="kpi-value">{users.length}</div>
        </div>
        <div className="tl-card kpi-box">
          <span className="metric-label">Active Scans</span>
          <div className="kpi-value cyan-accent">{loading ? 1 : 0}</div>
        </div>
        <div className="tl-card kpi-box">
          <span className="metric-label">Completed Workspace Audits</span>
          <div className="kpi-value">{history.length}</div>
        </div>
        <div className="tl-card kpi-box">
          <span className="metric-label">Scanner Backend Status</span>
          <div className="kpi-value status-ok">Operational</div>
        </div>
      </div>

      {/* Admin Sub-Navigation */}
      <div className="subtab-bar">
        <button
          type="button"
          className={`subtab-btn ${adminTab === 'users' ? 'active' : ''}`}
          onClick={() => setAdminTab('users')}
        >
          Users & Roles ({users.length})
        </button>
        <button
          type="button"
          className={`subtab-btn ${adminTab === 'scans' ? 'active' : ''}`}
          onClick={() => setAdminTab('scans')}
        >
          Scan Oversight ({history.length})
        </button>
        <button
          type="button"
          className={`subtab-btn ${adminTab === 'settings' ? 'active' : ''}`}
          onClick={() => setAdminTab('settings')}
        >
          System Policies
        </button>
        <button
          type="button"
          className={`subtab-btn ${adminTab === 'logs' ? 'active' : ''}`}
          onClick={() => setAdminTab('logs')}
        >
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: USERS & ROLES */}
      {adminTab === 'users' && (
        <div className="admin-stack">
          <div className="tl-card">
            <h3 className="card-section-title">Provision New User</h3>
            {formMsg && <div className="auth-alert success">{formMsg}</div>}
            <form onSubmit={handleCreateUser} className="admin-inline-form">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="tl-input"
              />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="tl-input"
              />
              <input
                type="text"
                required
                placeholder="Temporary Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="tl-input"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="tl-input"
              >
                <option value="user">Analyst (User)</option>
                <option value="admin">Administrator</option>
              </select>
              <input
                type="number"
                min="1"
                max="500"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="tl-input short-input"
                title="Cycle Scan Quota"
              />
              <button type="submit" className="btn-cyan-primary">
                + Add User
              </button>
            </form>
          </div>

          <div className="tl-card">
            <h3 className="card-section-title">Workspace Members</h3>
            <table className="tl-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Scan Quota</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="mono-url">{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        disabled={u.id === currentUser.id}
                        onChange={(e) => updateUserByAdmin(u.id, { role: e.target.value })}
                        className="tl-select-sm"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`status-pill ${u.status === 'active' ? 'completed' : 'suspended'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={u.scanLimit}
                        onChange={(e) =>
                          updateUserByAdmin(u.id, { scanLimit: Number(e.target.value) || 5 })
                        }
                        className="tl-input tiny-input"
                      />
                    </td>
                    <td className="action-cell">
                      {u.id !== currentUser.id ? (
                        <>
                          <button
                            type="button"
                            className="btn-table-view"
                            onClick={() =>
                              updateUserByAdmin(u.id, {
                                status: u.status === 'active' ? 'suspended' : 'active',
                              })
                            }
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="btn-danger-sm"
                            onClick={() => deleteUserByAdmin(u.id)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="muted-caption">Current Session</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SCAN OVERSIGHT */}
      {adminTab === 'scans' && (
        <div className="tl-card">
          <div className="section-heading-row">
            <h3 className="card-section-title">All Recorded Workspace Scans</h3>
            <div className="action-cell">
              {loading && (
                <button type="button" className="btn-danger-sm" onClick={onStopScan}>
                  Force Stop Active Scan
                </button>
              )}
              {history.length > 0 && (
                <button
                  type="button"
                  className="btn-danger-sm"
                  onClick={() => {
                    onClearHistory();
                    recordLog(currentUser.email, 'Purged all workspace scan history');
                  }}
                >
                  Purge All History
                </button>
              )}
            </div>
          </div>

          {history.length === 0 ? (
            <p className="muted-caption">No scans recorded across workspaces yet.</p>
          ) : (
            <table className="tl-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Executed At</th>
                  <th>High</th>
                  <th>Medium</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="mono-url">{item.targetUrl}</td>
                    <td>{item.scannedAt}</td>
                    <td className="text-high">{item.riskSummary?.high || 0}</td>
                    <td className="text-med">{item.riskSummary?.medium || 0}</td>
                    <td>{item.stopped ? 'Stopped' : 'Completed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: GLOBAL SCANNER SETTINGS */}
      {adminTab === 'settings' && (
        <div className="tl-card">
          <h3 className="card-section-title">Global Scanner & API Configuration</h3>
          <div className="admin-settings-grid">
            <div className="form-group">
              <label>Backend Scan API Endpoint</label>
              <input
                type="text"
                value={config.apiEndpoint}
                onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })}
                className="tl-input"
              />
            </div>
            <div className="form-group">
              <label>Default Max Scan Timeout (Seconds)</label>
              <input
                type="number"
                value={config.timeoutSeconds}
                onChange={(e) =>
                  setConfig({ ...config, timeoutSeconds: Number(e.target.value) || 60 })
                }
                className="tl-input"
              />
            </div>
          </div>
          <button
            type="button"
            className="btn-cyan-primary mt-16"
            onClick={() => recordLog(currentUser.email, 'Updated global scanner system settings')}
          >
            Save System Policy
          </button>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {adminTab === 'logs' && (
        <div className="tl-card">
          <h3 className="card-section-title">Security & Admin Audit Trail</h3>
          <table className="tl-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Event</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="mono-url">{log.timestamp}</td>
                  <td>{log.actor}</td>
                  <td>{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}