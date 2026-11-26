// src/components/HistoryPage.jsx
import React from 'react';

export default function HistoryPage({ history, onOpenItem, onClear }) {
  return (
    <section className="panel-card">
      <div className="panel-header-row">
        <div>
          <h2>Scan History</h2>
          <p className="panel-subtitle">Previously completed or stopped target scans stored in this browser.</p>
        </div>
        {history.length > 0 && (
          <button type="button" onClick={onClear} className="secondary-btn">
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <p>No saved scans yet. Run a scan from Dashboard to build your history.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div>
                <h3 className="history-url">{item.targetUrl}</h3>
                <p className="history-meta">
                  {item.timestamp} • {item.stopped ? 'Stopped • ' : ''}
                  {item.vulnerabilities.length} finding(s) • High: {item.riskSummary?.high ?? 0}, Medium:{' '}
                  {item.riskSummary?.medium ?? 0}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenItem(item)}
                className="scan-btn compact-btn"
              >
                View Report
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}