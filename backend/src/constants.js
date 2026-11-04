export const MODES = {
  debate: {
    id: 'debate',
    label: 'Debate Sparring',
    description: 'Face an AI opponent who argues the opposing side of a controversial motion and challenges weak premises.',
    active: true,
    maxUserTurns: 3, // Set to 3 for the 3-minute hackathon demo
    maxWordsPerTurn: 40,
    rubricCriteria: [
      'argumentStrength',
      'evidence',
      'rebuttal',
      'structure',
      'persuasiveness'
    ]
  },
  pitch: {
    id: 'pitch',
    label: 'Startup Pitch Practice',
    description: 'Pitch your startup or hackathon idea to an AI investor who grills your traction, moat, and business model.',
    active: false,
    badge: 'Coming Soon'
  }
};

export const DEBATE_TOPICS = [
  'AI-generated code should be banned in university introductory CS courses',
  'Remote work hurts career growth for entry-level engineering graduates',
  'Social media algorithms should be mandated by law to be open-source',
  'College degrees are becoming obsolete in the era of generative AI',
  'Startups should prioritize profitability over hyper-growth from day one',
  'Coding interviews should completely eliminate algorithmic leetcode questions',
  'Autonomous AI agents should not be granted autonomous financial transaction rights',
  'Standardized campus placements do more harm than good to student innovation'
];

export const DEFAULT_TOPIC = DEBATE_TOPICS[0];
export const DEFAULT_USER_SIDE = 'against';

export const FILLER_WORDS = [
  'um',
  'uh',
  'like',
  'basically',
  'actually',
  'you know',
  'matlab',
  'i mean'
];

export const HEDGE_WORDS = [
  'i think',
  'maybe',
  'kind of',
  'sort of',
  'probably',
  'i guess'
];

export const FALLBACK_REBUTTAL =
  'That is an interesting point, but it overlooks key practical and ethical consequences. How do you address the risk of unintended systemic harm?';

export const NO_SPEECH_PROMPT =
  "I didn't catch that. Take your time, what is your opening or counter-argument on this motion?";

