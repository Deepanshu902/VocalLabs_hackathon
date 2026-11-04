/**
 * ProgressChart.jsx — Recharts LineChart of overallScore per attempt.
 * Seeded sessions use a different dot colour and tooltip label.
 */

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Dot
} from 'recharts';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function CustomDot(props) {
  const { cx, cy, payload } = props;
  const isSeeded = payload?.isSeeded;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={6}
      fill={isSeeded ? '#f59e0b' : '#6366f1'}
      stroke={isSeeded ? '#d97706' : '#4f46e5'}
      strokeWidth={2}
    />
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      {d.isSeeded && <span className="badge badge-sample" style={{ marginBottom: 4, display: 'block' }}>Sample data</span>}
      <p className="tooltip-topic">{d.topic}</p>
      <p className="tooltip-score">Score: <strong>{d.score}</strong>/100</p>
      <p className="tooltip-date">{formatDate(d.date)}</p>
    </div>
  );
}

export function ProgressChart({ sessions }) {
  const data = sessions.map((s, i) => ({
    attempt: i + 1,
    score: s.report?.overallScore ?? null,
    topic: s.topic,
    date: s.startedAt,
    isSeeded: s.isSeeded
  })).filter(d => d.score !== null);

  if (data.length === 0) {
    return (
      <div className="card chart-empty">
        <p>No scored sessions yet. Complete a debate to see your progress here.</p>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h3>Score Progress</h3>
        <div className="chart-legend">
          <span className="legend-dot legend-dot--real" /> Your sessions
          <span className="legend-dot legend-dot--seeded" /> Sample data
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="attempt"
            tickFormatter={(v) => `#${v}`}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Good', position: 'right', fontSize: 11, fill: '#f59e0b' }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={<CustomDot />}
            activeDot={{ r: 8 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

