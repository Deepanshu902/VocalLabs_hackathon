import { FILLER_WORDS, HEDGE_WORDS } from '../constants.js';

export const computeSpeechMetrics = (turns = []) => {
  const candidateTurns = turns.filter((t) => t.role === 'user');

  if (candidateTurns.length === 0) {
    return {
      fillerCounts: {},
      totalFillers: 0,
      hedgeCounts: {},
      totalHedges: 0,
      avgWpm: 0,
      avgLatencyMs: 0,
      avgAnswerWords: 0,
      longestAnswerWords: 0
    };
  }

  const combinedText = candidateTurns.map((t) => t.text.toLowerCase()).join(' ');

  // 1. Calculate Fillers (Deterministic regex word boundary match)
  const fillerCounts = {};
  let totalFillers = 0;
  for (const filler of FILLER_WORDS) {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = combinedText.match(regex);
    const count = matches ? matches.length : 0;
    fillerCounts[filler] = count;
    totalFillers += count;
  }

  // 2. Calculate Hedges
  const hedgeCounts = {};
  let totalHedges = 0;
  for (const hedge of HEDGE_WORDS) {
    const escaped = hedge.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = combinedText.match(regex);
    const count = matches ? matches.length : 0;
    hedgeCounts[hedge] = count;
    totalHedges += count;
  }

  // 3. Turn timing and word length calculations
  let totalWords = 0;
  let longestAnswerWords = 0;
  let totalWpm = 0;
  let validWpmTurns = 0;
  let totalLatency = 0;
  let validLatencyTurns = 0;

  for (const turn of candidateTurns) {
    const words = turn.text.trim().split(/\s+/).filter(Boolean).length;
    totalWords += words;
    if (words > longestAnswerWords) {
      longestAnswerWords = words;
    }

    const durationMs = turn.timing?.turnDurationMs || Math.max(1000, (turn.timing?.lastWordAt || 0) - (turn.timing?.firstWordAt || 0));
    if (durationMs > 500 && words > 0) {
      const wpm = Math.round((words / durationMs) * 60000);
      // Realistic bound check: 40 - 250 WPM
      const boundedWpm = Math.min(250, Math.max(40, wpm));
      totalWpm += boundedWpm;
      validWpmTurns++;
    }

    const latency = turn.timing?.latencyMs ?? (turn.timing?.firstWordAt && turn.timing?.aiEndedAt ? Math.max(0, turn.timing.firstWordAt - turn.timing.aiEndedAt) : 0);
    if (latency >= 0) {
      totalLatency += latency;
      validLatencyTurns++;
    }
  }

  const avgWpm = validWpmTurns > 0 ? Math.round(totalWpm / validWpmTurns) : 130;
  const avgLatencyMs = validLatencyTurns > 0 ? Math.round(totalLatency / validLatencyTurns) : 1200;
  const avgAnswerWords = Math.round(totalWords / candidateTurns.length);

  return {
    fillerCounts,
    totalFillers,
    hedgeCounts,
    totalHedges,
    avgWpm,
    avgLatencyMs,
    avgAnswerWords,
    longestAnswerWords
  };
};

