import React from 'react';
import { formatEta } from '../hooks/useScanManager';
import { StopIcon } from './Icons';

export default function ScanProgressCard({ scanProgress, stopping, onStop }) {
  const pct = Math.min(100, Math.max(0, Number(scanProgress?.progress ?? 0)));

  return (
    <div className="tl-card live-scan-card">
      <div className="live-scan-top">
        <div>
          <span className="live-phase-pill">{scanProgress?.phase || 'Scanning'}</span>
          <h3 className="live-scan-title">Scanning Target URL</h3>
        </div>

        <button
          type="button"
          onClick={onStop}
          disabled={stopping}
          className="btn-stop-scan"
        >
          <StopIcon size={14} />
          <span>{stopping ? 'Stopping & Generating Report...' : 'Stop Scan'}</span>
        </button>
      </div>

      <div className="live-progress-track">
        <div className="live-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="live-scan-meta">
        <div className="meta-item">
          <span className="meta-label">Completion</span>
          <strong className="meta-val cyan-accent">{pct}%</strong>
        </div>
        <div className="meta-item">
          <span className="meta-label">Estimated Time Left</span>
          <strong className="meta-val">{formatEta(scanProgress?.estimatedRemainingSec)}</strong>
        </div>
        <div className="meta-item wide">
          <span className="meta-label">Currently Scanning / Rule</span>
          <strong className="meta-val">{scanProgress?.currentItem || 'Preparing scan...'}</strong>
        </div>
      </div>
    </div>
  );
}