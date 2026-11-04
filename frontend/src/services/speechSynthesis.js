export class SpeechSynthesisService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.watchdogTimer = null;

    if (this.synth) {
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  isSupported() {
    return Boolean(this.synth);
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  getBestVoice() {
    if (!this.voices || this.voices.length === 0) {
      this.loadVoices();
    }

    // 1. Prefer local Indian English voice
    const localIndian = this.voices.find(
      (v) => (v.lang === 'en-IN' || v.lang.startsWith('en_IN')) && v.localService
    );
    if (localIndian) return localIndian;

    // 2. Prefer any Indian English voice
    const anyIndian = this.voices.find((v) => v.lang === 'en-IN' || v.lang.startsWith('en_IN'));
    if (anyIndian) return anyIndian;

    // 3. Prefer local English voice
    const localEnglish = this.voices.find(
      (v) => v.lang.startsWith('en') && v.localService
    );
    if (localEnglish) return localEnglish;

    // 4. Any English voice or default
    return this.voices.find((v) => v.lang.startsWith('en')) || this.voices[0] || null;
  }

  speak(text, { onStart, onEnd, onError } = {}) {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    // Clear any pending speech
    this.cancel();

    // Cap text to ~40 words if necessary
    const words = text.trim().split(/\s+/);
    const spokenText = words.length > 45 ? words.slice(0, 45).join(' ') + '...' : text;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    const bestVoice = this.getBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    let hasEnded = false;
    const cleanEnd = (trigger = 'onend') => {
      if (hasEnded) return;
      hasEnded = true;
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
      if (onEnd) onEnd(trigger);
    };

    utterance.onstart = () => {
      if (onStart) onStart();

      // Watchdog: estimated duration = (wordCount / rate * 60 / 140 WPM) * 1000 + 2500ms buffer
      const wordCount = spokenText.split(/\s+/).length;
      const estimatedMs = Math.max(3000, Math.ceil((wordCount / 2.3) * 1000) + 2500);

      this.watchdogTimer = setTimeout(() => {
        console.warn('[SpeechSynthesis] Watchdog triggered after', estimatedMs, 'ms');
        cleanEnd('watchdog');
      }, estimatedMs);
    };

    utterance.onend = () => {
      cleanEnd('onend');
    };

    utterance.onerror = (e) => {
      console.warn('[SpeechSynthesis] Error:', e.error);
      if (onError) onError(e);
      cleanEnd('onerror');
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[SpeechSynthesis] Speak call failed:', err.message);
      cleanEnd('exception');
    }
  }

  cancel() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const speechSynthesisService = new SpeechSynthesisService();

