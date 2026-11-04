import React from 'react';
import { useSessionStore } from '../store/useSessionStore';

export const TopNav = () => {
  const { activeTab, setActiveTab, serverStatus } = useSessionStore();

  const getStatusColor = () => {
    if (serverStatus === 'connected') return 'var(--accent-success)';
    if (serverStatus === 'disconnected') return 'var(--accent-danger)';
    return 'var(--accent-warning)';
  };

  return (
    <header className="topnav" role="banner">
      <div className="topnav-inner">
        <div className="brand" tabIndex={0} onClick={() => setActiveTab('setup')}>
          <div className="brand-logo" aria-hidden="true">🎙️</div>
          <div className="brand-text">
            <span className="brand-title">VoiceCoach</span>
            <span className="brand-subtitle">AI Debate Sparring</span>
          </div>
        </div>

        <nav className="topnav-links" aria-label="Main Navigation">
          <button
            className={`nav-link ${activeTab === 'setup' || activeTab === 'debate' ? 'active' : ''}`}
            onClick={() => setActiveTab('setup')}
            aria-current={activeTab === 'setup' || activeTab === 'debate' ? 'page' : undefined}
          >
            Debate Arena
          </button>
          <button
            className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            aria-current={activeTab === 'history' ? 'page' : undefined}
          >
            Progress & History
          </button>
        </nav>

        <div className="system-status" aria-live="polite">
          <span
            className="status-dot"
            style={{ backgroundColor: getStatusColor() }}
            aria-hidden="true"
          />
          <span className="status-label">
            {serverStatus === 'connected'
              ? 'Backend Online'
              : serverStatus === 'disconnected'
              ? 'Backend Offline'
              : 'Checking API...'}
          </span>
        </div>
      </div>
    </header>
  );
};

