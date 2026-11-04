# VoiceCoach — Project Documentation

**Author:** Deepanshu (solo), final-year B.E. CSE, Panchkula
**Event:** Voice AI Hackathon (6 hours, solo) — PDF track: *Debate and pitch practice partner*
**GitHub:** `<ADD GITHUB URL HERE>`  |  **Live URL:** `<ADD LIVE URL HERE>`

---

## 1. What I built

VoiceCoach is a voice-based debate practice partner. The user chooses a motion and a side, then debates an AI opponent entirely by voice. At the end, instead of "thank you", they get a **measured scorecard**.

**Why:** I took the HackerRank AI interview. It was fully conversational with a live transcript of both sides, but ended with no feedback at all. People practising for interviews, debates and pitches need to know *what* was weak. VoiceCoach keeps the conversational format and adds feedback that can be measured and tracked.

## 2. How it works

### 2.1 Pipeline

```
Mic → Web Speech API (STT) → POST /turn → Gemini → rebuttal JSON → SpeechSynthesis (TTS)
                                         ↓
                                  saved in MongoDB
End → POST /end → deterministic metrics + Gemini judge → scorecard → History chart / Email
```

### 2.2 Voice loop (frontend, `useVoiceLoop.js`)

A state machine: `IDLE → AI_SPEAKING → LISTENING → PROCESSING → ENDED`.

- The AI speaks via SpeechSynthesis. When it finishes, a 500 ms gap passes before the mic opens (so the mic doesn't hear the AI).
- The user speaks; interim results show live. A 2.5 s silence timer or the **Done speaking** button submits the turn.
- A 10 s no-speech guard re-prompts the user.
- An echo check discards transcripts that mostly match the AI's own last line.
- Timing (`firstWordAt`, `lastWordAt`, `aiEndedAt`) is captured per turn for the metrics.
- A typed-input fallback exists for when STT fails.

### 2.3 Opponent (backend, `gemini.js` + `prompts.js`)

- System prompt forces the AI to argue the **opposite** side, stay ≤ 40 words, use no markdown (it is spoken aloud), quote the user's own phrase, and demand evidence.
- Output is constrained with `responseSchema` to `{ reply, shouldEnd }`.
- Only the last 6 turns are sent to keep latency and token use low.
- 7 s timeout, one retry, then a canned fallback rebuttal that is flagged in the UI.

### 2.4 Scorecard

Two independent parts, kept separate on purpose:

1. **Deterministic metrics (`metrics.js`)**: filler words, hedge words, average WPM (bounded 40–250), response latency, average and longest answer length. No AI, so these numbers are reproducible.
2. **AI judge (`gemini.js`)**: a neutral judge prompt returns a schema-validated JSON report: verdict (user / opponent / draw), overall score, 5 rubric scores with reasons, unanswered points, weakest moments (quote → why weak → stronger version), next steps.

`/end` is idempotent: once a report exists it is returned from the database instead of regenerating it.

### 2.5 History and email

- Sessions are stored in MongoDB with turns, metrics and report. The History page lists them and `ProgressChart` plots scores over time.
- Email uses Nodemailer over Gmail SMTP (587, STARTTLS, app password). If sending fails, the API returns `sent: false` and the UI says the email was **not sent**. It never claims success for a console log.

## 3. Key features

- Real-time voice debate with live two-sided transcript
- Opposing-side AI opponent that attacks the weakest claim
- Scorecard: verdict, rubric, weakest moments with rewrites, next steps
- Deterministic speech metrics (fillers, hedges, WPM, latency, answer length)
- Session history with progress chart
- Email scorecard with honest failure message
- Config-driven modes (`constants.js`): debate live, pitch placeholder
- In-memory session fallback when MongoDB is unreachable
- Startup Gemini self-check and `/api/health` endpoint

## 4. Technical decisions

| Decision | Reason |
|---|---|
| Browser Web Speech API + SpeechSynthesis | Zero setup, no extra API cost or keys, fast enough for a 6-hour build |
| `generateContent` + `responseSchema` | The Interactions API failed on JSON schema in testing; schema-constrained JSON makes the output parseable |
| `thinkingLevel: LOW` | `minimal` is not supported on the chosen model; LOW keeps latency acceptable for voice |
| Model name from `GEMINI_MODEL` env | Change the model without code changes; startup fails loudly if missing |
| Metrics separated from the AI judge | Numbers a user can trust and reproduce; the LLM only judges argument quality |
| Config-driven modes | Pitch mode can be added by config + prompt, not a rewrite |
| 40-word opponent replies | Short spoken turns keep the conversation fast and the 3-minute demo feasible |
| Plain objects (not Mongoose Maps) for metrics | Simpler serialization to the frontend |

## 5. Challenges

- **Gemini free-tier quota.** About 20 generation requests per day on this model; I hit a 429 during development. A full debate costs ~4 requests, so I had to limit test runs and keep a fallback path so the demo doesn't crash.
- **Voice loop reliability.** The mic can pick up the AI's own TTS, silence detection can cut users off, and Chrome's recognition ends unpredictably. I added the post-TTS delay, echo detection, silence/no-speech timers and a typed fallback.
- **Structured output.** The Interactions API failed on JSON schema, so I switched to `generateContent` with `responseSchema`.
- **Honesty about mocks.** Fallback replies, sample sessions and email failures are labelled in the UI rather than hidden.
- **Time limit.** A solo 6-hour build forced scope cuts: debate first, pitch mode left as a placeholder.

## 6. My contribution and work done

- Chose the problem, the track and the product idea (from my own experience with the HackerRank AI interview).
- Defined the scoring approach: split measured metrics from AI judgement, and added a progress history.
- Decided the stack and the architecture (folder layout, API shape, config-driven modes).
- Directed the build in phases using **Google Antigravity** (AI coding agent): scaffold → voice loop → Gemini opponent → metrics and judge → persistence, history, email → polish and docs.
- Reviewed the generated code, identified bugs (listed in section 8) and debugged API issues (Interactions API schema failure, `thinkingLevel` support, 429 quota).
- Set up MongoDB Atlas, Gmail SMTP and Gemini configuration.

*Note for transparency:* much of the code was generated by an AI coding agent under my direction; my work was the design, direction, review and integration.

## 7. Real vs mocked

| Part | Status |
|---|---|
| STT / TTS | Real (browser APIs) |
| Opponent replies | Real Gemini; canned fallback when Gemini fails (flagged "AI fallback used") |
| Judge report | Real Gemini; hardcoded generic fallback if Gemini fails (see below) |
| Metrics | Real, deterministic |
| Sample history sessions | Mocked, labelled "Sample data" |
| Email | Real if SMTP set, otherwise "not sent" |
| Pitch mode | Not implemented |

## 8. Known limitations and next steps

Found during my own code review; not all are fixed yet:

1. **Judge fallback is a canned report** and is saved like a real one. It should be an explicit "scorecard unavailable, retry" with only the measured metrics shown.
2. **Output token limits are low** (250 for turns, 1000 for the judge), which can truncate JSON and trigger the fallback.
3. "Done speaking" can lose the last unfinalised words.
4. Possible stale closures in the voice hook and no double-submit guard.
5. `shouldEnd` is trusted from the model; it should be computed server-side.
6. Typed turns get a fake speaking time, so their WPM is not meaningful; empty-data metric defaults (130 WPM, 1200 ms) should be null.
7. Concurrent `/end` calls can run the judge twice.
8. Judge quotes are not verified against the transcript.
9. Email HTML does not escape user text.
10. Pitch (AI investor) mode, authentication, and more languages are not built.

## 9. How to run

See the README for setup, `.env` variables, seeding and the API table.

## 10. Demo flow (3 minutes)

| Time | Action |
|---|---|
| 0:00–0:20 | Problem: AI interviews give no feedback |
| 0:20–0:30 | Pick a motion and a side |
| 0:30–1:30 | 3-turn voice debate |
| 1:30–2:15 | Scorecard: verdict, rubric, weakest moments, metrics |
| 2:15–2:40 | History chart (point out the "Sample data" labels) |
| 2:40–3:00 | Email the scorecard |
