import { GoogleGenAI, Type } from '@google/genai';
import { FALLBACK_REBUTTAL } from '../constants.js';

let cachedGeminiClient = null;

const getGeminiClient = () => {
  if (cachedGeminiClient) return cachedGeminiClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('\n======================================================');
    console.warn('⚠️  LOUD WARNING: GEMINI_API_KEY is not set in environment!');
    console.warn('   AI opponent turns will use the canned generic fallback.');
    console.warn('======================================================\n');
    return null;
  }

  const modelName = process.env.GEMINI_MODEL;
  if (!modelName) {
    console.error('\n❌ FATAL STARTUP ERROR: GEMINI_MODEL is missing from environment.');
    console.error('   Please define GEMINI_MODEL in backend/.env (e.g. GEMINI_MODEL=gemini-3.8-flash).');
    process.exit(1);
  }

  cachedGeminiClient = new GoogleGenAI({ apiKey });
  return cachedGeminiClient;
};

const withTimeout = (promise, ms = 7000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini request timed out after ${ms}ms`)), ms)
    )
  ]);
};

export const checkGeminiHealth = async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return 'missing_key';

  const modelName = process.env.GEMINI_MODEL;
  if (!modelName) return 'error';

  const ai = getGeminiClient();
  if (!ai) return 'missing_key';

  try {
    const res = await withTimeout(
      ai.models.generateContent({
        model: modelName,
        contents: 'Ping health check',
        config: {
          thinkingConfig: {
            thinkingLevel: 'LOW'
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING }
            },
            required: ['status']
          }
        }
      }),
      7000
    );
    const parsed = JSON.parse(res.text);
    if (parsed) return 'ok';
    return 'error';
  } catch (err) {
    console.warn('\n======================================================');
    console.warn('⚠️  LOUD WARNING: Startup Gemini Health Check failed:', err.message);
    console.warn('======================================================\n');
    return 'error';
  }
};

export const generateOpponentTurn = async ({
  systemPrompt,
  history = [],
  userTurnCount = 1,
  maxUserTurns = 3
}) => {
  const modelName = process.env.GEMINI_MODEL;
  if (!modelName) {
    console.error('❌ FATAL ERROR: GEMINI_MODEL is missing from environment.');
    process.exit(1);
  }

  const ai = getGeminiClient();
  const shouldEndFallback = userTurnCount >= maxUserTurns;
  const startTime = Date.now();

  if (!ai) {
    const latencyMs = Date.now() - startTime;
    console.log(`[Turn] Source: fallback (missing key) | Latency: ${latencyMs}ms`);
    return {
      reply: FALLBACK_REBUTTAL,
      shouldEnd: shouldEndFallback,
      source: 'fallback',
      latencyMs
    };
  }

  // Format turns for Gemini: model expects roles 'user' and 'model'
  const trimmedHistory = history.slice(-6).map((t) => ({
    role: t.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: t.text }]
  }));

  const turnSchema = {
    type: Type.OBJECT,
    properties: {
      reply: {
        type: Type.STRING,
        description: 'The spoken rebuttal counter-argument, max 40 words, no markdown'
      },
      shouldEnd: {
        type: Type.BOOLEAN,
        description: 'True if max turns have been reached and this is the closing line'
      }
    },
    required: ['reply', 'shouldEnd']
  };

  const callModel = async () => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: trimmedHistory,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: 'LOW'
        },
        responseMimeType: 'application/json',
        responseSchema: turnSchema,
        temperature: 0.7,
        maxOutputTokens: 250
      }
    });

    const rawText = response.text;
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed.reply !== 'string') {
      throw new Error('Invalid JSON structure returned from Gemini');
    }
    return {
      reply: parsed.reply.trim(),
      shouldEnd: Boolean(parsed.shouldEnd || userTurnCount >= maxUserTurns)
    };
  };

  // Attempt up to 2 times (initial + 1 retry)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await withTimeout(callModel(), 7000);
      const latencyMs = Date.now() - startTime;
      console.log(`[Turn] Source: gemini (attempt ${attempt}) | Latency: ${latencyMs}ms`);
      return {
        reply: result.reply,
        shouldEnd: result.shouldEnd,
        source: 'gemini',
        latencyMs
      };
    } catch (err) {
      console.warn(`[Gemini] Turn generation attempt ${attempt} failed: ${err.message}`);
    }
  }

  // Graceful fallback to guarantee demo reliability
  const latencyMs = Date.now() - startTime;
  console.log(`[Turn] Source: fallback (API error/timeout) | Latency: ${latencyMs}ms`);
  return {
    reply: FALLBACK_REBUTTAL,
    shouldEnd: shouldEndFallback,
    source: 'fallback',
    latencyMs
  };
};

export const generateJudgeReport = async ({ topic, userSide, turns, metrics }) => {
  const modelName = process.env.GEMINI_MODEL;
  const ai = getGeminiClient();
  const startTime = Date.now();

  const candidateTurns = turns.filter((t) => t.role === 'user');
  const transcriptText = turns
    .map((t) => `${t.role === 'user' ? 'Candidate' : 'Opponent'}: ${t.text}`)
    .join('\n\n');

  // Fallback generator if API fails
  const getFallbackReport = () => {
    const quotes = candidateTurns.map((t) => t.text.slice(0, 60)).filter(Boolean);
    return {
      verdict: {
        winner: 'draw',
        reason: 'Both sides presented coherent arguments, but both relied on generalizations rather than empirical evidence.'
      },
      overallScore: Math.min(88, Math.max(62, 75 - (metrics.totalFillers * 2) - (metrics.totalHedges * 2))),
      rubric: {
        argumentStrength: { score: 7, reason: 'Plausible premises, though several claims lacked empirical verification.' },
        evidence: { score: 6, reason: 'Relied heavily on assertions rather than specific citations or case studies.' },
        rebuttal: { score: 7, reason: 'Directly addressed the opponent opening, but missed countering secondary points.' },
        structure: { score: 8, reason: 'Clear sequential flow with well-delineated point transitions.' },
        persuasiveness: { score: 7, reason: 'Strong delivery pace, though filler words slightly diluted rhetorical weight.' }
      },
      unansweredPoints: [
        'How universities can maintain academic integrity standards without strict tool prohibitions',
        'Long-term cognitive skill degradation when introductory fundamentals are outsourced'
      ],
      weakestMoments: [
        {
          quote: quotes[0] || 'I think banning tools is bad...',
          whyWeak: 'Subjective hedge phrase weakens the authority of the opening premise.',
          strongerVersion: 'Banning modern engineering tools directly undermines technical literacy.'
        },
        {
          quote: quotes[1] || 'Students need to learn real things...',
          whyWeak: 'Vague assertion lacking concrete educational methodology or data.',
          strongerVersion: 'Pedagogy must evolve toward code comprehension and architectural verification.'
        },
        {
          quote: quotes[2] || 'It is basically impossible to enforce...',
          whyWeak: 'Defeatist stance that ignores existing proctored examination frameworks.',
          strongerVersion: 'Prohibition creates an unmonitorable black market rather than productive oversight.'
        }
      ],
      nextSteps: [
        'Replace hedge phrases like "I think" and "maybe" with declarative assertions.',
        'Directly cite at least one empirical data point or precedent in every rebuttal.',
        'Explicitly acknowledge and dismantle the opponent\'s core premise before introducing new points.'
      ],
      source: 'fallback',
      latencyMs: Date.now() - startTime
    };
  };

  if (!ai) {
    return getFallbackReport();
  }

  const judgeSchema = {
    type: Type.OBJECT,
    properties: {
      verdict: {
        type: Type.OBJECT,
        properties: {
          winner: { type: Type.STRING, enum: ['user', 'opponent', 'draw'] },
          reason: { type: Type.STRING }
        },
        required: ['winner', 'reason']
      },
      overallScore: { type: Type.INTEGER },
      rubric: {
        type: Type.OBJECT,
        properties: {
          argumentStrength: {
            type: Type.OBJECT,
            properties: { score: { type: Type.INTEGER }, reason: { type: Type.STRING } },
            required: ['score', 'reason']
          },
          evidence: {
            type: Type.OBJECT,
            properties: { score: { type: Type.INTEGER }, reason: { type: Type.STRING } },
            required: ['score', 'reason']
          },
          rebuttal: {
            type: Type.OBJECT,
            properties: { score: { type: Type.INTEGER }, reason: { type: Type.STRING } },
            required: ['score', 'reason']
          },
          structure: {
            type: Type.OBJECT,
            properties: { score: { type: Type.INTEGER }, reason: { type: Type.STRING } },
            required: ['score', 'reason']
          },
          persuasiveness: {
            type: Type.OBJECT,
            properties: { score: { type: Type.INTEGER }, reason: { type: Type.STRING } },
            required: ['score', 'reason']
          }
        },
        required: ['argumentStrength', 'evidence', 'rebuttal', 'structure', 'persuasiveness']
      },
      unansweredPoints: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      weakestMoments: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            quote: { type: Type.STRING },
            whyWeak: { type: Type.STRING },
            strongerVersion: { type: Type.STRING }
          },
          required: ['quote', 'whyWeak', 'strongerVersion']
        }
      },
      nextSteps: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ['verdict', 'overallScore', 'rubric', 'unansweredPoints', 'weakestMoments', 'nextSteps']
  };

  const callJudge = async () => {
    const { buildJudgePrompt } = await import('./prompts.js');
    const prompt = buildJudgePrompt({ topic, userSide, transcriptText, metrics });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: 'LOW'
        },
        responseMimeType: 'application/json',
        responseSchema: judgeSchema,
        temperature: 0.4,
        maxOutputTokens: 1000
      }
    });

    const parsed = JSON.parse(response.text);
    if (!parsed || !parsed.verdict || typeof parsed.overallScore !== 'number') {
      throw new Error('Invalid JSON structure returned by judge');
    }

    return {
      ...parsed,
      source: 'gemini',
      latencyMs: Date.now() - startTime
    };
  };

  try {
    const report = await withTimeout(callJudge(), 9000);
    console.log(`[Judge] Scorecard generated via Gemini | Latency: ${report.latencyMs}ms | Score: ${report.overallScore}`);
    return report;
  } catch (err) {
    console.warn('[Judge] Gemini judge call failed or rate-limited:', err.message);
    const fallbackReport = getFallbackReport();
    console.log(`[Judge] Falling back to deterministic rubric | Latency: ${fallbackReport.latencyMs}ms`);
    return fallbackReport;
  }
};
