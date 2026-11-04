import React, { useEffect, useRef } from 'react';

export const Transcript = ({ turns = [], interimTranscript = '', isListening = false }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, interimTranscript]);

  return (
    <div className="transcript-container" aria-label="Debate Transcript" role="log" aria-live="polite">
      {turns.length === 0 && !interimTranscript && (
        <div className="transcript-empty">
          <p>The AI opponent will deliver the opening statement shortly...</p>
        </div>
      )}

      {turns.map((turn, index) => {
        const isUser = turn.role === 'user';
        return (
          <div
            key={index}
            className={`transcript-message-row ${isUser ? 'user-row' : 'assistant-row'}`}
          >
            <div className={`transcript-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
              <div className="bubble-header">
                <span className="bubble-speaker">
                  {isUser ? 'You (Candidate)' : 'AI Opponent'}
                </span>
                {!isUser && turn.source === 'fallback' && (
                  <span className="badge badge-fallback">AI fallback used</span>
                )}
                {!isUser && turn.source === 'gemini' && turn.timing?.latencyMs > 0 && (
                  <span className="bubble-latency">{turn.timing.latencyMs}ms</span>
                )}
                {turn.timing?.turnDurationMs && (
                  <span className="bubble-timing">
                    {Math.round(turn.timing.turnDurationMs / 1000)}s
                  </span>
                )}
              </div>
              <p className="bubble-text">{turn.text}</p>
            </div>
          </div>
        );
      })}

      {/* Real-time Interim User Speech */}
      {isListening && interimTranscript && (
        <div className="transcript-message-row user-row interim-row">
          <div className="transcript-bubble user-bubble interim-bubble">
            <div className="bubble-header">
              <span className="bubble-speaker">You (Speaking...)</span>
            </div>
            <p className="bubble-text interim-text">
              {interimTranscript}
              <span className="blinking-cursor">|</span>
            </p>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

