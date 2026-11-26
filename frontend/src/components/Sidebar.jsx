import React from 'react';
import {
  BoltIcon,
  GridIcon,
  TargetIcon,
  BugIcon,
  CompassIcon,
  FileIcon,
  SettingsIcon,
  HelpIcon,
  CrownIcon,
} from './Icons';

export default function Sidebar({
  activePage,
  setActivePage,
  onNewScanClick,
  workspace,
  setWorkspace,
  assetsCount,
  findingsCount,
  isAdmin,
  collapsed,
}) {
  if (isAdmin) {
    return (
      <aside className={`tl-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <nav className="sidebar-nav" aria-label="Admin Navigation">
          {!collapsed && <div className="sidebar-group-label admin-label">ADMINISTRATION</div>}
          <button
            type="button"
            className="sidebar-item admin-nav-item active"
            onClick={() => setActivePage('admin')}
          >
            <span className="sidebar-icon">
              <CrownIcon />
            </span>
            {!collapsed && <span className="sidebar-text">Admin Dashboard</span>}
          </button>
        </nav>
      </aside>
    );
  }

  const primaryItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <GridIcon /> },
    { id: 'assets', label: 'Assets', icon: <TargetIcon />, badge: assetsCount },
    { id: 'scans', label: 'Scans', icon: <BoltIcon /> },
    { id: 'findings', label: 'Findings', icon: <BugIcon />, badge: findingsCount > 0 ? findingsCount : null },
    { id: 'attack-surface', label: 'Attack Surface', icon: <CompassIcon /> },
  ];

  const configItems = [
    { id: 'reports', label: 'Reports', icon: <FileIcon /> },
    { id: 'configuration', label: 'Configuration', icon: <SettingsIcon /> },
    { id: 'help', label: 'Help & Docs', icon: <HelpIcon /> },
  ];

  return (
    <aside className={`tl-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-cta-wrap">
        <button type="button" className="btn-cyan-primary new-scan-cta" onClick={onNewScanClick}>
          <BoltIcon size={15} />
          {!collapsed && <span>New scan</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="sidebar-section">
          <span className="sidebar-group-label">WORKSPACES</span>
          <select
            aria-label="Select Workspace"
            className="workspace-select"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
          >
            <option value="My Workspace">My Workspace</option>
            <option value="Production Targets">Production Targets</option>
            <option value="Staging & QA">Staging & QA</option>
          </select>
        </div>
      )}

      <nav className="sidebar-nav" aria-label="Workspace Navigation">
        {primaryItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-text">{item.label}</span>}
            {!collapsed && item.badge !== undefined && item.badge !== null && (
              <span className="sidebar-badge">{item.badge}</span>
            )}
          </button>
        ))}

        {!collapsed && <div className="sidebar-group-label mt-section">CONFIGURATIONS</div>}

        {configItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-text">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}