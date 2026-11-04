/**
 * session.routes.js — Read and email routes for completed sessions.
 * GET  /api/sessions          → listSessions
 * GET  /api/sessions/:id      → getSession
 * POST /api/sessions/:id/email → emailScorecard
 *
 * NOTE: interview.routes.js handles POST /api/sessions (start),
 *       POST /api/sessions/:id/turn, and POST /api/sessions/:id/end.
 *       Both routers are mounted on /api/sessions in app.js.
 *       Express resolves by method + path, so there is no conflict.
 */

import { Router } from 'express';
import { listSessions, getSession, emailScorecard } from '../controller/session.controller.js';

const router = Router();

router.get('/', listSessions);
router.get('/:id', getSession);
router.post('/:id/email', emailScorecard);

export default router;

