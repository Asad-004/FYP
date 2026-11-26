import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldIcon } from './Icons';

export default function TopHeader({ onToggleSidebar, onNavigate }) {
  const { currentUser, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(null);
  const headerRef = useRef(null);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTopNavigate = (page) => {
    if (isAdmin) {
      onNavigate('admin');
      return;
    }
    onNavigate(page);
  };

  const resources = [
    { title: 'Docs', desc: 'Guides for launching scans and reading reports.', page: 'help' },
    { title: 'Changelog', desc: 'Recent platform and detection rule updates.', page: 'dashboard' },
    { title: 'API Reference', desc: 'Configure scanner endpoints and timeouts.', page: 'configuration' },
    { title: 'Findings Guide', desc: 'Review categorized vulnerability findings.', page: 'findings' },
  ];

  return (
    <header className="tl-topbar" ref={headerRef}>
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn"
          aria-label="Toggle Sidebar"
          onClick={onToggleSidebar}
        >
          ☰
        </button>
        <div className="topbar-brand" onClick={() => handleTopNavigate('dashboard')}>
          <span className="cyan-accent">
            <ShieldIcon size={18} />
          </span>
          <span className="topbar-title">
            ThreatLens <span className="cyan-accent">Auditor</span>
          </span>
        </div>
      </div>

      <div className="topbar-right">
        {!isAdmin && (
          <div className="dropdown-anchor">
            <button
              type="button"
              className="topbar-menu-btn"
              onClick={() => setOpenMenu(openMenu === 'resources' ? null : 'resources')}
            >
              RESOURCES
            </button>
            {openMenu === 'resources' && (
              <div className="tl-dropdown resources-dropdown">
                {resources.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="dropdown-resource-item"
                    onClick={() => {
                      handleTopNavigate(item.page);
                      setOpenMenu(null);
                    }}
                  >
                    <div className="resource-title">{item.title}</div>
                    <div className="resource-desc">{item.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="dropdown-anchor">
          <button
            type="button"
            className="topbar-menu-btn account-trigger"
            onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
          >
            <span className="avatar-circle">
              {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </button>

          {openMenu === 'account' && (
            <div className="tl-dropdown account-dropdown">
              <div className="profile-progress-card">
                <div className="completion-ring">{currentUser?.profileCompletion || 75}%</div>
                <div>
                  <div className="profile-prompt">{currentUser?.name}</div>
                  <div className="profile-role-tag">Role: {currentUser?.role?.toUpperCase()}</div>
                </div>
              </div>

              {!isAdmin && (
                <button
                  type="button"
                  className="account-action-row"
                  onClick={() => {
                    handleTopNavigate('configuration');
                    setOpenMenu(null);
                  }}
                >
                  <span className="account-main-label">My account</span>
                  <span className="account-subname">{currentUser?.email}</span>
                </button>
              )}

              <button
                type="button"
                className="account-action-row danger"
                onClick={() => {
                  setOpenMenu(null);
                  logout();
                }}
              >
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}