import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectDB } from './index.js';
import { Session } from '../models/session.model.js';

export const seedSampleSessions = async () => {
  await connectDB();

  // Check if seeded sessions already exist to ensure idempotency
  const existingCount = await Session.countDocuments({ isSeeded: true });
  if (existingCount >= 2) {
    console.log(`[Seed] Database already has ${existingCount} sample sessions. Skipping.`);
    return;
  }

  // Clear any existing seeded documents to prevent duplicates
  await Session.deleteMany({ isSeeded: true });

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

  const sampleSessions = [
    {
      mode: 'debate',
      topic: 'Coding interviews should completely eliminate algorithmic leetcode questions',
      userSide: 'for',
      userKey: 'seed_benchmark_user',
      isSeeded: true,
      startedAt: twoDaysAgo,
      endedAt: new Date(twoDaysAgo.getTime() + 180000),
      turns: [
        {
          role: 'assistant',
          text: 'Welcome to the debate arena. You are arguing FOR eliminating algorithmic leetcode questions. Please state your opening argument.'
        },
        {
          role: 'user',
          text: 'I think leetcode questions basically measure memorization rather than real software development engineering skills.'
        },
        {
          role: 'assistant',
          text: 'While memorization is a factor, algorithmic problem-solving tests foundational data structures and cognitive aptitude under pressure. What objective metric replaces it?'
        },
        {
          role: 'user',
          text: 'Maybe take-home projects or evaluating actual open-source contributions would measure real-world performance much better.'
        },
        {
          role: 'assistant',
          text: 'Take-home projects create massive cheating vulnerabilities with generative AI and place excessive unpaid time burdens on candidates. How do you standardize grading across thousands of applicants?'
        },
        {
          role: 'user',
          text: 'You can use live code reviews of existing codebases instead of puzzle solving.'
        },
        {
          role: 'assistant',
          text: 'Thank you for this debate. Both sides raised valid points regarding standardized assessment versus practical competency. The session is concluded.'
        }
      ],
      metrics: {
        avgWpm: 108,
        avgLatencyMs: 2400,
        totalFillers: 6,
        fillerCounts: { um: 2, like: 2, basically: 2 },
        totalHedges: 4,
        hedgeCounts: { 'i think': 2, maybe: 2 },
        avgAnswerWords: 24,
        longestAnswerWords: 34
      },
      report: {
        verdict: {
          winner: 'opponent',
          reason: 'Opponent successfully demonstrated the standardized necessity and scale requirements of technical filters, while candidate struggled to present an objective grading alternative.'
        },
        overallScore: 66,
        rubric: {
          argumentStrength: { score: 6, reason: 'Valid critique of rote memorization, but failed to propose scalable alternatives.' },
          evidence: { score: 5, reason: 'Relied largely on general impressions rather than recruitment metrics.' },
          rebuttal: { score: 6, reason: 'Partially addressed cheating concerns without offering concrete anti-plagiarism mechanisms.' },
          structure: { score: 7, reason: 'Clear sequential flow from premise to alternative suggestions.' },
          persuasiveness: { score: 6, reason: 'Frequent hesitations and hedge words weakened authoritative tone.' }
        },
        unansweredPoints: [
          'Standardization and anti-cheating mechanisms for take-home projects with generative AI'
        ],
        weakestMoments: [
          {
            quote: 'I think leetcode questions basically measure memorization...',
            whyWeak: 'Opening with "I think" and "basically" immediately projects hesitation.',
            strongerVersion: 'Algorithmic puzzle interviews test synthetic memorization rather than production engineering competence.'
          },
          {
            quote: 'Maybe take-home projects or evaluating actual open-source...',
            whyWeak: 'Speculative phrasing fails to counter the opponent concrete standardization challenge.',
            strongerVersion: 'Practical pair programming on open-source repositories provides empirical evidence of code comprehension.'
          }
        ],
        nextSteps: [
          'Eliminate tentative opening phrases like "I think" and "maybe".',
          'Anticipate scalability and anti-fraud arguments in recruitment debates.',
          'Pace delivery closer to 130 WPM to project greater verbal confidence.'
        ]
      }
    },
    {
      mode: 'debate',
      topic: 'Remote work hurts career growth for entry-level engineering graduates',
      userSide: 'against',
      userKey: 'seed_benchmark_user',
      isSeeded: true,
      startedAt: oneDayAgo,
      endedAt: new Date(oneDayAgo.getTime() + 180000),
      turns: [
        {
          role: 'assistant',
          text: 'Welcome to the debate arena. You are arguing AGAINST the claim that remote work hurts career growth. Please state your opening argument.'
        },
        {
          role: 'user',
          text: 'Remote work empowers junior engineers to develop superior written documentation skills and collaborate directly with global subject matter experts.'
        },
        {
          role: 'assistant',
          text: 'Junior developers learn exponentially through ambient knowledge transfer and rapid desk-side debugging. How do asynchronous Slack threads replicate that osmosis?'
        },
        {
          role: 'user',
          text: 'While desk-side conversations feel faster, async communication creates searchable permanent engineering knowledge that scales across the entire team.'
        },
        {
          role: 'assistant',
          text: 'Documentation is vital, but promotions and sponsorship depend heavily on interpersonal trust and executive visibility. How do entry-level hires build organizational capital behind a muted camera?'
        },
        {
          role: 'user',
          text: 'Organizational capital in high-performing engineering teams is built on merged PRs, clean system designs, and reliable on-call incident response, not hallway proximity.'
        },
        {
          role: 'assistant',
          text: 'Both sides presented exceptionally compelling points regarding serendipitous mentorship versus objective merit-based advancement. The session has concluded.'
        }
      ],
      metrics: {
        avgWpm: 135,
        avgLatencyMs: 1250,
        totalFillers: 2,
        fillerCounts: { basically: 1, like: 1 },
        totalHedges: 1,
        hedgeCounts: { 'i think': 1 },
        avgAnswerWords: 34,
        longestAnswerWords: 42
      },
      report: {
        verdict: {
          winner: 'user',
          reason: 'Candidate effectively countered the opponent osmosis argument by demonstrating how written engineering documentation and merit-based metrics build verifiable career growth.'
        },
        overallScore: 84,
        rubric: {
          argumentStrength: { score: 9, reason: 'Compelling emphasis on verifiable code contributions versus superficial hallway visibility.' },
          evidence: { score: 8, reason: 'Strong concrete references to pull request reviews and incident response.' },
          rebuttal: { score: 8, reason: 'Directly conceded the immediate feel of desk-side debugging before reframing to scalable knowledge.' },
          structure: { score: 8, reason: 'Strong premise-concession-rebuttal structure in each turn.' },
          persuasiveness: { score: 8, reason: 'Brisk, confident pace with assertive vocabulary.' }
        },
        unansweredPoints: [
          'Tactics for navigating executive sponsorship in traditionally conservative corporate hierarchies'
        ],
        weakestMoments: [
          {
            quote: 'While desk-side conversations feel faster...',
            whyWeak: 'Conceding that physical interactions feel faster gives temporary ground without qualification.',
            strongerVersion: 'Unstructured desk-side interruptions create an illusion of speed while disrupting deep engineering focus.'
          }
        ],
        nextSteps: [
          'Address executive sponsorship directly in career growth motions.',
          'Maintain this optimal 135 WPM pace across subsequent rounds.',
          'Continue pairing concessions with sharp architectural pivots.'
        ]
      }
    }
  ];

  await Session.insertMany(sampleSessions);
  console.log('[Seed] Successfully seeded 2 benchmark sample sessions with isSeeded=true.');
};

// If run directly: node src/db/seed.js
if (process.argv[1]?.endsWith('seed.js')) {
  seedSampleSessions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error:', err);
      process.exit(1);
    });
}

