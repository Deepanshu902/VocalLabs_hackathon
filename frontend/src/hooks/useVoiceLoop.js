import { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechRecognitionService } from '../services/speechRecognition';
import { speechSynthesisService } from '../services/speechSynthesis';
import { api } from '../services/api';

const SILENCE_TIMEOUT_MS = 2500;
const NO_SPEECH_TIMEOUT_MS = 10000;
const POST_SPEECH_DELAY_MS = 500;
const MAX_DEMO_TURNS = 3;

const MOCK_REBUTTALS = [
  "You argue for student autonomy, but without core fundamentals verified without generative AI, future engineering graduates will lack genuine problem-solving intuition. How do you address that skill degradation?",
  "While banning tools may seem difficult to enforce, universities already enforce honor codes and proctored environments. Why should code generation be treated any differently than copy-pasting existing solutions?",
  "Thank you for this spirited debate. Both sides have presented critical arguments. The session has now concluded and your scorecard is being prepared."
];

export const isEchoOfAi = (userText, aiText) => {
  if (!userText || !aiText) return false;
  const cleanUser = userText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const cleanAi = aiText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (!cleanUser) return true;
  if (cleanAi.includes(cleanUser)) return true;

  const userWords = cleanUser.split(/\s+/).filter(Boolean);
  const aiWords = new Set(cleanAi.split(/\s+/).filter(Boolean));
  if (userWords.length === 0) return true;

  const matchingWords = userWords.filter((w) => aiWords.has(w)).length;
  return matchingWords / userWords.length >= 0.65;
};

export const useVoiceLoop = ({ sessionId, initialOpeningLine, onSessionComplete }) => {
  const [voiceState, setVoiceState] = useState('IDLE'); // IDLE, AI_SPEAKING, LISTENING, PROCESSING, ENDED
  const [isMicActive, setIsMicActive] = useState(false);
  const [turns, setTurns] = useState([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [turnIndex, setTurnIndex] = useState(0);

  const recognitionRef = useRef(null);
  const disposedRef = useRef(false);
  const shouldListenRef = useRef(false);
  const lastAiUtteranceRef = useRef('');

  const silenceTimerRef = useRef(null);
  const noSpeechTimerRef = useRef(null);
  const postSpeechTimerRef = useRef(null);
  const timingRef = useRef({ aiEndedAt: 0, firstWordAt: 0, lastWordAt: 0 });
  const activeTranscriptRef = useRef('');

  const clearAllTimers = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
    if (postSpeechTimerRef.current) clearTimeout(postSpeechTimerRef.current);
  };

  // Starts microphone listening safely
  const startListening = useCallback(() => {
    if (disposedRef.current || !shouldListenRef.current || !recognitionRef.current) return;

    setVoiceState('LISTENING');
    activeTranscriptRef.current = '';
    setInterimTranscript('');
    clearAllTimers();

    // 10s No-Speech Guard
    noSpeechTimerRef.current = setTimeout(() => {
      if (disposedRef.current || !shouldListenRef.current) return;
      if (recognitionRef.current) recognitionRef.current.abort();

      const reprompt = "I didn't catch that. Take your time, what is your opening or counter-argument on this motion?";
      speakStatement(reprompt, false);
    }, NO_SPEECH_TIMEOUT_MS);

    recognitionRef.current.start({
      onInterim: (interim) => {
        if (disposedRef.current || !shouldListenRef.current) return;
        if (!timingRef.current.firstWordAt) {
          timingRef.current.firstWordAt = Date.now();
          if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
        }
        timingRef.current.lastWordAt = Date.now();
        setInterimTranscript(interim);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => handleTurnSubmit(), SILENCE_TIMEOUT_MS);
      },
      onFinal: (chunk, full) => {
        if (disposedRef.current || !shouldListenRef.current) return;
        timingRef.current.lastWordAt = Date.now();
        activeTranscriptRef.current = full;
        setInterimTranscript('');

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => handleTurnSubmit(), SILENCE_TIMEOUT_MS);
      },
      onError: (err) => console.warn('[useVoiceLoop] Recognition error:', err)
    });
  }, []);

  // Speaks an AI statement and schedules listening after a 500ms safety gap
  const speakStatement = useCallback((text, isClosing = false) => {
    if (disposedRef.current) return;

    shouldListenRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    clearAllTimers();
    setVoiceState('AI_SPEAKING');
    lastAiUtteranceRef.current = text;

    speechSynthesisService.speak(text, {
      onEnd: () => {
        if (disposedRef.current) return;
        timingRef.current.aiEndedAt = Date.now();
        timingRef.current.firstWordAt = 0;
        timingRef.current.lastWordAt = 0;
        activeTranscriptRef.current = '';
        setInterimTranscript('');

        if (isClosing) {
          setVoiceState('ENDED');
          if (onSessionComplete) onSessionComplete();
        } else {
          shouldListenRef.current = true;
          // 500ms safety buffer after TTS finishes before mic opens
          postSpeechTimerRef.current = setTimeout(() => {
            if (!disposedRef.current && shouldListenRef.current) {
              startListening();
            }
          }, POST_SPEECH_DELAY_MS);
        }
      }
    });
  }, [onSessionComplete, startListening]);

  // Finalizes user turn
  const handleTurnSubmit = useCallback((overrideText) => {
    if (disposedRef.current) return;
    clearAllTimers();
    shouldListenRef.current = false;

    const rawTranscript = overrideText || (recognitionRef.current ? recognitionRef.current.stop() : '') || activeTranscriptRef.current;
    const finalUserText = rawTranscript.trim();

    // Check for empty or echo of the AI's own speech
    if (!finalUserText || isEchoOfAi(finalUserText, lastAiUtteranceRef.current)) {
      if (finalUserText) {
        console.warn('[useVoiceLoop] Discarded echo burst of AI utterance:', finalUserText);
      }
      activeTranscriptRef.current = '';
      setInterimTranscript('');
      speakStatement("I didn't catch that. Take your time, what is your opening or counter-argument on this motion?", false);
      return;
    }

    const firstWord = timingRef.current.firstWordAt || Date.now() - 2000;
    const lastWord = timingRef.current.lastWordAt || Date.now();
    const turnTiming = {
      aiEndedAt: timingRef.current.aiEndedAt,
      firstWordAt: firstWord,
      lastWordAt: lastWord,
      turnDurationMs: Math.max(1000, lastWord - firstWord)
    };

    const nextUserTurn = { role: 'user', text: finalUserText, timing: turnTiming };
    setTurns((prev) => [...prev, nextUserTurn]);
    setVoiceState('PROCESSING');

    (async () => {
      let aiReplyText = MOCK_REBUTTALS[0];
      let shouldEnd = turnIndex + 1 >= MAX_DEMO_TURNS;
      let nextTurnCount = turnIndex + 1;
      let replySource = 'fallback';
      let latencyMs = 0;

      if (sessionId && !sessionId.startsWith('local_')) {
        try {
          const res = await api.sendTurn(sessionId, {
            transcript: finalUserText,
            timing: turnTiming
          });
          aiReplyText = res.reply;
          shouldEnd = Boolean(res.shouldEnd);
          nextTurnCount = res.turnCount || nextTurnCount;
          replySource = res.source || 'gemini';
          latencyMs = res.latencyMs || 0;
        } catch (err) {
          console.warn('[useVoiceLoop] API turn error, using fallback:', err.message);
          aiReplyText = MOCK_REBUTTALS[Math.min(turnIndex, MOCK_REBUTTALS.length - 1)];
          replySource = 'fallback';
        }
      } else {
        aiReplyText = shouldEnd ? MOCK_REBUTTALS[2] : (MOCK_REBUTTALS[turnIndex] || MOCK_REBUTTALS[0]);
      }

      if (disposedRef.current) return;
      setTurnIndex(nextTurnCount);
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: aiReplyText,
          source: replySource,
          timing: { latencyMs }
        }
      ]);
      speakStatement(aiReplyText, shouldEnd);
    })();
  }, [sessionId, turnIndex, speakStatement]);

  // Lifecycle: safe under React StrictMode double-mount & pagehide
  useEffect(() => {
    disposedRef.current = false;
    const recInstance = new SpeechRecognitionService({
      onStateChange: (active) => {
        if (!disposedRef.current) {
          setIsMicActive(active);
        }
      }
    });
    recognitionRef.current = recInstance;

    const opening = initialOpeningLine || "Welcome to the debate arena. Please state your opening stance on this motion.";
    setTurns([{ role: 'assistant', text: opening }]);
    speakStatement(opening, false);

    const handlePageHide = () => {
      disposedRef.current = true;
      shouldListenRef.current = false;
      clearAllTimers();
      recInstance.dispose();
      speechSynthesisService.cancel();
      setIsMicActive(false);
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      disposedRef.current = true;
      shouldListenRef.current = false;
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      clearAllTimers();
      recInstance.dispose();
      speechSynthesisService.cancel();
      setIsMicActive(false);
    };
  }, []);

  return {
    voiceState,
    isMicActive,
    turns,
    interimTranscript,
    turnIndex,
    maxTurns: MAX_DEMO_TURNS,
    isSupported: SpeechRecognitionService.isSupported(),
    handleDoneSpeaking: () => handleTurnSubmit(),
    handleTypeFallback: (text) => handleTurnSubmit(text)
  };
};
