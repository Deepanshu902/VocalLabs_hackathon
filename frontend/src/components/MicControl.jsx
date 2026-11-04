import React, { useState } from 'react';

export const MicControl = ({
  voiceState,
  isMicActive = false,
  isSupported = true,
  onDoneSpeaking,
  onTypeFallbackSubmit
}) => {
  const [showTypeInput, setShowTypeInput] = useState(false);
  const [typedText, setTypedText] = useState('');

  const isListening = voiceState === 'LISTENING';

  const handleFallbackSubmit = (e) => {
    e.preventDefault();
    if (typedText.trim() && onTypeFallbackSubmit) {
      onTypeFallbackSubmit(typedText.trim());
      setTypedText('');
      setShowTypeInput(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="mic-banner mic-banner-error" role="alert">
        <strong>Browser Not Supported:</strong> Web Speech API is only available in Google Chrome desktop. Please open this app in Google Chrome.
      </div>
    );
  }

  return (
    <div className="mic-control-wrapper">
      <div className="mic-main-bar">
        <div className={`mic-indicator-ring ${isMicActive ? 'listening-ring' : ''}`}>
          <span className="mic-icon" aria-hidden="true">
            {isMicActive ? '🎙️' : '🔇'}
          </span>
        </div>

        <div className="mic-instructions">
          <div className="mic-status-header">
            <span
              className={`mic-state-pill ${isMicActive ? 'mic-state-on' : 'mic-state-off'}`}
              aria-live="polite"
            >
              <span className="mic-dot" aria-hidden="true" />
              Mic: {isMicActive ? 'ON' : 'OFF'}
            </span>
          </div>
          {isListening ? (
            <p className="instruction-text highlight-pulse">
              Speak now in English... (turn ends after 2.5s silence or click below)
            </p>
          ) : voiceState === 'AI_SPEAKING' ? (
            <p className="instruction-text">Microphone is dormant while opponent speaks...</p>
          ) : voiceState === 'PROCESSING' ? (
            <p className="instruction-text">Processing your argument and timing metrics...</p>
          ) : (
            <p className="instruction-text">Waiting to begin next turn...</p>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary done-speaking-btn"
          disabled={!isListening}
          onClick={onDoneSpeaking}
          aria-label="Done speaking. Submit current turn immediately"
        >
          Done Speaking (Submit Turn) ✓
        </button>
      </div>

      <div className="mic-fallback-row">
        {!showTypeInput ? (
          <button
            type="button"
            className="fallback-link-btn"
            onClick={() => setShowTypeInput(true)}
          >
            Emergency fallback: Type response instead
          </button>
        ) : (
          <form onSubmit={handleFallbackSubmit} className="type-fallback-form">
            <span className="badge badge-sample">Demo Fallback</span>
            <input
              type="text"
              className="type-fallback-input"
              placeholder="Type your argument if microphone is unavailable..."
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!typedText.trim()}>
              Send
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowTypeInput(false)}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
