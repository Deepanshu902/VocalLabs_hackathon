# VoiceCoach — Architectural Plan & Hackathon Roadmap

## 1. Executive Summary
**VoiceCoach** is a voice-based debate practice partner modeled on the format of an AI interview screen. Built for a solo 6-hour hackathon, it delivers a strict turn-taking debate between a human user and an AI opponent arguing the opposite side out loud, followed by a measured scorecard (combining deterministic speech metrics with a strict neutral AI judge verdict), session history tracking, and scorecard emailing.

Modes are entirely **config-driven**: Debate mode is implemented first (`maxUserTurns` dynamically injected from config, set to 3 for a 3-minute demo), with Pitch practice configured as an explicit placeholder.

---

## 2. Full File Tree

```
voicecoach/
├── PLAN.md                               # Living phase tracking and implementation plan
├── README.md                             # Project overview, Real vs Mocked, 3-min demo script
├── backend/
│   ├── .env.example                      # Documented environment variables (GEMINI_MODEL, etc.)
│   ├── .gitignore                        # node_modules, .env
│   ├── .dockerignore                     # Docker exclusions
│   ├── package.json                      # Express, Mongoose, @google/genai, Nodemailer, cors, dotenv
│   └── src/
│       ├── index.js                      # Loads env, connects DB, starts HTTP server
│       ├── app.js                        # Express app config, JSON middleware, CORS, mount routes
│       ├── constants.js                  # MODES config (debate + pitch placeholder), topics, rubrics, fillers, hedges, limits
│       ├── db/
│       │   ├── index.js                  # Mongoose connection with retry/graceful shutdown
│       │   └── seed.js                   # Seed script for 2 benchmark sample sessions (isSeeded=true)
│       ├── models/
│       │   └── session.model.js          # Mongoose schema: mode, topic, userSide, turns, metrics (plain objects), report, isSeeded
│       ├── routers/
│       │   ├── interview.routes.js       # POST /api/sessions, POST /api/sessions/:id/turn, POST /api/sessions/:id/end
│       │   └── session.routes.js         # GET /api/sessions (userKey + isSeeded), GET /api/sessions/:id, POST /api/sessions/:id/email
│       ├── controller/
│       │   ├── interview.controller.js   # Orchestrates debate session start, turn reply, and idempotent session end
│       │   └── session.controller.js     # Orchestrates session listing, retrieval, and scorecard emailing
│       ├── middleware/
│       │   ├── errorHandler.js           # Centralized API error converter and handler
│       │   ├── rateLimiter.js            # Light in-memory sliding window limiter to prevent API abuse
│       │   └── validate.js               # Request payload validation middleware
│       └── utils/
│           ├── ApiError.js               # Custom error class with HTTP status codes
│           ├── asyncHandler.js           # Async route wrapper to catch uncaught rejections
│           ├── gemini.js                 # Unified @google/genai caller (timeout, 1 retry, responseSchema parse guard, generic fallback)
│           ├── prompts.js                # System prompts for opponent (dynamic maxTurns) and neutral judge
│           ├── metrics.js                # 100% deterministic speech metrics (fillers, hedges, WPM, latencies)
│           └── mailer.js                 # Nodemailer transport setup & HTML email (returns {sent:false, mode:'logged'} if unconfigured)
└── frontend/
    ├── .gitignore
    ├── index.html                        # HTML entry point with title and fonts
    ├── package.json                      # React, Vite, Zustand, Recharts (plain CSS)
    ├── vite.config.js                    # Vite config with proxy to backend /api
    └── src/
        ├── assets/                       # Icons / static SVGs
        ├── components/
        │   ├── TopNav.jsx                # Header with navigation (Debate, History), status indicator
        │   ├── ModeCard.jsx              # Mode selection card (Debate active, Pitch disabled/coming soon)
        │   ├── Transcript.jsx            # Two-sided scrolling transcript with live captions & aria-live
        │   ├── MicControl.jsx            # Voice controls: Mic status, "Done speaking", "Type instead" emergency fallback
        │   ├── StatusBadge.jsx           # Distinct visual badges: Listening / Thinking / Speaking / Idle / Deliberating
        │   ├── MetricsPanel.jsx          # WPM, pause latency, filler count, hedge count with speech recognition disclaimer
        │   ├── ScoreCard.jsx             # Judge verdict (winner/reason), rubric breakdown, weakest moments + stronger versions
        │   └── ProgressChart.jsx         # Attempt-over-attempt score trend using Recharts (labels seeded data as "Sample data")
        ├── hooks/
        │   └── useVoiceLoop.js           # Core voice state machine hook (SpeechRecognition + SpeechSynthesis + watchdog + no-speech timeout)
        ├── pages/
        │   ├── SetupPage.jsx             # Mode selection, topic selector (8 motions), side selector (For/Against), Start button
        │   ├── DebatePage.jsx            # Active debate view: TopNav, StatusBadge, Transcript, MicControl, Type-fallback modal
        │   ├── ReportPage.jsx            # Session result view: ScoreCard, MetricsPanel, Email scorecard modal, "Practice Again"
        │   └── HistoryPage.jsx           # Past sessions table, attempt progress chart, links to individual reports
        ├── services/
        │   ├── api.js                    # Fetch client communicating with backend /api
        │   ├── speechRecognition.js      # Browser Web Speech API wrapper with en-IN and auto-restart watchdog
        │   └── speechSynthesis.js       # Browser SpeechSynthesis wrapper with local voice priority and watchdog fallback timer
        ├── store/
        │   └── useSessionStore.js        # Zustand global store: activeSession, turns, voiceState, error, history
        ├── App.jsx                       # Page routing switch (Setup, Debate, Report, History)
        ├── App.css                       # Layout, styling variables, responsive styles
        ├── index.css                     # Global reset, typography, accessibility focus states
        └── main.jsx                      # React 18 DOM mount
```

---

## 3. API Contract

| Method | Endpoint | Request Body | Response Body | Description |
|---|---|---|---|---|
| `GET` | `/api/health` | _None_ | `{ "status": "ok", "timestamp": "ISO..." }` | Health check & connectivity probe |
| `POST` | `/api/sessions` | `{ "mode": "debate", "topic": "...", "userSide": "for"\|"against", "userKey": "uuid" }` | `{ "sessionId": "id", "openingLine": "..." }` | Creates new session, generates AI opening invitation (capped ~40 words) |
| `POST` | `/api/sessions/:id/turn` | `{ "transcript": "...", "timing": { "aiEndedAt": 1700000000, "firstWordAt": 1700001000, "lastWordAt": 1700005000 } }` | `{ "reply": "...", "shouldEnd": false\|true }` | Non-streaming turn evaluation. AI reply capped at ~40 words. Rebuttal against user. |
| `POST` | `/api/sessions/:id/end` | _None_ | `{ "metrics": { ... }, "report": { ... } }` | **Idempotent**. If already generated, returns saved metrics & report. Otherwise runs deterministic metrics + neutral judge Gemini call. |
| `GET` | `/api/sessions?userKey=...` | _Query param `userKey`_ | `[ { "_id": "...", "topic": "...", "userSide": "...", "startedAt": "...", "metrics": { ... }, "report": { ... }, "isSeeded": true\|false } ]` | **Returns user's sessions PLUS all isSeeded sessions** so benchmark data always renders in history. |
| `GET` | `/api/sessions/:id` | _None_ | `{ "session": { ... } }` | Fetches full session data including transcript, metrics, and judge report |
| `POST` | `/api/sessions/:id/email` | `{ "to": "user@example.com" }` | `{ "sent": true\|false, "mode": "sent"\|"logged", "message": "..." }` | If SMTP is unset/fails, returns `{ "sent": false, "mode": "logged" }` and logs to server console. UI explicitly informs user email was not sent. |

---

## 4. Data Model (Mongoose `Session` Schema)

```javascript
{
  mode: { type: String, enum: ['debate', 'pitch'], default: 'debate', required: true },
  topic: { type: String, required: true },
  userSide: { type: String, enum: ['for', 'against'], required: true },
  userKey: { type: String, required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  turns: [
    {
      role: { type: String, enum: ['user', 'assistant'], required: true },
      text: { type: String, required: true },
      timing: {
        aiEndedAt: { type: Number },     // Epoch ms when previous AI speech finished
        firstWordAt: { type: Number },   // Epoch ms when user started speaking
        lastWordAt: { type: Number },    // Epoch ms when user stopped speaking
        latencyMs: { type: Number },     // firstWordAt - aiEndedAt
        turnDurationMs: { type: Number },// lastWordAt - firstWordAt
        wpm: { type: Number }            // (words / turnDurationMin)
      }
    }
  ],
  metrics: {
    // Plain objects, NOT Mongoose Maps
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
      winner: { type: String },          // 'user' | 'opponent' | 'draw'
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
  isSeeded: { type: Boolean, default: false }
}
```

---

## 5. Voice State Machine & Safety Watchdogs

```
                   [ Start Debate / Page Mount ]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │         IDLE          │
                     └───────────┬───────────┘
                                 │
                 (Session created, openingLine received)
                                 │
                                 ▼
                     ┌───────────────────────┐
        ┌───────────>│      AI_SPEAKING      │<──────────┐
        │            └───────────┬───────────┘           │
        │                        │                       │
        │        (synthesis.onend OR watchdog timer)     │
        │        • mic paused during speech              │
        │        • record aiEndedAt = Date.now()         │
        │                        │                       │
        │                        ▼                       │
        │            ┌───────────────────────┐           │
        │            │       LISTENING       │           │
        │            └───────────┬───────────┘           │
        │                        │                       │
        │    ┌───────────────────┴───────────────────┐   │
        │    │                                       │   │
        │ (10s no-speech timeout)         (User speaks: 2.5s silence OR "Done speaking")
        │    │                                       │   │
        │ • AI prompts: "I didn't catch that..."     │   │
        │ • Loop back to AI_SPEAKING (no turn bump)  │   │
        │                                            │   │
        │                                            ▼   │
        │                               ┌───────────────────────┐
        │                               │      PROCESSING       │
        │                               └───────────┬───────────┘
        │                                           │
        │                                (POST /api/turn reply)
        │                                           │
        │                              ┌────────────┴────────────┐
(if shouldEnd == false)                │                         │ (if shouldEnd == true)
        │                              ▼                         │
        └──────────────────────────────┤                         │
                                                                 ▼
                                                    ┌────────────────────────┐
                                                    │   AI Closing Speech    │
                                                    └───────────┬────────────┘
                                                                │ (synthesis.onend)
                                                                ▼
                                                    (POST /api/sessions/:id/end)
                                                    • UI: "Judge is deliberating..."
                                                                │
                                                                ▼
                                                    ┌────────────────────────┐
                                                    │         ENDED          │
                                                    │   (Render Scorecard)   │
                                                    └────────────────────────┘
```

### Safety Features
1. **SpeechSynthesis Watchdog**: `speechSynthesis.js` calculates `expectedDuration = (wordCount / rate * 60) + 2000ms`. If `onend` fails to fire within that buffer, the watchdog automatically transitions to `LISTENING`.
2. **Local Voice Preference**: Speech synthesis checks `window.speechSynthesis.getVoices()` and prefers a local Indian English (`en-IN`) or English voice (`voice.localService === true`) to eliminate network synthesis lag.
3. **No-Speech 10s Guard**: If user enters `LISTENING` and no speech is detected after 10s, AI speaks a polite clarification without counting against `maxUserTurns`. Empty transcripts are never sent to `/api/turn`.
4. **Generic Fallback Rebuttal**: If Gemini takes > 5s or fails after 1 retry, returns: *"That is an interesting point, but it overlooks key practical and ethical consequences. How do you address the risk of unintended systemic harm?"* (Documented under "Real vs mocked").

---

## 6. Phase Breakdown & Status

- [x] **Phase 0: Architecture & Plan Specification (Complete & Approved)**
- [x] **Phase 1: Project Scaffolding & Health Probe (Complete)**
  - Backend scaffolded with ES modules, Express 4.21, Mongoose 8.9, @google/genai 2.32, Nodemailer 6.10, CORS, dotenv.
  - Express server, error handling, constants (MODES, topics, fillers, hedges), and `GET /api/health` verified.
  - Frontend scaffolded with React 18, Vite 6, Zustand 5, Recharts 2.15, plain CSS with responsive & accessible design tokens.
  - Vite proxy configured to backend port 5000. TopNav, ModeCard, SetupPage, and placeholder pages verified. Production build succeeded in 728ms.
- [x] **Phase 2: Voice Loop State Machine (Mock AI Reply) (Complete & Hardened)**
  - SpeechRecognition wrapper implemented with `en-IN`, interim results, and auto-restart guard on silence.
  - SpeechSynthesis wrapper implemented with local voice preference, ~40 word cap, and audio completion watchdog timer.
  - State machine hook `useVoiceLoop` coordinating `IDLE -> AI_SPEAKING -> LISTENING -> PROCESSING -> ENDED`.
  - Echo Protection Hardened: Abort called before all speech calls; 500ms safety gap after TTS ends before mic resumes; results arriving outside LISTENING dropped; software echo guard `isEchoOfAi` discards transcript bursts matching the AI utterance.
  - Background Mic Leak Fixed: Removed module-level singleton; hook lifecycle creates and disposes single recognition instance; pagehide and unmount handlers abort mic and cancel TTS cleanly.
  - Real Mic Visibility Added: "Mic: ON / OFF" indicator wired directly to recognition active state in both header and control bar.
- [x] **Phase 3: Gemini Turn Opponent Endpoint (Non-streaming, dynamic maxTurns) (Complete & Hardened)**
  - Removed all hardcoded model fallbacks; strictly requires `GEMINI_MODEL` from env (`gemini-3.8-flash`), exiting at startup if absent.
  - Used `@google/genai` `models.generateContent` with `thinkingConfig: { thinkingLevel: 'LOW' }` and native `responseSchema` (structured JSON). (Note: Interactions API does not currently support `response_mime_type` in `generation_config`).
  - Startup self-check and `GET /api/health` returning `gemini: "ok" | "missing_key" | "error"` and `db: "atlas" | "memory"`.
  - Every `/turn` response includes `source: "gemini" | "fallback"` and `latencyMs`. Server logs source and latency on every turn; frontend renders a visible "AI fallback used" notice when fallback is active.
  - Memory DB alert banner implemented in UI for when MongoDB is disconnected.
  - Real test verified with user key on MongoDB Atlas and Gemini.
- [x] **Phase 4: Deterministic Metrics & Idempotent Neutral Judge Report (Complete)**
  - Implemented `utils/metrics.js` for 100% deterministic speech metrics (filler counts, hedge counts, pace WPM, response latency ms, turn lengths). No AI hallucination.
  - Implemented `generateJudgeReport` in `utils/gemini.js` with Oxford-style neutral adjudicator prompt (winner, 0-100 overall score, 5 rubric scores 1-10 with reasons, unanswered opponent points, 3 weakest moments with verbatim quotes & rewrites, 3 next steps).
  - Added idempotency to `POST /api/sessions/:id/end` (cached report returned in ~50ms without duplicate Gemini calls).
  - Created accessible `MetricsPanel.jsx` (with speech recognition honesty note), `ScoreCard.jsx`, and `ReportPage.jsx` with "The Adjudicator is Deliberating..." loading animation.
- [x] **Phase 5: MongoDB Persistence, Seed Data, History Progress Chart & Email (Complete)**
  - Created `utils/mailer.js`: Nodemailer with SMTP; graceful fallback returns `{ sent: false, mode: 'logged' }` and logs HTML when SMTP is absent or fails. Never returns `sent: true` for a console log.
  - Created `routers/session.routes.js`: GET /, GET /:id, POST /:id/email — mounted in `app.js` alongside interview routes.
  - Seed script fixed to resolve `.env` path absolutely; `npm run seed` verified — 2 `isSeeded: true` sessions in Atlas (scores 66 → 84).
  - Created `components/ProgressChart.jsx`: Recharts LineChart with custom dots (amber = seeded, indigo = real), custom tooltip with "Sample data" badge, 70-score reference line.
  - Rewrote `pages/HistoryPage.jsx`: live API fetch, table with WinnerBadge + ScorePill, seeded rows show amber "Sample data" badge, "View Report" navigates to ReportPage pre-populated.
  - Rewrote `pages/ReportPage.jsx`: added inline EmailModal with SMTP-aware messaging ("Email could not be sent (SMTP not configured)" shown when `sent: false`).
  - Added Phase 5 CSS: spinner, chart card, legend dots, chart tooltip, history table, modal, email form, badge variants (badge-won, badge-lost).
  - Frontend build verified clean (✅ 464 modules, 0 errors).
- [x] **Phase 6: Polish, Accessibility & Demo Script & README (Complete)**
  - Created `README.md` with: project overview, tech stack table, setup instructions, API reference, full "Real vs Mocked" section (required by hackathon rules), 3-minute demo script, known limitations.
  - Emoji/icon fixes in ReportPage loading screen.
  - All seeded data labelled "Sample data" in UI; fallback always shown with "AI fallback used" badge; email fallback message explicit.
