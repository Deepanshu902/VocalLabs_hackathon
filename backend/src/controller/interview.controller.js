import { Session } from '../models/session.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { MODES } from '../constants.js';
import { buildOpeningStatement, buildOpponentSystemPrompt } from '../utils/prompts.js';
import { generateOpponentTurn } from '../utils/gemini.js';

import { computeSpeechMetrics } from '../utils/metrics.js';
import { generateJudgeReport } from '../utils/gemini.js';

// In-memory fallback map if MongoDB is unreachable
const memorySessions = new Map();

export const startSession = asyncHandler(async (req, res) => {
  const { mode = 'debate', topic, userSide, userKey } = req.body;
  const openingLine = buildOpeningStatement({ topic, userSide });

  const initialTurns = [
    {
      role: 'assistant',
      text: openingLine,
      timing: { aiEndedAt: Date.now() }
    }
  ];

  let sessionId;
  try {
    const session = await Session.create({
      mode,
      topic,
      userSide,
      userKey,
      startedAt: new Date(),
      turns: initialTurns
    });
    sessionId = session._id.toString();
  } catch (err) {
    console.warn('[DB] Session create fallback to in-memory:', err.message);
    sessionId = 'mem_' + Math.random().toString(36).substring(2, 11);
    memorySessions.set(sessionId, {
      _id: sessionId,
      mode,
      topic,
      userSide,
      userKey,
      startedAt: new Date(),
      turns: initialTurns
    });
  }

  return res.status(201).json({
    success: true,
    sessionId,
    openingLine
  });
});

export const processTurn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { transcript, timing } = req.body;

  let session = null;
  try {
    session = await Session.findById(id);
  } catch (err) {
    // Ignore invalid ObjectId and check memory
  }

  if (!session) {
    session = memorySessions.get(id);
  }

  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  const modeConfig = MODES[session.mode] || MODES.debate;
  const maxUserTurns = modeConfig.maxUserTurns || 3;

  const prevUserTurns = session.turns.filter((t) => t.role === 'user');
  const userTurnCount = prevUserTurns.length + 1;

  const firstWord = timing?.firstWordAt || Date.now() - 2000;
  const lastWord = timing?.lastWordAt || Date.now();
  const aiEnded = timing?.aiEndedAt || 0;

  const userTurn = {
    role: 'user',
    text: transcript,
    timing: {
      aiEndedAt: aiEnded,
      firstWordAt: firstWord,
      lastWordAt: lastWord,
      latencyMs: aiEnded ? Math.max(0, firstWord - aiEnded) : 0,
      turnDurationMs: Math.max(1000, lastWord - firstWord)
    }
  };

  session.turns.push(userTurn);

  const systemPrompt = buildOpponentSystemPrompt({
    topic: session.topic,
    userSide: session.userSide,
    maxUserTurns
  });

  const { reply, shouldEnd, source, latencyMs } = await generateOpponentTurn({
    systemPrompt,
    history: session.turns,
    userTurnCount,
    maxUserTurns
  });

  session.turns.push({
    role: 'assistant',
    text: reply,
    source,
    timing: {
      aiEndedAt: Date.now(),
      latencyMs
    }
  });

  if (session.save) {
    await session.save();
  }

  return res.status(200).json({
    success: true,
    reply,
    shouldEnd,
    source,
    latencyMs,
    turnCount: userTurnCount,
    maxTurns: maxUserTurns
  });
});

export const endSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let session = null;
  try {
    session = await Session.findById(id);
  } catch (err) {
    // Check in-memory fallback
  }

  if (!session) {
    session = memorySessions.get(id);
  }

  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  // Idempotency: If already generated, return existing evaluation immediately
  if (session.report && typeof session.report.overallScore === 'number' && session.metrics) {
    console.log(`[Session] Returning cached report for session ${id}`);
    return res.status(200).json({
      success: true,
      sessionId: session._id,
      topic: session.topic,
      userSide: session.userSide,
      turns: session.turns,
      metrics: session.metrics,
      report: session.report,
      isCached: true
    });
  }

  // 1. Compute deterministic metrics from speech timing and text
  const metrics = computeSpeechMetrics(session.turns);

  // 2. Generate impartial judge report
  const report = await generateJudgeReport({
    topic: session.topic,
    userSide: session.userSide,
    turns: session.turns,
    metrics
  });

  session.metrics = metrics;
  session.report = report;
  session.endedAt = new Date();

  if (session.save) {
    await session.save();
  }

  return res.status(200).json({
    success: true,
    sessionId: session._id,
    topic: session.topic,
    userSide: session.userSide,
    turns: session.turns,
    metrics,
    report,
    isCached: false
  });
});

