import React from 'react';

const STATUS_CONFIG = {
  IDLE: {
    label: 'Ready',
    badgeClass: 'badge-idle',
    icon: '⏳'
  },
  AI_SPEAKING: {
    label: 'AI Opponent Speaking',
    badgeClass: 'badge-speaking',
    icon: '🔊'
  },
  LISTENING: {
    label: 'Listening to You...',
    badgeClass: 'badge-listening',
    icon: '🎙️'
  },
  PROCESSING: {
    label: 'AI Formulating Counter...',
    badgeClass: 'badge-processing',
    icon: '⚡'
  },
  ENDED: {
    label: 'Debate Concluded',
    badgeClass: 'badge-ended',
    icon: '🏁'
  }
};

export const StatusBadge = ({ state = 'IDLE' }) => {
  const config = STATUS_CONFIG[state] || STATUS_CONFIG.IDLE;

  return (
    <div className={`status-pill ${config.badgeClass}`} role="status" aria-live="polite">
      <span className="status-pill-icon" aria-hidden="true">{config.icon}</span>
      <span className="status-pill-text">{config.label}</span>
      {state === 'LISTENING' && <span className="pulsing-recording-dot" aria-hidden="true" />}
    </div>
  );
};

