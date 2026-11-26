import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBaseApiUrl } from '../hooks/useScanManager';

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

  const [adminTab, setAdminTab] = useState('health');
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newLimit, setNewLimit] = useState(5);
  const [formMsg, setFormMsg] = useState('');

  const fetchSystemHealth = useCallback(async () => {
    setHealthLoading(true);
    const baseUrl = getBaseApiUrl(config?.apiEndpoint);
    const localConfigErrors = [];
    if (!config?.apiEndpoint || !/^https?:\/\//i.test(config.apiEndpoint.trim())) {
      localConfigErrors.push('Frontend API Endpoint is missing or invalid.');
    }
    if (!config?.timeoutSeconds || Number(config.timeoutSeconds) < 5) {
      localConfigErrors.push('Request timeout should be at least 5 seconds.');
    }

    try {
      const res = await fetch(`${baseUrl}/api/system/health`);
      if (!res.ok) throw new Error(`Backend health endpoint returned ${res.status}`);
      const data = await res.json();
      setHealth({
        ...data,
        backendReachable: true,
        configErrors: Array.from(new Set([...localConfigErrors, ...(data.configErrors || [])])),
      });
    } catch (err) {
      setHealth({
        backendReachable: false,
        timestamp: new Date().toLocaleTimeString(),
        zap: { connected: false, url: 'http://localhost:8080', error: 'Unreachable via backend' },
        docker: { daemonRunning: false, containerRunning: false, error: 'Cannot check Docker without backend' },
        cloudflare: { configured: false, error: 'Cannot verify Cloudflare AI without backend' },
        configErrors: [
          ...localConfigErrors,
          `Backend API unreachable (${baseUrl}): ${err.message}`,
        ],
        healthy: false,
      });
    } finally {
      setHealthLoading(false);
    }
  }, [config?.apiEndpoint, config?.timeoutSeconds]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchSystemHealth();
    }
  }, [currentUser?.role, fetchSystemHealth]);

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

  const configErrors = health?.configErrors || [];

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <span className="admin-eyebrow">ADMINISTRATION CONSOLE</span>
          <h1 className="page-title">Admin Dashboard</h1>
        </div>
        <button
          type="button"
          className="btn-cyan-primary"
          onClick={fetchSystemHealth}
          disabled={healthLoading}
        >
          {healthLoading ? 'Checking...' : 'Refresh Diagnostics'}
        </button>
      </div>

      <div className="admin-kpi-grid">
        <div className="tl-card kpi-box">
          <span className="stat-label">ZAP Engine</span>
          <div className={`kpi-value ${health?.zap?.connected ? 'status-ok' : 'num-high'}`}>
            {health ? (health.zap?.connected ? `Online (${health.zap.version})` : 'Offline') : '...'}
          </div>
        </div>
        <div className="tl-card kpi-box">
          <span className="stat-label">Docker Container</span>
          <div className={`kpi-value ${health?.docker?.containerRunning ? 'status-ok' : 'num-high'}`}>
            {health
              ? health.docker?.containerRunning
                ? 'Running'
                : health.docker?.daemonRunning
                ? 'Stopped'
                : 'Unavailable'
              : '...'}
          </div>
        </div>
        <div className="tl-card kpi-box">
          <span className="stat-label">Cloudflare AI</span>
          <div className={`kpi-value ${health?.cloudflare?.configured ? 'status-ok' : 'num-med'}`}>
            {health ? (health.cloudflare?.configured ? 'Configured' : 'Missing Keys') : '...'}
          </div>
        </div>
        <div className="tl-card kpi-box">
          <span className="stat-label">Config / System Errors</span>
          <div className={`kpi-value ${configErrors.length === 0 ? 'status-ok' : 'num-high'}`}>
            {health ? configErrors.length : '...'}
          </div>
        </div>
      </div>

      <div className="subtab-bar">
        <button
          type="button"
          className={`subtab-btn ${adminTab === 'health' ? 'active' : ''}`}
          onClick={() => setAdminTab('health')}
        >
          Engine &amp; Config Health ({configErrors.length})
        </button>
        <button
          type="button"
          className={`subtab-btn ${adminTab === 'users' ? 'active' : ''}`}
          onClick={() => setAdminTab('users')}
        >
          Users &amp; Roles ({users.length})
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

      {adminTab === 'health' && (
        <div className="admin-stack">
          <div className="tl-card">
            <h3 className="card-section-title">Configuration &amp; Connectivity Errors</h3>
            {configErrors.length === 0 ? (
              <p className="status-ok">No configuration or connectivity errors detected.</p>
            ) : (
              <ul className="ai-list">
                {configErrors.map((err, idx) => (
                  <li key={idx} className="num-high">
                    {err}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="admin-settings-grid">
            <div className="tl-card">
              <h3 className="card-section-title">OWASP ZAP Engine</h3>
              <p className="meta-line">
                <strong>Endpoint:</strong> <span className="mono-url">{health?.zap?.url || 'http://localhost:8080'}</span>
              </p>
              <p className="meta-line">
                <strong>Status:</strong> {health?.zap?.connected ? 'Connected' : 'Disconnected'}
              </p>
              {health?.zap?.version && (
                <p className="meta-line">
                  <strong>Version:</strong> {health.zap.version}
                </p>
              )}
              {health?.zap?.error && (
                <p className="meta-line num-high">
                  <strong>Error:</strong> {health.zap.error}
                </p>
              )}
            </div>

            <div className="tl-card">
              <h3 className="card-section-title">Docker &amp; Container Status</h3>
              <p className="meta-line">
                <strong>Daemon:</strong> {health?.docker?.daemonRunning ? 'Running' : 'Not Running'}
              </p>
              <p className="meta-line">
                <strong>Container:</strong>{' '}
                <span className="mono-url">{health?.docker?.containerName || 'zap-api'}</span>
              </p>
              <p className="meta-line">
                <strong>State:</strong> {health?.docker?.containerStatus || 'Unknown'}
              </p>
              {health?.docker?.error && (
                <p className="meta-line num-high">
                  <strong>Error:</strong> {health.docker.error}
                </p>
              )}
            </div>
          </div>

          <div className="tl-card">
            <h3 className="card-section-title">Cloudflare AI Configuration</h3>
            <p className="meta-line">
              <strong>Model:</strong> <span className="mono-url">{health?.cloudflare?.model || 'N/A'}</span>
            </p>
            <p className="meta-line">
              <strong>Account ID:</strong> {health?.cloudflare?.accountIdPresent ? 'Present' : 'Missing'} |{' '}
              <strong>API Token:</strong> {health?.cloudflare?.apiTokenPresent ? 'Present' : 'Missing'}
            </p>
            {health?.cloudflare?.error && (
              <p className="meta-line num-med">
                <strong>Notice:</strong> {health.cloudflare.error}
              </p>
            )}
          </div>
        </div>
      )}

      {adminTab === 'users' && (
        <div className="admin-stack">
          <div className="tl-card">
            <h3 className="card-section-title">Provision New User</h3>
            {formMsg && <p className="meta-line status-ok">{formMsg}</p>}
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
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="tl-input">
                <option value="user">Analyst (User)</option>
                <option value="admin">Administrator</option>
              </select>
              <input
                type="number"
                min="1"
                max="500"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="tl-input"
                title="Scan Quota"
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
                    <td className="num-high">{item.riskSummary?.high || 0}</td>
                    <td className="num-med">{item.riskSummary?.medium || 0}</td>
                    <td>{item.stopped ? 'Stopped' : 'Completed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {adminTab === 'settings' && (
        <div className="tl-card">
          <h3 className="card-section-title">Global Scanner &amp; API Configuration</h3>
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
            onClick={() => {
              recordLog(currentUser.email, 'Updated global scanner system settings');
              fetchSystemHealth();
            }}
          >
            Save &amp; Re-check System Policy
          </button>
        </div>
      )}

      {adminTab === 'logs' && (
        <div className="tl-card">
          <h3 className="card-section-title">Security &amp; Admin Audit Trail</h3>
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