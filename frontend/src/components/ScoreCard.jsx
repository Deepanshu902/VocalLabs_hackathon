import React from 'react';

const RUBRIC_LABELS = {
  argumentStrength: 'Argument Strength',
  evidence: 'Evidence & Precedents',
  rebuttal: 'Rebuttal Precision',
  structure: 'Logical Structure',
  persuasiveness: 'Persuasiveness & Tone'
};

export const ScoreCard = ({ report = {} }) => {
  const {
    verdict = { winner: 'draw', reason: 'Deliberation concluded.' },
    overallScore = 75,
    rubric = {},
    unansweredPoints = [],
    weakestMoments = [],
    nextSteps = []
  } = report;

  const getWinnerBadge = (winner) => {
    if (winner === 'user') return { text: 'Candidate Victory', class: 'verdict-user' };
    if (winner === 'opponent') return { text: 'Opponent Victory', class: 'verdict-opponent' };
    return { text: 'Contested Draw', class: 'verdict-draw' };
  };

  const winnerInfo = getWinnerBadge(verdict.winner);

  return (
    <div className="scorecard-container">
      {/* 1. Verdict & Overall Score Hero */}
      <div className="card verdict-card">
        <div className="verdict-main">
          <div className="verdict-header-row">
            <span className={`verdict-pill ${winnerInfo.class}`}>{winnerInfo.text}</span>
            <span className="badge badge-active">Impartial Adjudication</span>
          </div>
          <h2 className="verdict-headline">Official Adjudicator Verdict</h2>
          <p className="verdict-reason">{verdict.reason}</p>
        </div>

        <div className="score-circle-wrapper">
          <div className="score-circle">
            <span className="score-num">{overallScore}</span>
            <span className="score-denom">/ 100</span>
          </div>
          <span className="score-label">Overall Performance</span>
        </div>
      </div>

      {/* 2. Rubric Breakdown */}
      <div className="card rubric-card">
        <h3 className="section-title">Judicial Rubric Evaluation (1-10)</h3>
        <div className="rubric-grid">
          {Object.entries(rubric).map(([key, data]) => {
            const label = RUBRIC_LABELS[key] || key;
            const score = data?.score || 5;
            return (
              <div key={key} className="rubric-item">
                <div className="rubric-label-row">
                  <span className="rubric-name">{label}</span>
                  <span className="rubric-score-badge">{score} / 10</span>
                </div>
                <div className="rubric-progress-bg">
                  <div
                    className="rubric-progress-fill"
                    style={{ width: `${Math.min(100, score * 10)}%` }}
                  />
                </div>
                <p className="rubric-reason-text">{data?.reason}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Weakest Moments & Sharp Rewrites */}
      {weakestMoments.length > 0 && (
        <div className="card weakest-moments-card">
          <h3 className="section-title">3 Weakest Moments & Actionable Rewrites</h3>
          <p className="section-subtitle">Real quotes from your transcript alongside competitive upgrades.</p>
          <div className="moments-list">
            {weakestMoments.map((moment, i) => (
              <div key={i} className="moment-card">
                <div className="moment-quote-box">
                  <span className="moment-tag tag-weak">What You Said:</span>
                  <p className="moment-quote-text">"{moment.quote}"</p>
                  <p className="moment-flaw">{moment.whyWeak}</p>
                </div>
                <div className="moment-upgrade-box">
                  <span className="moment-tag tag-strong">Stronger Argument:</span>
                  <p className="moment-upgrade-text">"{moment.strongerVersion}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Unanswered Points & Next Steps Grid */}
      <div className="two-col-grid">
        {unansweredPoints.length > 0 && (
          <div className="card callout-card">
            <h4 className="card-subheading">Unaddressed Opponent Points</h4>
            <ul className="bullet-list">
              {unansweredPoints.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          </div>
        )}

        {nextSteps.length > 0 && (
          <div className="card callout-card">
            <h4 className="card-subheading">Tactical Next Steps</h4>
            <ul className="bullet-list checked-list">
              {nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

