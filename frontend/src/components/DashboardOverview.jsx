import React, { useState } from 'react';
import ScanProgressCard from './ScanProgressCard';

export default function DashboardOverview({
  history,
  loading,
  scanProgress,
  stopping,
  onStopScan,
  onOpenNewScan,
  onSelectScan,
  onNavigate,
}) {
  const [subTab, setSubTab] = useState('overview');

  const totals = history.reduce(
    (acc, item) => {
      acc.high += item.riskSummary?.high || 0;
      acc.medium += item.riskSummary?.medium || 0;
      acc.low += item.riskSummary?.low || 0;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
  const totalFindings = totals.high + totals.medium + totals.low;

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h1 className="page-title">Dashboard</h1>
        <button type="button" className="btn-cyan-primary" onClick={onOpenNewScan}>
          New Scan
        </button>
      </div>

      <div className="subtab-bar">
        <button
          type="button"
          className={`subtab-btn ${subTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSubTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`subtab-btn ${subTab === 'help' ? 'active' : ''}`}
          onClick={() => setSubTab('help')}
        >
          Help
        </button>
      </div>

      {loading && (
        <div className="mb-20">
          <ScanProgressCard scanProgress={scanProgress} stopping={stopping} onStop={onStopScan} />
        </div>
      )}

      {subTab === 'overview' && (
        <>
          <div className="overview-grid">
            <div className="tl-card">
              <div className="section-heading-row">
                <h2 className="section-heading">Scan Overview</h2>
                <span className="muted-caption">{history.length} total scans</span>
              </div>
              <div className="stat-row">
                <div className="stat-box">
                  <span className="stat-label">Completed / Partial Scans</span>
                  <strong className="stat-number">{history.length}</strong>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Total Findings</span>
                  <strong className="stat-number cyan-accent">{totalFindings}</strong>
                </div>
              </div>
            </div>

            <div className="tl-card">
              <div className="section-heading-row">
                <h2 className="section-heading">Vulnerability Summary</h2>
                {totalFindings > 0 && (
                  <button
                    type="button"
                    className="btn-action-cyan"
                    onClick={() => onNavigate('findings')}
                  >
                    Inspect Findings ({totalFindings})
                  </button>
                )}
              </div>

              {totalFindings === 0 && history.length === 0 ? (
                <div className="empty-panel compact">
                  <p>No scans recorded yet.</p>
                  <button type="button" className="btn-cyan-primary" onClick={onOpenNewScan}>
                    Start a Scan
                  </button>
                </div>
              ) : (
                <div className="severity-list">
                  <div className="sev-row">
                    <span className="sev-badge high">High</span>
                    <div className="sev-bar-track">
                      <div
                        className="sev-bar-fill high"
                        style={{ width: `${totalFindings ? (totals.high / totalFindings) * 100 : 0}%` }}
                      />
                    </div>
                    <strong className="sev-count">{totals.high}</strong>
                  </div>
                  <div className="sev-row">
                    <span className="sev-badge medium">Medium</span>
                    <div className="sev-bar-track">
                      <div
                        className="sev-bar-fill medium"
                        style={{ width: `${totalFindings ? (totals.medium / totalFindings) * 100 : 0}%` }}
                      />
                    </div>
                    <strong className="sev-count">{totals.medium}</strong>
                  </div>
                  <div className="sev-row">
                    <span className="sev-badge low">Low / Info</span>
                    <div className="sev-bar-track">
                      <div
                        className="sev-bar-fill low"
                        style={{ width: `${totalFindings ? (totals.low / totalFindings) * 100 : 0}%` }}
                      />
                    </div>
                    <strong className="sev-count">{totals.low}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="latest-scans-section">
            <div className="section-heading-row">
              <h2 className="section-heading">Latest Scans</h2>
              <button type="button" className="text-link" onClick={() => onNavigate('scans')}>
                View All Scans
              </button>
            </div>

            <div className="tl-card">
              {history.length === 0 ? (
                <div className="empty-panel compact">
                  <p>No scans recorded yet.</p>
                  <button type="button" className="btn-cyan-primary" onClick={onOpenNewScan}>
                    Start a Scan
                  </button>
                </div>
              ) : (
                <table className="tl-table">
                  <thead>
                    <tr>
                      <th>Target URL</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>High</th>
                      <th>Medium</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 5).map((scan, idx) => (
                      <tr key={scan.id ? `${scan.id}_${idx}` : `scan_${idx}`}>
                        <td className="mono-url">{scan.targetUrl}</td>
                        <td className="muted-cell">{scan.scannedAt}</td>
                        <td>
                          <span className={`status-pill ${scan.stopped ? 'partial' : 'completed'}`}>
                            {scan.stopped ? 'Stopped' : 'Completed'}
                          </span>
                        </td>
                        <td className="num-high">{scan.riskSummary?.high || 0}</td>
                        <td className="num-med">{scan.riskSummary?.medium || 0}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-action-cyan"
                            onClick={() => onSelectScan(scan)}
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {subTab === 'help' && (
        <div className="tl-card">
          <h3 className="card-section-title">Quick Start</h3>
          <p className="body-text">
            Click <strong>New Scan</strong>, enter a target URL, monitor progress on the dashboard, and open any completed or stopped scan to review findings.
          </p>
        </div>
      )}
    </div>
  );
}