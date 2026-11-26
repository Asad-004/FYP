import React, { useState } from 'react';
import ScanProgressCard from './ScanProgressCard';

function VulnerabilityLineGraph({ history, totals, totalFindings, onInspect }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const seriesConfig = [
    { key: 'high', label: 'High', color: '#dc2626' },
    { key: 'medium', label: 'Medium', color: '#d97706' },
    { key: 'low', label: 'Low / Info', color: '#2563eb' },
  ];

  // Chronological order (oldest -> newest) for trend lines; duplicate single point if only 1 scan exists
  const orderedScans = [...history].reverse();
  const pointsSource =
    orderedScans.length >= 2
      ? orderedScans.slice(-8)
      : orderedScans.length === 1
      ? [
          { ...orderedScans[0], _label: 'Start', _zeroBaseline: true },
          { ...orderedScans[0], _label: orderedScans[0].scannedAt || 'Latest' },
        ]
      : [
          { _label: 'Run 1', riskSummary: { high: 0, medium: 0, low: 0 } },
          { _label: 'Run 2', riskSummary: totals },
        ];

  const allValues = pointsSource.flatMap((scan) =>
    scan._zeroBaseline
      ? [0]
      : [
          scan.riskSummary?.high || 0,
          scan.riskSummary?.medium || 0,
          scan.riskSummary?.low || 0,
        ]
  );
  const maxY = Math.max(1, ...allValues);

  const svgWidth = 620;
  const svgHeight = 152;
  const padLeft = 34;
  const padRight = 18;
  const padTop = 14;
  const padBottom = 26;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const getX = (index) => {
    if (pointsSource.length <= 1) return padLeft + plotW / 2;
    return padLeft + (index / (pointsSource.length - 1)) * plotW;
  };

  const getY = (val) => {
    return padTop + plotH - (val / maxY) * plotH;
  };

  const yTicks = [0, 0.5, 1].map((ratio) => Math.round(maxY * ratio));

  return (
    <div className="vuln-line-wrap">
      <div className="vuln-line-toolbar">
        <div className="vuln-legend">
          {seriesConfig.map((s) => (
            <span key={s.key} className="vuln-legend-item">
              <span
                className="vuln-legend-dot"
                style={{ backgroundColor: s.color }}
              />
              {s.label}: <strong>{totals[s.key] || 0}</strong>
            </span>
          ))}
        </div>

        <span className="vuln-line-status">
          {hoveredPoint
            ? `${hoveredPoint.seriesLabel} — ${hoveredPoint.value} (${hoveredPoint.scanLabel})`
            : `Total: ${totalFindings} across ${history.length} scan${
                history.length === 1 ? '' : 's'
              }`}
        </span>
      </div>

      <svg
        className="vuln-line-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="Vulnerability severity line graph"
      >
        {/* Horizontal gridlines & Y-axis labels */}
        {yTicks.map((tickVal, idx) => {
          const y = getY(tickVal);
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={svgWidth - padRight}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray={tickVal === 0 ? undefined : '3 3'}
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
              >
                {tickVal}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {pointsSource.map((scan, idx) => {
          const x = getX(idx);
          const rawLabel =
            scan._label || scan.targetUrl?.replace(/^https?:\/\//, '') || `#${idx + 1}`;
          const shortLabel =
            rawLabel.length > 14 ? `${rawLabel.slice(0, 13)}…` : rawLabel;

          return (
            <text
              key={idx}
              x={x}
              y={svgHeight - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#6b7280"
            >
              {shortLabel}
            </text>
          );
        })}

        {/* Series polylines & data points */}
        {seriesConfig.map((series) => {
          const coords = pointsSource.map((scan, idx) => {
            const val = scan._zeroBaseline ? 0 : scan.riskSummary?.[series.key] || 0;
            return {
              x: getX(idx),
              y: getY(val),
              value: val,
              scanLabel: scan.targetUrl || scan._label || `Scan ${idx + 1}`,
            };
          });

          const polylinePoints = coords.map((p) => `${p.x},${p.y}`).join(' ');

          return (
            <g key={series.key}>
              <polyline
                fill="none"
                stroke={series.color}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />

              {coords.map((pt, idx) => {
                const isHovered =
                  hoveredPoint?.seriesKey === series.key && hoveredPoint?.index === idx;
                return (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5 : 3.5}
                    fill="#ffffff"
                    stroke={series.color}
                    strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() =>
                      setHoveredPoint({
                        seriesKey: series.key,
                        seriesLabel: series.label,
                        index: idx,
                        value: pt.value,
                        scanLabel: pt.scanLabel,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={onInspect}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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
                <VulnerabilityLineGraph
                  history={history}
                  totals={totals}
                  totalFindings={totalFindings}
                  onInspect={() => onNavigate('findings')}
                />
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