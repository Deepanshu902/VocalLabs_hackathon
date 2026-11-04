import React, { useEffect } from 'react';
import { useSessionStore } from './store/useSessionStore';
import { api } from './services/api';
import { TopNav } from './components/TopNav';
import { SetupPage } from './pages/SetupPage';
import { DebatePage } from './pages/DebatePage';
import { ReportPage } from './pages/ReportPage';
import { HistoryPage } from './pages/HistoryPage';
import './App.css';

export function App() {
  const {
    activeTab,
    setActiveTab,
    serverStatus,
    setServerStatus,
    dbStatus,
    setSystemHealth,
    setCurrentSession,
    userKey
  } = useSessionStore();

  useEffect(() => {
    let isMounted = true;
    const probeHealth = async () => {
      try {
        const res = await api.checkHealth();
        if (isMounted && res.status === 'ok') {
          setServerStatus('connected');
          setSystemHealth({ db: res.db, gemini: res.gemini });
        }
      } catch (err) {
        if (isMounted) {
          setServerStatus('disconnected');
        }
      }
    };

    probeHealth();
    const interval = setInterval(probeHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setServerStatus, setSystemHealth]);

  const handleStartSession = async ({ mode, topic, userSide }) => {
    try {
      const res = await api.startSession({ mode, topic, userSide, userKey });
      setCurrentSession({
        sessionId: res.sessionId,
        openingLine: res.openingLine,
        mode,
        topic,
        userSide,
        userKey,
        turns: []
      });
      setActiveTab('debate');
    } catch (err) {
      console.error('Failed to start session:', err);
      // Fallback if backend is running in degraded mode
      setCurrentSession({
        sessionId: 'local_' + Date.now(),
        openingLine: `Welcome to the debate arena. The motion before us is: "${topic}". You are arguing ${userSide.toUpperCase()}. Please state your opening argument.`,
        mode,
        topic,
        userSide,
        userKey,
        turns: []
      });
      setActiveTab('debate');
    }
  };

  return (
    <div className="app-container">
      <TopNav />
      {dbStatus === 'memory' && (
        <div className="system-alert-banner memory-warning" role="alert">
          <span className="alert-icon" aria-hidden="true">⚠️</span>
          <span>
            <strong>Memory Mode Warning:</strong> Database is running in memory mode (sessions will not be permanently saved).
          </span>
        </div>
      )}
      <main className="main-content" id="main-content">
        {activeTab === 'setup' && <SetupPage onStart={handleStartSession} />}
        {activeTab === 'debate' && <DebatePage />}
        {activeTab === 'report' && <ReportPage />}
        {activeTab === 'history' && <HistoryPage />}
      </main>
    </div>
  );
}

export default App;

