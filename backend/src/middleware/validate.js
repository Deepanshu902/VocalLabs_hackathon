import { ApiError } from '../utils/ApiError.js';
import { MODES } from '../constants.js';

export const validateStartSession = (req, res, next) => {
  const { mode = 'debate', topic, userSide, userKey } = req.body;

  if (!userKey || typeof userKey !== 'string' || !userKey.trim()) {
    return next(new ApiError(400, 'userKey is required'));
  }

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return next(new ApiError(400, 'topic is required'));
  }

  if (!userSide || !['for', 'against'].includes(userSide.toLowerCase())) {
    return next(new ApiError(400, "userSide must be either 'for' or 'against'"));
  }

  if (!MODES[mode]) {
    return next(new ApiError(400, `Invalid mode: ${mode}`));
  }

  if (MODES[mode].active === false) {
    return next(new ApiError(400, `Mode '${mode}' is not yet enabled (${MODES[mode].badge || 'Coming Soon'})`));
  }

  req.body.mode = mode.toLowerCase();
  req.body.userSide = userSide.toLowerCase();
  req.body.topic = topic.trim();
  req.body.userKey = userKey.trim();

  next();
};

export const validateTurn = (req, res, next) => {
  const { transcript, timing } = req.body;

  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return next(new ApiError(400, 'transcript is required and cannot be empty'));
  }

  req.body.transcript = transcript.trim();
  req.body.timing = timing || {};

  next();
};

