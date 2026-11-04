import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import { ApiError } from './utils/ApiError.js';
import interviewRoutes from './routers/interview.routes.js';
import sessionRoutes from './routers/session.routes.js';
import { getDbStatus } from './db/index.js';
import { checkGeminiHealth } from './utils/gemini.js';

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = getDbStatus();
  const geminiStatus = process.env.GEMINI_API_KEY ? 'ok' : 'missing_key';

  res.status(200).json({
    status: 'ok',
    service: 'voicecoach-backend',
    gemini: geminiStatus,
    db: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
// sessionRoutes handles GET / and GET /:id and POST /:id/email
// interviewRoutes handles POST / (start), POST /:id/turn, POST /:id/end
// Both share the /api/sessions base — Express resolves by method+path, no conflict.
app.use('/api/sessions', sessionRoutes);
app.use('/api/sessions', interviewRoutes);

// 404 Catch-All
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// Global Error Handler
app.use(errorHandler);

export default app;
