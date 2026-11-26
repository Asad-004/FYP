// src/components/HelpPage.jsx
import React from 'react';

export default function HelpPage() {
  return (
    <section className="panel-card">
      <h2>Help &amp; Usage Guide</h2>
      <p className="panel-subtitle">
        How to navigate and use each section of ThreatLens Auditor.
      </p>

      <div className="help-grid">
        <div className="help-item">
          <h3>Dashboard</h3>
          <p>
            Enter a target URL and click <strong>Run Scan</strong>. Track percentage progress,
            estimated remaining time, and active rule/item, or click <strong>Stop Scan</strong> to
            halt ZAP and view a report.
          </p>
        </div>

        <div className="help-item">
          <h3>Scan History</h3>
          <p>
            Review past scans saved locally in your browser and click{' '}
            <strong>View Report</strong> to reopen any scan in the Dashboard.
          </p>
        </div>

        <div className="help-item">
          <h3>Configuration</h3>
          <p>
            Update the scan service URL, adjust request timeout limits, or toggle automatic
            scan history recording.
          </p>
        </div>

        <div className="help-item">
          <h3>AI Engine</h3>
          <p>
            Tracks suggestion integration status. Kept disabled until a reliable free
            open-source API is added.
          </p>
        </div>
      </div>
    </section>
  );
}