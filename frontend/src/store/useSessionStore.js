import { create } from 'zustand';

const getStoredUserKey = () => {
  const existingKey = localStorage.getItem('voicecoach_user_key');
  if (existingKey) return existingKey;
  const newKey = 'user_' + Math.random().toString(36).substring(2, 11);
  localStorage.setItem('voicecoach_user_key', newKey);
  return newKey;
};

export const useSessionStore = create((set, get) => ({
  userKey: getStoredUserKey(),
  activeTab: 'setup', // 'setup' | 'debate' | 'report' | 'history'
  currentSession: null,
  voiceState: 'IDLE', // 'IDLE' | 'AI_SPEAKING' | 'LISTENING' | 'PROCESSING' | 'ENDED'
  interimTranscript: '',
  isFallbackModalOpen: false,
  serverStatus: 'checking', // 'checking' | 'connected' | 'disconnected'
  dbStatus: 'unknown', // 'atlas' | 'memory' | 'unknown'
  geminiStatus: 'unknown', // 'ok' | 'missing_key' | 'error' | 'unknown'
  error: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setVoiceState: (voiceState) => set({ voiceState }),
  setInterimTranscript: (text) => set({ interimTranscript: text }),
  setIsFallbackModalOpen: (isOpen) => set({ isFallbackModalOpen: isOpen }),
  setServerStatus: (status) => set({ serverStatus: status }),
  setSystemHealth: ({ db, gemini }) => set({ dbStatus: db, geminiStatus: gemini }),
  setError: (error) => set({ error }),

  resetSession: () =>
    set({
      currentSession: null,
      voiceState: 'IDLE',
      interimTranscript: '',
      isFallbackModalOpen: false,
      error: null,
      activeTab: 'setup'
    })
}));

