import React, { useState } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { ModeCard } from '../components/ModeCard';

const MODES = [
  {
    id: 'debate',
    label: 'Debate Sparring',
    description: 'Face an AI opponent who argues the opposite side of a controversial motion and challenges weak premises.',
    active: true
  },
  {
    id: 'pitch',
    label: 'Startup Pitch Practice',
    description: 'Pitch your startup or hackathon idea to an AI investor who grills your traction, moat, and business model.',
    active: false,
    badge: 'Coming Soon'
  }
];

const TOPICS = [
  'AI-generated code should be banned in university introductory CS courses',
  'Remote work hurts career growth for entry-level engineering graduates',
  'Social media algorithms should be mandated by law to be open-source',
  'College degrees are becoming obsolete in the era of generative AI',
  'Startups should prioritize profitability over hyper-growth from day one',
  'Coding interviews should completely eliminate algorithmic leetcode questions',
  'Autonomous AI agents should not be granted autonomous financial transaction rights',
  'Standardized campus placements do more harm than good to student innovation'
];

export const SetupPage = ({ onStart }) => {
  const [selectedMode, setSelectedMode] = useState('debate');
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [selectedSide, setSelectedSide] = useState('against');
  const { serverStatus } = useSessionStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onStart) {
      onStart({ mode: selectedMode, topic: selectedTopic, userSide: selectedSide });
    }
  };

  return (
    <div className="setup-page">
      <div className="setup-hero">
        <h1 className="hero-title">Master Verbal Arguments Under Pressure</h1>
        <p className="hero-subtitle">
          Real AI screens end with "thank you" and give no feedback. VoiceCoach turns voice debates into measured, actionable report cards.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="setup-form">
        <section className="form-section">
          <label className="section-label">1. Select Mode</label>
          <div className="modes-grid">
            {MODES.map((m) => (
              <ModeCard
                key={m.id}
                mode={m}
                isSelected={selectedMode === m.id}
                onSelect={setSelectedMode}
              />
            ))}
          </div>
        </section>

        <section className="form-section">
          <label htmlFor="topic-select" className="section-label">
            2. Choose Debate Motion
          </label>
          <select
            id="topic-select"
            className="select-input"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            {TOPICS.map((topic, i) => (
              <option key={i} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </section>

        <section className="form-section">
          <label className="section-label">3. Choose Your Stance</label>
          <div className="sides-group" role="radiogroup" aria-label="Stance selection">
            <button
              type="button"
              className={`side-btn ${selectedSide === 'for' ? 'active-for' : ''}`}
              onClick={() => setSelectedSide('for')}
              aria-checked={selectedSide === 'for'}
              role="radio"
            >
              <span className="side-badge">FOR</span>
              <span className="side-desc">You support the motion. AI opposes.</span>
            </button>
            <button
              type="button"
              className={`side-btn ${selectedSide === 'against' ? 'active-against' : ''}`}
              onClick={() => setSelectedSide('against')}
              aria-checked={selectedSide === 'against'}
              role="radio"
            >
              <span className="side-badge">AGAINST</span>
              <span className="side-desc">You oppose the motion. AI supports. (Demo Recommended)</span>
            </button>
          </div>
        </section>

        <div className="action-row">
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={serverStatus === 'disconnected'}
          >
            Launch Voice Debate (3 Turns) →
          </button>
        </div>
      </form>
    </div>
  );
};

