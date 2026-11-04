import mongoose from 'mongoose';

const turnSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    text: {
      type: String,
      required: true
    },
    source: {
      type: String,
      enum: ['gemini', 'fallback', 'initial']
    },
    timing: {
      aiEndedAt: { type: Number, default: 0 },
      firstWordAt: { type: Number, default: 0 },
      lastWordAt: { type: Number, default: 0 },
      latencyMs: { type: Number, default: 0 },
      turnDurationMs: { type: Number, default: 0 },
      wpm: { type: Number, default: 0 }
    }
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['debate', 'pitch'],
      default: 'debate',
      required: true
    },
    topic: {
      type: String,
      required: true,
      trim: true
    },
    userSide: {
      type: String,
      enum: ['for', 'against'],
      required: true
    },
    userKey: {
      type: String,
      required: true,
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date
    },
    turns: [turnSchema],
    metrics: {
      // Plain objects, NOT Mongoose Maps per spec
      fillerCounts: { type: Object, default: {} },
      totalFillers: { type: Number, default: 0 },
      hedgeCounts: { type: Object, default: {} },
      totalHedges: { type: Number, default: 0 },
      avgWpm: { type: Number, default: 0 },
      avgLatencyMs: { type: Number, default: 0 },
      avgAnswerWords: { type: Number, default: 0 },
      longestAnswerWords: { type: Number, default: 0 }
    },
    report: {
      verdict: {
        winner: { type: String, enum: ['user', 'opponent', 'draw'] },
        reason: { type: String }
      },
      overallScore: { type: Number, min: 0, max: 100 },
      rubric: {
        argumentStrength: { score: Number, reason: String },
        evidence: { score: Number, reason: String },
        rebuttal: { score: Number, reason: String },
        structure: { score: Number, reason: String },
        persuasiveness: { score: Number, reason: String }
      },
      unansweredPoints: [{ type: String }],
      weakestMoments: [
        {
          quote: { type: String },
          whyWeak: { type: String },
          strongerVersion: { type: String }
        }
      ],
      nextSteps: [{ type: String }]
    },
    emailedTo: [{ type: String }],
    isSeeded: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Session = mongoose.model('Session', sessionSchema);

