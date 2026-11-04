import { Session } from '../models/session.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listSessions = asyncHandler(async (req, res) => {
  const { userKey } = req.query;
  if (!userKey) throw new ApiError(400, 'userKey query param is required');

  const sessions = await Session.find({
    $or: [{ userKey }, { isSeeded: true }]
  })
    .select('mode topic userSide startedAt endedAt metrics report isSeeded')
    .sort({ startedAt: 1 })
    .lean();

  return res.status(200).json({ success: true, sessions });
});

export const getSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id).lean();
  if (!session) throw new ApiError(404, 'Session not found');
  return res.status(200).json({ success: true, session });
});

export const emailScorecard = asyncHandler(async (req, res) => {
  const { to } = req.body;
  if (!to || !/\S+@\S+\.\S+/.test(to)) throw new ApiError(400, 'Valid email address required');

  const session = await Session.findById(req.params.id).lean();
  if (!session) throw new ApiError(404, 'Session not found');
  if (!session.report?.overallScore) throw new ApiError(409, 'Scorecard not yet generated. Call /end first.');

  const { sendScorecardEmail } = await import('../utils/mailer.js');
  const result = await sendScorecardEmail({ to, session });

  if (result.sent) {
    await Session.findByIdAndUpdate(req.params.id, {
      $addToSet: { emailedTo: to }
    });
  }

  return res.status(200).json(result);
});

