import React, { useState, useEffect } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingHome from './components/LandingHome';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import DashboardOverview from './components/DashboardOverview';
import AdminDashboard from './components/AdminDashboard';
import ScanHero from './components/ScanHero';
import { useScanManager } from './hooks/useScanManager';

const VULNERABILITY_TYPES = [
  {
    type: 'SQL Injection',
    match: ['sql', 'sqli', 'database error', 'syntax error'],
    summary:
      'SQL Injection occurs when untrusted user input is concatenated directly into a database query without parameterization. It can allow attackers to read sensitive records, bypass authentication, or modify data.',
  },
  {
    type: 'Cross-Site Scripting (XSS)',
    match: ['xss', 'cross-site scripting', 'script injection'],
    summary:
      'Cross-Site Scripting happens when an application includes untrusted input in a web response without proper encoding or escaping. It allows malicious scripts to run in a user browser session.',
  },
  {
    type: 'Cross-Site Request Forgery (CSRF)',
    match: ['csrf', 'cross-site request forgery', 'anti-csrf'],
    summary:
      'Cross-Site Request Forgery tricks an authenticated user browser into sending unintended state-changing requests. Missing anti-CSRF tokens or weak cookie rules increase exposure.',
  },
  {
    type: 'Security Headers & Transport',
    match: ['header', 'csp', 'content security policy', 'ssl', 'tls', 'hsts', 'cookie', 'x-frame'],
    summary:
      'Missing or weak HTTP security headers and transport protections reduce browser-level defenses against framing, MIME sniffing, and traffic interception.',
  },
  {
    type: 'Authentication & Session Management',
    match: ['session', 'auth', 'login', 'token', 'password', 'credential'],
    summary:
      'Authentication and session flaws occur when credentials or session identifiers are weakly handled or improperly validated, risking unauthorized access or session hijacking.',
  },
  {
    type: 'Information & Path Exposure',
    match: ['disclosure', 'directory', 'listing', 'path traversal', 'debug', 'stack trace', 'version'],
    summary:
      'Information exposure occurs when internal paths, server versions, debug output, or sensitive files are unintentionally revealed externally.',
  },
];

function getVulnerabilityTypeInfo(vuln) {
  const combined = `${vuln?.name || ''} ${vuln?.type || ''} ${vuln?.description || ''}`.toLowerCase();
  for (const entry of VULNERABILITY_TYPES) {
    if (entry.match.some((kw) => combined.includes(kw))) {
      return { type: entry.type, summary: entry.summary };
    }
  }
  return {
    type: vuln?.type || 'General Web Vulnerability',
    summary:
      'This finding indicates a security weakness or configuration gap on the target. Review the full details below to apply appropriate hardening.',
  };
}

const DEFAULT_CONFIG = {
  apiEndpoint: 'http://localhost:5000/api/scan',
  timeoutSeconds: 240,
  saveHistory: true,
};

function WorkspaceApp({ onBackToHome }) {
  const { currentUser, recordLog } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [activePage, setActivePage] = useState(() => (isAdmin ? 'admin' : 'dashboard'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspace, setWorkspace] = useState('My Workspace');
  const [newScanModalOpen, setNewScanModalOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const userKey = (currentUser?.email || 'guest').trim().toLowerCase();
  const historyStorageKey = `threatlens_history_${userKey}`;
  const configStorageKey = `threatlens_config_${userKey}`;

  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(configStorageKey);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(historyStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setSelectedReport(null);
    try {
      const savedConfig = localStorage.getItem(configStorageKey);
      setConfig(savedConfig ? { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) } : DEFAULT_CONFIG);
    } catch {
      setConfig(DEFAULT_CONFIG);
    }
    try {
      const savedHistory = localStorage.getItem(historyStorageKey);
      setHistory(savedHistory ? JSON.parse(savedHistory) : []);
    } catch {
      setHistory([]);
    }
  }, [configStorageKey, historyStorageKey]);

  useEffect(() => {
    if (isAdmin && activePage !== 'admin') {
      setActivePage('admin');
    } else if (!isAdmin && activePage === 'admin') {
      setActivePage('dashboard');
    }
  }, [isAdmin, activePage]);

  useEffect(() => {
    localStorage.setItem(configStorageKey, JSON.stringify(config));
  }, [configStorageKey, config]);

  useEffect(() => {
    localStorage.setItem(historyStorageKey, JSON.stringify(history));
  }, [historyStorageKey, history]);

  const {
    loading,
    stopping,
    scanProgress,
    scanResult,
    errorMsg,
    startScan,
    stopScan,
  } = useScanManager({
    config,
    onScanComplete: (report, scannedUrl) => {
      const entry = {
        id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        targetUrl: report?.targetUrl || scannedUrl,
        scannedAt: new Date().toLocaleString(),
        stopped: Boolean(report?.stopped),
        riskSummary: report?.riskSummary || { high: 0, medium: 0, low: 0 },
        vulnerabilities: report?.vulnerabilities || [],
      };
      if (config.saveHistory) {
        setHistory((prev) => [entry, ...prev]);
      }
      setSelectedReport(entry);
      recordLog(currentUser?.email || 'user', `Completed scan on ${entry.targetUrl}`);
    },
  });

  if (!currentUser) {
    return <LoginPage onBackToHome={onBackToHome} />;
  }

  const handleNavigate = (page) => {
    if (page === 'home') {
      onBackToHome?.();
      return;
    }
    if (isAdmin) {
      setActivePage('admin');
      return;
    }
    setActivePage(page);
  };

  const clearScanHistory = () => {
    setHistory([]);
    setSelectedReport(null);
    localStorage.removeItem(historyStorageKey);
  };

  const uniqueAssets = Array.from(new Set(history.map((h) => h.targetUrl)));
  const totalFindings = history.reduce((sum, h) => sum + (h.vulnerabilities?.length || 0), 0);

  const handleLaunchScan = (e) => {
    e.preventDefault();
    if (!url.trim() || isAdmin) return;
    setNewScanModalOpen(false);
    setActivePage('dashboard');
    recordLog(currentUser.email, `Started scan on ${url.trim()}`);
    startScan(url);
  };

  const activeReport =
    selectedReport ||
    (scanResult
      ? {
          targetUrl: scanResult.targetUrl,
          scannedAt: 'Just now',
          stopped: scanResult.stopped,
          riskSummary: scanResult.riskSummary || { high: 0, medium: 0, low: 0 },
          vulnerabilities: scanResult.vulnerabilities || [],
        }
      : null);

  return (
    <div className="app-shell">
      <TopHeader
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        onNavigate={handleNavigate}
      />

      <div className="app-body">
        <Sidebar
          activePage={activePage}
          setActivePage={handleNavigate}
          onNewScanClick={() => !isAdmin && setNewScanModalOpen(true)}
          workspace={workspace}
          setWorkspace={setWorkspace}
          assetsCount={uniqueAssets.length}
          findingsCount={totalFindings}
          isAdmin={isAdmin}
          collapsed={sidebarCollapsed}
        />

        <main className="workspace-main">
          {errorMsg && <div className="global-error-banner">{errorMsg}</div>}

          {isAdmin ? (
            <AdminDashboard
              history={history}
              onClearHistory={clearScanHistory}
              config={config}
              setConfig={setConfig}
              loading={loading}
              onStopScan={stopScan}
            />
          ) : (
            <>
              {activePage === 'dashboard' && (
                <DashboardOverview
                  history={history}
                  loading={loading}
                  scanProgress={scanProgress}
                  stopping={stopping}
                  onStopScan={stopScan}
                  onOpenNewScan={() => setNewScanModalOpen(true)}
                  onSelectScan={(scan) => {
                    setSelectedReport(scan);
                    setActivePage('findings');
                  }}
                  onNavigate={setActivePage}
                />
              )}

              {activePage === 'assets' && (
                <div className="page-container">
                  <div className="page-header-row">
                    <h1 className="page-title">Assets</h1>
                    <button
                      type="button"
                      className="btn-cyan-primary"
                      onClick={() => setNewScanModalOpen(true)}
                    >
                      + Add &amp; Scan Asset
                    </button>
                  </div>
                  <div className="tl-card">
                    {uniqueAssets.length === 0 ? (
                      <div className="empty-panel compact">
                        <p>No target assets added yet.</p>
                        <button
                          type="button"
                          className="btn-cyan-primary"
                          onClick={() => setNewScanModalOpen(true)}
                        >
                          Add First Asset
                        </button>
                      </div>
                    ) : (
                      <table className="tl-table">
                        <thead>
                          <tr>
                            <th>Target URL</th>
                            <th>Workspace</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uniqueAssets.map((assetUrl) => (
                            <tr key={assetUrl}>
                              <td className="mono-url">{assetUrl}</td>
                              <td>{workspace}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-action-cyan"
                                  onClick={() => {
                                    setUrl(assetUrl);
                                    setNewScanModalOpen(true);
                                  }}
                                >
                                  Rescan
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {(activePage === 'scans' || activePage === 'reports') && (
                <div className="page-container">
                  <div className="page-header-row">
                    <h1 className="page-title">{activePage === 'reports' ? 'Reports' : 'Scans'}</h1>
                    <div className="header-actions">
                      {history.length > 0 && (
                        <button
                          type="button"
                          className="btn-danger-sm"
                          onClick={clearScanHistory}
                        >
                          Clear History
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-cyan-primary"
                        onClick={() => setNewScanModalOpen(true)}
                      >
                        New Scan
                      </button>
                    </div>
                  </div>
                  <div className="tl-card">
                    {history.length === 0 ? (
                      <div className="empty-panel compact">
                        <p>No scan records available.</p>
                      </div>
                    ) : (
                      <table className="tl-table">
                        <thead>
                          <tr>
                            <th>Target URL</th>
                            <th>Timestamp</th>
                            <th>High</th>
                            <th>Medium</th>
                            <th>Report</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item, idx) => (
                            <tr key={item.id ? `${item.id}_${idx}` : `scan_${idx}`}>
                              <td className="mono-url">{item.targetUrl}</td>
                              <td className="muted-cell">{item.scannedAt}</td>
                              <td className="num-high">{item.riskSummary?.high || 0}</td>
                              <td className="num-med">{item.riskSummary?.medium || 0}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-action-cyan"
                                  onClick={() => {
                                    setSelectedReport(item);
                                    setActivePage('findings');
                                  }}
                                >
                                  Open Findings
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {activePage === 'findings' && (
                <div className="page-container">
                  <div className="page-header-row">
                    <h1 className="page-title">Vulnerability Findings</h1>
                  </div>

                  {!activeReport ? (
                    <div className="tl-card empty-panel compact">
                      <p>Select a completed scan or start a new scan to inspect findings.</p>
                      <button
                        type="button"
                        className="btn-cyan-primary"
                        onClick={() => setNewScanModalOpen(true)}
                      >
                        Start a Scan
                      </button>
                    </div>
                  ) : (
                    <div className="findings-wrapper">
                      <div className="tl-card report-banner">
                        <div>
                          <span className="status-pill completed">
                            {activeReport.stopped ? 'Partial Report (Stopped)' : 'Scan Completed'}
                          </span>
                          <h2 className="report-target">{activeReport.targetUrl}</h2>
                        </div>
                        <div className="risk-pills">
                          <span className="sev-badge high">
                            High: {activeReport.riskSummary?.high || 0}
                          </span>
                          <span className="sev-badge medium">
                            Medium: {activeReport.riskSummary?.medium || 0}
                          </span>
                        </div>
                      </div>

                      {activeReport.vulnerabilities.length === 0 ? (
                        <div className="tl-card">
                          <p>No vulnerabilities were reported for this scan.</p>
                        </div>
                      ) : (
                        activeReport.vulnerabilities.map((vuln, idx) => {
                          const typeInfo = getVulnerabilityTypeInfo(vuln);
                          return (
                            <div key={vuln.id || idx} className="tl-card finding-detail-card">
                              <div className="finding-header">
                                <span className="sev-badge high">{vuln.risk || 'Info'} Risk</span>
                                <span className="vuln-category-pill">{typeInfo.type}</span>
                                <h3>{vuln.name}</h3>
                              </div>
                              <div className="vuln-type-summary">
                                <strong>About {typeInfo.type}:</strong> {typeInfo.summary}
                              </div>
                              <div className="vuln-raw-detail">
                                <strong>Complete Finding Details:</strong>
                                <p>{vuln.description}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {activePage === 'attack-surface' && (
                <div className="page-container">
                  <h1 className="page-title">Attack Surface</h1>
                  <div className="tl-card">
                    <p className="muted-caption">
                      Tracked targets in {workspace}: {uniqueAssets.length}.
                    </p>
                  </div>
                </div>
              )}

              {activePage === 'configuration' && (
                <div className="page-container">
                  <h1 className="page-title">Configuration</h1>
                  <div className="tl-card config-card">
                    <div className="form-group">
                      <label>Scanner API Endpoint</label>
                      <input
                        type="text"
                        className="tl-input"
                        value={config.apiEndpoint}
                        onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Request Timeout (seconds)</label>
                      <input
                        type="number"
                        className="tl-input"
                        value={config.timeoutSeconds}
                        onChange={(e) =>
                          setConfig({ ...config, timeoutSeconds: Number(e.target.value) || 240 })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'help' && (
                <div className="page-container">
                  <h1 className="page-title">Help</h1>
                  <div className="tl-card">
                    <h3>How to Run a Scan</h3>
                    <p className="muted-caption">
                      1. Click <strong>New scan</strong> in the sidebar.<br />
                      2. Enter a target URL and start the scan.<br />
                      3. View progress on the Dashboard and review results in Findings.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {!isAdmin && newScanModalOpen && (
        <div className="modal-backdrop" onClick={() => setNewScanModalOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <span>New Security Scan</span>
              <button type="button" className="icon-btn" onClick={() => setNewScanModalOpen(false)}>
                ✕
              </button>
            </div>
            <ScanHero
              url={url}
              setUrl={setUrl}
              loading={loading}
              onSubmit={handleLaunchScan}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [showHome, setShowHome] = useState(true);

  return (
    <AuthProvider>
      {showHome ? (
        <LandingHome onEnterApp={() => setShowHome(false)} />
      ) : (
        <WorkspaceApp onBackToHome={() => setShowHome(true)} />
      )}
    </AuthProvider>
  );
}