import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'history', label: 'Scan History' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'ai-engine', label: 'AI Engine' },
  { id: 'help', label: 'Help' },
];

export default function Navbar({ activePage, setActivePage, historyCount }) {
  return (
    <header className="top-bar">
      <div className="brand-block">
        <div className="brand-mark">🛡️</div>
        <div>
          <h1 className="brand-title">ThreatLens Auditor</h1>
          <p className="brand-subtitle">Web Vulnerability Assessment Workspace</p>
        </div>
      </div>

      <nav className="nav-tabs" aria-label="Primary Navigation">
        {NAV_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActivePage(tab.id)}
            className={`nav-btn ${activePage === tab.id ? 'active' : ''}`}
          >
            {tab.label}
            {tab.id === 'history' && historyCount > 0 ? ` (${historyCount})` : ''}
          </button>
        ))}
      </nav>
    </header>
  );
}