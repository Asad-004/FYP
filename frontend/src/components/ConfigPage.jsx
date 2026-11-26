// src/components/ConfigPage.jsx
import React from 'react';

export default function ConfigPage({ config, setConfig, onSave, savedNotice }) {
  return (
    <section className="panel-card">
      <h2>Configuration</h2>
      <p className="panel-subtitle">
        Manage scan request settings and local history preferences.
      </p>

      <form onSubmit={onSave} className="config-form">
        <div className="field-group">
          <label htmlFor="apiEndpoint">Scan Service URL</label>
          <input
            id="apiEndpoint"
            type="url"
            required
            value={config.apiEndpoint}
            onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })}
            className="scan-input"
          />
        </div>

        <div className="field-group">
          <label htmlFor="timeoutSeconds">Request Timeout (seconds)</label>
          <input
            id="timeoutSeconds"
            type="number"
            min={5}
            max={600}
            value={config.timeoutSeconds}
            onChange={(e) => setConfig({ ...config, timeoutSeconds: e.target.value })}
            className="scan-input"
          />
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={config.saveHistory}
            onChange={(e) => setConfig({ ...config, saveHistory: e.target.checked })}
          />
          <span>Automatically save completed/stopped scans to Scan History</span>
        </label>

        <div className="form-actions">
          <button type="submit" className="scan-btn">
            Save Configuration
          </button>
          {savedNotice && <span className="saved-tag">Saved</span>}
        </div>
      </form>
    </section>
  );
}