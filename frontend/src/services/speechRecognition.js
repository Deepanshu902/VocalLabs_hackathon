const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export class SpeechRecognitionService {
  constructor({ onStateChange } = {}) {
    this.recognition = null;
    this.isActive = false;
    this.shouldListen = false;
    this.disposed = false;
    this.onInterimCallback = null;
    this.onFinalCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
    this.onStateChange = onStateChange || null;
    this.finalTranscript = '';

    if (SpeechRecognitionAPI) {
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-IN';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isActive = true;
        if (this.onStateChange) this.onStateChange(true);
      };

      this.recognition.onresult = (event) => this.handleResult(event);
      this.recognition.onerror = (event) => this.handleError(event);
      this.recognition.onend = () => this.handleEnd();
    }
  }

  static isSupported() {
    return Boolean(SpeechRecognitionAPI);
  }

  isSupported() {
    return Boolean(this.recognition);
  }

  handleResult(event) {
    // Drop results if we shouldn't be listening or are disposed
    if (!this.shouldListen || this.disposed) {
      return;
    }

    let interimText = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        this.finalTranscript += (this.finalTranscript ? ' ' : '') + transcript.trim();
        if (this.onFinalCallback) {
          this.onFinalCallback(transcript.trim(), this.finalTranscript);
        }
      } else {
        interimText += transcript;
      }
    }

    if (this.onInterimCallback && interimText) {
      this.onInterimCallback(interimText);
    }
  }

  handleError(event) {
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    console.warn('[SpeechRecognition] Error:', event.error);
    if (this.onErrorCallback && !this.disposed) {
      this.onErrorCallback(event.error);
    }
  }

  handleEnd() {
    this.isActive = false;
    if (this.onStateChange) this.onStateChange(false);

    // Auto-restart ONLY if still shouldListen, not disposed, and supported
    if (this.shouldListen && !this.disposed && this.recognition) {
      try {
        this.recognition.start();
      } catch (err) {
        // Can fail if restarting too fast; ignore benign already-started errors
      }
    } else if (this.onEndCallback && !this.disposed) {
      this.onEndCallback();
    }
  }

  start({ onInterim, onFinal, onError, onEnd }) {
    if (!this.recognition || this.disposed) return false;

    this.onInterimCallback = onInterim;
    this.onFinalCallback = onFinal;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;
    this.finalTranscript = '';
    this.shouldListen = true;

    if (!this.isActive) {
      try {
        this.recognition.start();
      } catch (err) {
        // Recognition might already be starting or started
      }
    }
    return true;
  }

  stop() {
    this.shouldListen = false;
    const current = this.finalTranscript;
    if (this.recognition && this.isActive) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Ignore
      }
    }
    this.isActive = false;
    if (this.onStateChange) this.onStateChange(false);
    return current;
  }

  abort() {
    this.shouldListen = false;
    this.finalTranscript = '';
    if (this.recognition && this.isActive) {
      try {
        this.recognition.abort();
      } catch (err) {
        // Ignore
      }
    }
    this.isActive = false;
    if (this.onStateChange) this.onStateChange(false);
  }

  dispose() {
    this.disposed = true;
    this.shouldListen = false;
    this.abort();
    this.onInterimCallback = null;
    this.onFinalCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
    this.onStateChange = null;
    this.recognition = null;
  }
}
