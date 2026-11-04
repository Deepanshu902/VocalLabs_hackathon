/**
 * mailer.js — Nodemailer wrapper for scorecard emails.
 * If SMTP env vars are missing or transport fails, returns { sent: false, mode: 'logged' }.
 * NEVER returns sent: true for a console-logged email.
 */

import nodemailer from 'nodemailer';

/** Build the HTML body for a scorecard email. */
function buildHtml({ to, session }) {
  const { topic, userSide, report, metrics } = session;
  const { verdict, overallScore, rubric = {}, weakestMoments = [], nextSteps = [] } = report || {};

  const verdictLabel = verdict?.winner === 'user' ? '✅ You Won' : verdict?.winner === 'opponent' ? '❌ Opponent Won' : '🤝 Draw';
  const scoreColor = overallScore >= 80 ? '#22c55e' : overallScore >= 60 ? '#f59e0b' : '#ef4444';

  const rubricRows = Object.entries(rubric)
    .map(([key, val]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${label}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:${scoreColor};">${val.score}/10</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${val.reason || ''}</td>
        </tr>`;
    })
    .join('');

  const weakMomentItems = weakestMoments
    .map((m, i) => `
      <div style="margin-bottom:16px;padding:12px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:4px;">
        <p style="margin:0 0 4px 0;font-size:13px;color:#92400e;">📌 Weak Moment ${i + 1}</p>
        <p style="margin:0 0 6px 0;font-style:italic;color:#374151;">"${m.quote}"</p>
        <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;">${m.whyWeak}</p>
        <p style="margin:0;font-size:13px;color:#065f46;"><strong>Stronger:</strong> ${m.strongerVersion}</p>
      </div>`)
    .join('');

  const nextStepItems = nextSteps
    .map((step, i) => `<li style="margin-bottom:8px;color:#374151;">${step}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>VoiceCoach Scorecard</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.12);">

    <div style="background:#1e1b4b;padding:32px;text-align:center;">
      <p style="color:#a5b4fc;margin:0 0 4px 0;font-size:14px;letter-spacing:.05em;">VOICECOACH SCORECARD</p>
      <h1 style="color:#fff;margin:0;font-size:22px;line-height:1.3;">${topic || 'Debate Session'}</h1>
      <p style="color:#c7d2fe;margin:12px 0 0 0;font-size:14px;">Stance: <strong>${(userSide || '').toUpperCase()}</strong></p>
    </div>

    <div style="padding:24px;text-align:center;border-bottom:1px solid #e5e7eb;">
      <div style="display:inline-block;width:80px;height:80px;border-radius:50%;background:${scoreColor};line-height:80px;font-size:28px;font-weight:700;color:#fff;">${overallScore ?? '—'}</div>
      <p style="margin:12px 0 4px 0;font-size:18px;font-weight:600;color:#111827;">${verdictLabel}</p>
      <p style="margin:0;font-size:14px;color:#6b7280;">${verdict?.reason || ''}</p>
    </div>

    <div style="padding:24px;">
      <h2 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 16px 0;">📊 Rubric Breakdown</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;color:#374151;">Category</th>
            <th style="padding:8px 12px;text-align:left;color:#374151;">Score</th>
            <th style="padding:8px 12px;text-align:left;color:#374151;">Feedback</th>
          </tr>
        </thead>
        <tbody>${rubricRows}</tbody>
      </table>
    </div>

    ${metrics ? `
    <div style="padding:0 24px 24px;">
      <h2 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 12px 0;">🎙️ Speech Metrics</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div style="background:#f3f4f6;padding:12px;border-radius:8px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#1e1b4b;">${metrics.avgWpm ?? '—'}</p>
          <p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;">Avg WPM</p>
        </div>
        <div style="background:#f3f4f6;padding:12px;border-radius:8px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#1e1b4b;">${metrics.totalFillers ?? 0}</p>
          <p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;">Filler Words</p>
        </div>
        <div style="background:#f3f4f6;padding:12px;border-radius:8px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#1e1b4b;">${metrics.totalHedges ?? 0}</p>
          <p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;">Hedge Phrases</p>
        </div>
      </div>
    </div>` : ''}

    ${weakestMoments.length > 0 ? `
    <div style="padding:0 24px 24px;">
      <h2 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 12px 0;">⚠️ Weakest Moments</h2>
      ${weakMomentItems}
    </div>` : ''}

    ${nextSteps.length > 0 ? `
    <div style="padding:0 24px 24px;">
      <h2 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 12px 0;">🎯 Next Steps</h2>
      <ol style="padding-left:20px;margin:0;">${nextStepItems}</ol>
    </div>` : ''}

    <div style="background:#f3f4f6;padding:16px 24px;text-align:center;font-size:12px;color:#9ca3af;">
      Generated by VoiceCoach · AI-powered debate practice · <em>AI judge scores are automated estimates.</em>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send a scorecard email.
 * @returns {{ sent: boolean, mode: 'smtp'|'logged', messageId?: string }}
 */
export async function sendScorecardEmail({ to, session }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

  const html = buildHtml({ to, session });
  const subject = `Your VoiceCoach Scorecard — ${session.topic || 'Debate Session'}`;

  // Graceful fallback when SMTP is not configured
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[Mailer] SMTP not configured. Logging scorecard HTML to console instead.');
    console.log('===== SCORECARD EMAIL (not sent) =====');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(html);
    console.log('======================================');
    return { sent: false, mode: 'logged' };
  }

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  try {
    await transport.verify();
    const info = await transport.sendMail({
      from: MAIL_FROM || SMTP_USER,
      to,
      subject,
      html
    });
    console.log(`[Mailer] Sent scorecard to ${to} — messageId: ${info.messageId}`);
    return { sent: true, mode: 'smtp', messageId: info.messageId };
  } catch (err) {
    console.error('[Mailer] SMTP send failed:', err.message);
    console.log('===== SCORECARD EMAIL (send failed — logged) =====');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(html);
    console.log('==================================================');
    return { sent: false, mode: 'logged', error: err.message };
  }
}

