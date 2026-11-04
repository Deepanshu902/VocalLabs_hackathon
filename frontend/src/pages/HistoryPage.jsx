/**
 * HistoryPage.jsx — Fetches all sessions for this user (+ seeded ones)
 * and shows the ProgressChart + a sortable table.
 */

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { api } from '../services/api';
import { ProgressChart } from '../components/ProgressChart';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ScorePill({ score }) {
  if (score == null) return <span className="badge">—</span>;
  const cls = score >= 80 ? 'badge-won' : score >= 60 ? 'badge-active' : 'badge-lost';
  return <span className={`badge ${cls}`}>{score}/100</span>;
}

function WinnerBadge({ winner }) {
  if (!winner) return <span className="badge">—</span>;
  if (winner === 'user') return <span className="badge badge-won">You Won</span>;
  if (winner === 'opponent') return <span className="badge badge-lost">Opponent Won</span>;
  return <span className="badge">Draw</span>;
}

export const HistoryPage = () => {
  const { userKey, setActiveTab, setCurrentSession } = useSessionStore();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userKey) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.getSessions(userKey);
        if (alive) setSessions(res.sessions || []);
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load sessions');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userKey]);

  const handleViewReport = (session) => {
    setCurrentSession({
      sessionId: session._id,
      topic: session.topic,
      userSide: session.userSide,
      metrics: session.metrics,
      report: session.report
    });
    setActiveTab('report');
  };

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h2>Attempt-over-Attempt Progress</h2>
          <p className="subtitle">Track your delivery pace, filler frequency, and argumentation scores over time.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setActiveTab('setup')}>
          New Debate Session
        </button>
      </div>

      {loading && (
        <div className="card history-loading" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p>Loading your sessions…</p>
        </div>
      )}

      {error && (
        <div className="card history-error" role="alert">
          <p>⚠️ {error}</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <ProgressChart sessions={sessions} />

          {sessions.length === 0 ? (
            <div className="card history-empty">
              <p>No debates yet — start your first! 🎙️</p>
            </div>
          ) : (
            <div className="card history-table-card">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Motion (truncated)</th>
                    <th>Date</th>
                    <th>Stance</th>
                    <th>Score</th>
                    <th>Result</th>
                    <th>Label</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => (
                    <tr key={s._id} className={s.isSeeded ? 'row-seeded' : ''}>
                      <td>{i + 1}</td>
                      <td className="col-topic" title={s.topic}>
                        {s.topic?.length > 55 ? s.topic.slice(0, 52) + '…' : s.topic}
                      </td>
                      <td>{formatDate(s.startedAt)}</td>
                      <td><span className="badge badge-side">{(s.userSide || '').toUpperCase()}</span></td>
                      <td><ScorePill score={s.report?.overallScore} /></td>
                      <td><WinnerBadge winner={s.report?.verdict?.winner} /></td>
                      <td>
                        {s.isSeeded
                          ? <span className="badge badge-sample">Sample data</span>
                          : <span className="badge badge-active">Your session</span>}
                      </td>
                      <td>
                        {s.report?.overallScore != null && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleViewReport(s)}
                          >
                            View Report
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
