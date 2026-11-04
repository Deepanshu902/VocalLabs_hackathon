/**
 * ReportPage.jsx — Shows AI judge scorecard + speech metrics.
 * Calls /end idempotently on mount. Includes email modal.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { api } from '../services/api';
import { ScoreCard } from '../components/ScoreCard';
import { MetricsPanel } from '../components/MetricsPanel';

/* ─── Email Modal ─────────────────────────────────────────── */
function EmailModal({ sessionId, onClose }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | failed | invalid
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) {
      setStatus('invalid');
      return;
    }
    setStatus('sending');
    try {
      const res = await api.emailScorecard(sessionId, email);
      if (res.sent) {
        setStatus('success');
        setMessage('Scorecard sent! Check your inbox.');
      } else {
        setStatus('failed');
        const err = res.error || '';
        if (/timeout|ETIMEDOUT|ECONNREFUSED|ESOCKET/i.test(err)) {
          setMessage('Email not sent: the free Render host blocks SMTP (email works when run locally). Scorecard is still saved.');
        } else if (err) {
          setMessage(`Email not sent: ${err}`);
        } else {
          setMessage('Email not sent: SMTP is not configured on the server.');
        }
      }
    } catch (err) {
      setStatus('failed');
      setMessage(err.message || 'Email send failed.');
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Email Scorecard">
      <div className="modal-box">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3 className="modal-title">📧 Email Scorecard</h3>

        {status === 'success' && (
          <div className="modal-result modal-result--success" role="status">
            <p>✅ {message}</p>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        )}

        {status === 'failed' && (
          <div className="modal-result modal-result--failed" role="alert">
            <p>⚠️ {message}</p>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        )}

        {(status === 'idle' || status === 'invalid' || status === 'sending') && (
          <form className="email-form" onSubmit={handleSend} noValidate>
            <label htmlFor="email-input" className="email-label">
              Enter your email address
            </label>
            <input
              id="email-input"
              ref={inputRef}
              type="email"
              className={`email-input ${status === 'invalid' ? 'email-input--error' : ''}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
              placeholder="you@example.com"
              disabled={status === 'sending'}
              autoComplete="email"
            />
            {status === 'invalid' && (
              <p className="email-error" role="alert">Please enter a valid email address.</p>
            )}
            <div className="email-form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={status === 'sending'}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Sending…' : 'Send Scorecard'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Report Page ─────────────────────────────────────────── */
export const ReportPage = () => {
  const { currentSession, setCurrentSession, resetSession, setActiveTab } = useSessionStore();
  const [loading, setLoading] = useState(!currentSession?.report);
  const [error, setError] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchReport = async () => {
      if (!currentSession?.sessionId) {
        setLoading(false);
        return;
      }

      // If report already populated in memory
      if (currentSession?.report?.overallScore) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await api.endSession(currentSession.sessionId);
        if (isMounted && res.success) {
          setCurrentSession({
            ...currentSession,
            metrics: res.metrics,
            report: res.report
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to generate report');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReport();

    return () => {
      isMounted = false;
    };
  }, [currentSession?.sessionId]);

  if (loading) {
    return (
      <div className="report-loading-container" role="status" aria-live="polite">
        <div className="deliberating-orb">
          <span className="gavel-icon" aria-hidden="true">⚖️</span>
        </div>
        <h2 className="loading-title">The Adjudicator is Deliberating...</h2>
        <p className="loading-desc">
          Analyzing transcript logic, checking unaddressed claims, and computing exact speech metrics.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card report-error-card" role="alert">
        <h3>Unable to Generate Scorecard</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={resetSession}>
          Return to Arena Setup
        </button>
      </div>
    );
  }

  return (
    <div className="report-page">
      {emailModalOpen && currentSession?.sessionId && (
        <EmailModal
          sessionId={currentSession.sessionId}
          onClose={() => setEmailModalOpen(false)}
        />
      )}

      <div className="card report-nav-header">
        <div className="report-title-meta">
          <div className="meta-badges">
            <span className="badge badge-active">Completed Debate</span>
            <span className="badge badge-side">
              Stance: {currentSession?.userSide?.toUpperCase() || 'AGAINST'}
            </span>
          </div>
          <h1 className="report-motion">{currentSession?.topic || 'Debate Session'}</h1>
        </div>

        <div className="report-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setEmailModalOpen(true)}
            disabled={!currentSession?.sessionId}
          >
            📧 Email Scorecard
          </button>
          <button className="btn btn-secondary" onClick={() => setActiveTab('history')}>
            View History Chart
          </button>
          <button className="btn btn-primary" onClick={resetSession}>
            Practice Another Motion 🎙️
          </button>
        </div>
      </div>

      <MetricsPanel metrics={currentSession?.metrics || {}} />
      <ScoreCard report={currentSession?.report || {}} />
    </div>
  );
};
