const API_BASE = '/api';

export const api = {
  async checkHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async startSession({ mode = 'debate', topic, userSide, userKey }) {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, topic, userSide, userKey })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to start session');
    }
    return res.json();
  },

  async sendTurn(sessionId, { transcript, timing }) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, timing })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to send turn');
    }
    return res.json();
  },

  async endSession(sessionId) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to end session');
    }
    return res.json();
  },

  async getSessions(userKey) {
    const res = await fetch(`${API_BASE}/sessions?userKey=${encodeURIComponent(userKey)}`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async getSession(sessionId) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
  },

  async emailScorecard(sessionId, to) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to send email');
    }
    return res.json();
  }
};

