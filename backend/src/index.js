import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB, getDbStatus } from './db/index.js';
import { checkGeminiHealth } from './utils/gemini.js';

// 1. Enforce GEMINI_MODEL presence
if (!process.env.GEMINI_MODEL) {
  console.error('\n❌ FATAL STARTUP ERROR: GEMINI_MODEL is missing from environment.');
  console.error('   Please define GEMINI_MODEL in backend/.env (e.g. GEMINI_MODEL=gemini-3.8-flash).');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`[VoiceCoach] Server running on http://localhost:${PORT}`);
    console.log(`[VoiceCoach] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[VoiceCoach] Configured Gemini model: ${process.env.GEMINI_MODEL}`);
    console.log(`======================================================\n`);
  });

  // Connect to DB asynchronously
  connectDB().catch((err) => {
    console.warn('[DB] Connection error:', err.message);
  });

  // Run startup Gemini self-check
  if (process.env.GEMINI_API_KEY) {
    console.log('[Startup] Running Gemini self-check with thinkingLevel: LOW...');
    checkGeminiHealth().then((status) => {
      if (status === 'ok') {
        console.log('[Startup] ✅ Gemini self-check PASSED! Live model ready.');
      } else {
        console.warn('[Startup] ⚠️  Gemini self-check FAILED. Turn responses will use fallback if unavailable.');
      }
    });
  } else {
    console.warn('[Startup] ⚠️  GEMINI_API_KEY is not set. Running with canned fallback.');
  }

  return server;
};

startServer();
