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
import VulnerabilityCard from './components/VulnerabilityCard';
import { useScanManager, getBaseApiUrl } from './hooks/useScanManager';
import { downloadVulnerabilitySolutionPdf } from './utils/exportReport';

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
  const [reportSolution, setReportSolution] = useState(null);
  const [generatingSolution, setGeneratingSolution] = useState(false);
  const [solutionError, setSolutionError] = useState('');

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
    setReportSolution(null);
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
    if (isAdmin && activePage !== 'admin') setActivePage('admin');
    else if (!isAdmin && activePage === 'admin') setActivePage('dashboard');
  }, [isAdmin, activePage]);

  useEffect(() => {
    localStorage.setItem(configStorageKey, JSON.stringify(config));
  }, [configStorageKey, config]);

  useEffect(() => {
    localStorage.setItem(historyStorageKey, JSON.stringify(history));
  }, [historyStorageKey, history]);

  const { loading, stopping, scanProgress, scanResult, errorMsg, startScan, stopScan } =
    useScanManager({
      config,
      onScanComplete: (report, scannedUrl) => {
        const entry = {
          id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          targetUrl: report?.targetUrl || scannedUrl,
          scannedAt: new Date().toLocaleString(),
          scanTime: report?.scanTime || '',
          stopped: Boolean(report?.stopped),
          riskSummary: report?.riskSummary || { high: 0, medium: 0, low: 0 },
          vulnerabilities: report?.vulnerabilities || [],
          reportSolution: report?.reportSolution || null,
        };
        if (config.saveHistory) {
          setHistory((prev) => [entry, ...prev]);
        }
        setSelectedReport(entry);
        setReportSolution(entry.reportSolution);
        setSolutionError('');
        recordLog(currentUser?.email || 'user', `Completed scan on ${entry.targetUrl}`);
      },
    });

  if (!currentUser) {
    return <LoginPage />;
  }

  const handleNavigate = (page) => {
    if (page === 'home') {
      onBackToHome?.();
      return;
    }
    setActivePage(isAdmin ? 'admin' : page);
  };

  const clearScanHistory = () => {
    setHistory([]);
    setSelectedReport(null);
    setReportSolution(null);
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
          scanTime: scanResult.scanTime || '',
          stopped: scanResult.stopped,
          riskSummary: scanResult.riskSummary || { high: 0, medium: 0, low: 0 },
          vulnerabilities: scanResult.vulnerabilities || [],
          reportSolution: scanResult.reportSolution || null,
        }
      : null);

  const activeSolution = reportSolution || activeReport?.reportSolution || null;

  const handleGenerateReportSolution = async () => {
    if (!activeReport) return;
    setGeneratingSolution(true);
    setSolutionError('');
    try {
      const baseUrl = getBaseApiUrl(config?.apiEndpoint);
      const res = await fetch(`${baseUrl}/api/report/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: activeReport }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed (${res.status})`);
      }
      const data = await res.json();
      setReportSolution(data.solution);
    } catch (err) {
      setSolutionError(err.message || 'Could not generate AI solutions.');
    } finally {
      setGeneratingSolution(false);
    }
  };

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
                    setReportSolution(scan.reportSolution || null);
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
                        <button type="button" className="btn-danger-sm" onClick={clearScanHistory}>
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
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item, idx) => (
                            <tr key={item.id ? `${item.id}_${idx}` : `scan_${idx}`}>
                              <td className="mono-url">{item.targetUrl}</td>
                              <td className="muted-cell">{item.scannedAt}</td>
                              <td className="num-high">{item.riskSummary?.high || 0}</td>
                              <td className="num-med">{item.riskSummary?.medium || 0}</td>
                              <td className="action-cell">
                                <button
                                  type="button"
                                  className="btn-action-cyan"
                                  onClick={() => {
                                    setSelectedReport(item);
                                    setReportSolution(item.reportSolution || null);
                                    setActivePage('findings');
                                  }}
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  className="btn-table-view"
                                  onClick={() =>
                                    downloadVulnerabilitySolutionPdf(item, item.reportSolution || null)
                                  }
                                >
                                  PDF Report
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
                    <h1 className="page-title">Vulnerabilities &amp; Cloudflare AI Solutions</h1>
                    {activeReport && (
                      <div className="header-actions">
                        <button
                          type="button"
                          className="btn-cyan-primary"
                          onClick={() =>
                            downloadVulnerabilitySolutionPdf(activeReport, activeSolution)
                          }
                        >
                          Vulnerability &amp; Solution PDF
                        </button>
                      </div>
                    )}
                  </div>

                  {!activeReport ? (
                    <div className="tl-card empty-panel compact">
                      <p>Select a scan or start a new scan to view vulnerabilities and AI solutions.</p>
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
                            {activeReport.stopped ? 'Partial Report' : 'Completed'}
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
                          <span className="sev-badge low">
                            Low: {activeReport.riskSummary?.low || 0}
                          </span>
                          <button
                            type="button"
                            className="btn-cyan-primary"
                            onClick={handleGenerateReportSolution}
                            disabled={generatingSolution}
                          >
                            {generatingSolution ? 'Generating...' : 'Cloudflare AI Solutions'}
                          </button>
                        </div>
                      </div>

                      {solutionError && <div className="global-error-banner">{solutionError}</div>}

                      {Array.isArray(activeSolution?.errorSolutions) &&
                        activeSolution.errorSolutions.length > 0 && (
                          <div className="tl-card">
                            <h3 className="card-section-title">Cloudflare AI Solutions</h3>
                            {activeSolution.errorSolutions.map((sol, idx) => (
                              <div key={idx} className="solution-item-card">
                                <div className="finding-header">
                                  <h4 className="finding-title">
                                    {idx + 1}. {sol.errorName || 'Vulnerability'}
                                  </h4>
                                  <span className={`severity-badge ${(sol.risk || 'low').toLowerCase()}`}>
                                    {sol.risk || 'Info'}
                                  </span>
                                </div>

                                {sol.solutionSummary && (
                                  <p className="meta-line">{sol.solutionSummary}</p>
                                )}

                                {Array.isArray(sol.steps) && sol.steps.length > 0 && (
                                  <ul className="ai-list">
                                    {sol.steps.map((st, sIdx) => (
                                      <li key={sIdx}>{st}</li>
                                    ))}
                                  </ul>
                                )}

                                {sol.codeExample && (
                                  <pre className="evidence-block">
                                    <code>
                                      {typeof sol.codeExample === 'string'
                                        ? sol.codeExample
                                        : JSON.stringify(sol.codeExample, null, 2)}
                                    </code>
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                      <div className="tl-card">
                        <h3 className="card-section-title">
                          Vulnerabilities Found ({activeReport.vulnerabilities.length})
                        </h3>
                      </div>

                      {activeReport.vulnerabilities.length === 0 ? (
                        <div className="tl-card">
                          <p>No vulnerabilities found.</p>
                        </div>
                      ) : (
                        activeReport.vulnerabilities.map((vuln, idx) => (
                          <VulnerabilityCard key={vuln.id ?? idx} vuln={vuln} />
                        ))
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
                      1. Click <strong>New scan</strong> in the sidebar.
                      <br />
                      2. Enter a target URL and start the scan.
                      <br />
                      3. View vulnerabilities found, Cloudflare AI solutions, and export the Vulnerability &amp; Solution PDF.
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