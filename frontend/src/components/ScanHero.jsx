import React from 'react';
import { BoltIcon } from './Icons';

export default function ScanHero({ url, setUrl, loading, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="scan-hero-form">
      <h2 className="scan-hero-title">Target Vulnerability Scan</h2>
      <p className="scan-hero-subtitle">
        Enter an authorized target URL to run an automated security assessment and inspect categorized findings.
      </p>

      <div className="scan-input-row">
        <input
          type="url"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="tl-input scan-url-input"
        />
        <button type="submit" disabled={loading} className="btn-cyan-primary scan-submit-btn">
          <BoltIcon size={15} />
          <span>{loading ? 'Scanning...' : 'Run Scan'}</span>
        </button>
      </div>
    </form>
  );
}