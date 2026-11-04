import React from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { useVoiceLoop } from '../hooks/useVoiceLoop';
import { StatusBadge } from '../components/StatusBadge';
import { Transcript } from '../components/Transcript';
import { MicControl } from '../components/MicControl';

export const DebatePage = () => {
  const { currentSession, resetSession, setActiveTab, setCurrentSession } = useSessionStore();

  const openingLine =
    currentSession?.openingLine ||
    `Welcome to the arena. The motion is: "${currentSession?.topic || 'Selected Motion'}". You are arguing ${currentSession?.userSide?.toUpperCase() || 'AGAINST'}. Please state your opening argument.`;

  const handleSessionComplete = () => {
    // In Phase 2, navigate to Report placeholder
    setTimeout(() => {
      setActiveTab('report');
    }, 1200);
  };

  const {
    voiceState,
    isMicActive,
    turns,
    interimTranscript,
    turnIndex,
    maxTurns,
    isSupported,
    handleDoneSpeaking,
    handleTypeFallback
  } = useVoiceLoop({
    sessionId: currentSession?.sessionId,
    initialOpeningLine: openingLine,
    onSessionComplete: handleSessionComplete
  });

  return (
    <div className="debate-page">
      <div className="card debate-arena-header">
        <div className="debate-meta">
          <div className="meta-badges">
            <span className="badge badge-active">Live Debate</span>
            <span className="badge badge-sample">Turn {Math.min(turnIndex + 1, maxTurns)} of {maxTurns}</span>
            <span className="badge badge-side">
              You: {currentSession?.userSide?.toUpperCase() || 'AGAINST'}
            </span>
            <span className={`badge ${isMicActive ? 'badge-mic-on' : 'badge-mic-off'}`}>
              Mic: {isMicActive ? 'ON' : 'OFF'}
            </span>
          </div>
          <h2 className="debate-arena-motion">{currentSession?.topic || 'Debate Motion'}</h2>
        </div>

        <div className="header-actions">
          <StatusBadge state={voiceState} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetSession}>
            Exit Arena
          </button>
        </div>
      </div>

      <div className="card transcript-card">
        <Transcript
          turns={turns}
          interimTranscript={interimTranscript}
          isListening={voiceState === 'LISTENING'}
        />
      </div>

      <div className="card mic-dock-card">
        <MicControl
          voiceState={voiceState}
          isMicActive={isMicActive}
          isSupported={isSupported}
          onDoneSpeaking={handleDoneSpeaking}
          onTypeFallbackSubmit={handleTypeFallback}
        />
      </div>
    </div>
  );
};
