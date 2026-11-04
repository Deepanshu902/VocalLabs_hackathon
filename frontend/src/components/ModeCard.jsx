import React from 'react';

export const ModeCard = ({ mode, isSelected, onSelect }) => {
  const { id, label, description, active, badge } = mode;

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={active ? 0 : -1}
      className={`card mode-card ${isSelected ? 'selected' : ''} ${!active ? 'disabled' : ''}`}
      onClick={() => active && onSelect(id)}
      onKeyDown={(e) => {
        if (active && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(id);
        }
      }}
    >
      <div className="mode-card-header">
        <div className="mode-card-title-group">
          <span className="mode-icon">{id === 'debate' ? '⚖️' : '💡'}</span>
          <h3 className="mode-title">{label}</h3>
        </div>
        {badge ? (
          <span className="badge badge-sample">{badge}</span>
        ) : (
          <span className="badge badge-active">Active</span>
        )}
      </div>
      <p className="mode-description">{description}</p>
    </div>
  );
};

