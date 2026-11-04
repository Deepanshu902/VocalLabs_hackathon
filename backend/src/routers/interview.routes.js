import { Router } from 'express';
import {
  startSession,
  processTurn,
  endSession
} from '../controller/interview.controller.js';
import {
  validateStartSession,
  validateTurn
} from '../middleware/validate.js';

const router = Router();

router.post('/', validateStartSession, startSession);
router.post('/:id/turn', validateTurn, processTurn);
router.post('/:id/end', endSession);

export default router;

