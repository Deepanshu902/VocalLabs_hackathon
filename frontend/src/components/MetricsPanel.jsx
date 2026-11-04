import React from 'react';

export const MetricsPanel = ({ metrics = {} }) => {
  const {
    avgWpm = 0,
    avgLatencyMs = 0,
    totalFillers = 0,
    fillerCounts = {},
    totalHedges = 0,
    hedgeCounts = {},
    avgAnswerWords = 0,
    longestAnswerWords = 0
  } = metrics;

  const getPaceStatus = (wpm) => {
    if (wpm < 110) return { label: 'Deliberate', color: 'var(--text-secondary)' };
    if (wpm <= 165) return { label: 'Optimal Pace', color: 'var(--accent-success)' };
    return { label: 'Rapid Delivery', color: 'var(--accent-warning)' };
  };

  const paceInfo = getPaceStatus(avgWpm);

  return (
    <div className="card metrics-panel">
      <div className="panel-header">
        <h3 className="panel-title">Speech & Delivery Mechanics</h3>
        <span className="badge badge-active">Code-Measured</span>
      </div>

      <div className="metrics-grid">
        <div className="metric-box">
          <span className="metric-label">Speaking Pace</span>
          <div className="metric-value-row">
            <span className="metric-number">{avgWpm}</span>
            <span className="metric-unit">WPM</span>
          </div>
          <span className="metric-tag" style={{ color: paceInfo.color }}>{paceInfo.label}</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Thinking Pause</span>
          <div className="metric-value-row">
            <span className="metric-number">{(avgLatencyMs / 1000).toFixed(1)}</span>
            <span className="metric-unit">sec</span>
          </div>
          <span className="metric-tag">Avg Latency</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Filler Words</span>
          <div className="metric-value-row">
            <span className="metric-number">{totalFillers}</span>
            <span className="metric-unit">total</span>
          </div>
          <span className="metric-tag">{totalFillers === 0 ? 'Clean Delivery' : `${totalFillers} detected`}</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Hedge Phrases</span>
          <div className="metric-value-row">
            <span className="metric-number">{totalHedges}</span>
            <span className="metric-unit">total</span>
          </div>
          <span className="metric-tag">{totalHedges > 0 ? 'Weakens Authority' : 'Assertive'}</span>
        </div>
      </div>

      {/* Filler word pill breakdown */}
      {totalFillers > 0 && (
        <div className="filler-breakdown-row">
          <span className="breakdown-label">Detected Fillers:</span>
          <div className="filler-pills">
            {Object.entries(fillerCounts)
              .filter(([_, count]) => count > 0)
              .map(([word, count]) => (
                <span key={word} className="filler-pill">
                  "{word}": <strong>{count}</strong>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Hedge word pill breakdown */}
      {totalHedges > 0 && (
        <div className="filler-breakdown-row">
          <span className="breakdown-label">Detected Hedges:</span>
          <div className="filler-pills">
            {Object.entries(hedgeCounts)
              .filter(([_, count]) => count > 0)
              .map(([phrase, count]) => (
                <span key={phrase} className="filler-pill">
                  "{phrase}": <strong>{count}</strong>
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="panel-footer-note">
        <span className="note-icon" aria-hidden="true">ℹ️</span>
        <p className="note-text">
          <strong>Honesty Disclaimer:</strong> Filler counts depend on browser speech recognition and may undercount true vocalized pauses like "um/uh". Indian colloquialisms ("matlab", "basically", "like") and hedges are tracked deterministically without AI estimation.
        </p>
      </div>
    </div>
  );
};

