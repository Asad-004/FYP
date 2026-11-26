import React from 'react';
import VulnerabilityCard from './VulnerabilityCard';

export default function ScanResults({ scanResult, fallbackUrl }) {
  if (!scanResult) return null;

  const vulnerabilities = scanResult.vulnerabilities || [];
  const summary = scanResult.riskSummary || {};

  return (
    <section className="results-section">
      <div className="summary-card">
        <div>
          <span className="result-badge">
            {scanResult.stopped ? 'Partial Report (Stopped)' : 'Scan Completed'}
          </span>
          <h3 className="target-heading">{scanResult.targetUrl || fallbackUrl}</h3>
          {scanResult.scanTime && (
            <p className="meta-line">Duration: {scanResult.scanTime}</p>
          )}
        </div>

        <div className="counts-row">
          <div className="count-pill high">
            <span className="count-num">{summary.high ?? 0}</span>
            <span className="count-text">High</span>
          </div>
          <div className="count-pill medium">
            <span className="count-num">{summary.medium ?? 0}</span>
            <span className="count-text">Medium</span>
          </div>
          <div className="count-pill low">
            <span className="count-num">{summary.low ?? 0}</span>
            <span className="count-text">Low</span>
          </div>
        </div>
      </div>

      {vulnerabilities.length === 0 ? (
        <div className="status-card">
          <h3>No Vulnerabilities Reported</h3>
          <p>No security issues were returned for this target.</p>
        </div>
      ) : (
        <div className="findings-list">
          {vulnerabilities.map((vuln, idx) => (
            <VulnerabilityCard key={vuln.id ?? idx} vuln={vuln} />
          ))}
        </div>
      )}
    </section>
  );
}