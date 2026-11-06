import { generateJson } from '../src/json';
import { acceptMcq, type Mcq, McqVerdict, verifyPrompt } from '../src/mcq';
import type { Eval } from './types';

// CA-04: the verifier must reject flawed MCQs (precision ≥ 95% of approved items being sound) and
// should accept sound ones. Planted flaws: two correct options, answer not in the source, wrong
// key, ambiguous wording. Mock mode replays recorded verdicts.

const opts = (a: string, b: string, c: string, d: string) => [
  { key: 'a', text: a },
  { key: 'b', text: b },
  { key: 'c', text: c },
  { key: 'd', text: d },
];

interface Case {
  name: string;
  sound: boolean;
  source: string;
  q: Mcq;
  /** Recorded verdict for mock mode. */
  mock: McqVerdict['checks'][number];
}

const SRC_RBI =
  'The Reserve Bank of India kept the policy repo rate unchanged at 5.50 per cent. The Monetary Policy Committee voted 5-1 for the decision and retained a neutral stance.';
const SRC_PIB =
  'The Union Cabinet approved the National Critical Mineral Mission with an outlay of Rs 16,300 crore. The mission covers exploration, mining, processing and recycling of critical minerals.';

const cases: Case[] = [
  {
    name: 'sound: repo rate unchanged',
    sound: true,
    source: SRC_RBI,
    q: {
      stem: 'At what level did the RBI keep the policy repo rate?',
      options: opts('5.25 per cent', '5.50 per cent', '5.75 per cent', '6.00 per cent'),
      answer: 'b',
    },
    mock: { index: 0, answer: 'b', singleCorrect: true, grounded: true, unambiguous: true },
  },
  {
    name: 'sound: mission scope (how many)',
    sound: true,
    source: SRC_PIB,
    q: {
      stem: 'Consider: 1. Exploration 2. Processing 3. Recycling. How many of the above are covered by the National Critical Mineral Mission?',
      options: opts('Only one', 'Only two', 'All three', 'None'),
      answer: 'c',
    },
    mock: { index: 0, answer: 'c', singleCorrect: true, grounded: true, unambiguous: true },
  },
  {
    name: 'sound: MPC vote',
    sound: true,
    source: SRC_RBI,
    q: {
      stem: 'How did the Monetary Policy Committee vote on the decision?',
      options: opts('6-0', '5-1', '4-2', '3-3'),
      answer: 'b',
    },
    mock: { index: 0, answer: 'b', singleCorrect: true, grounded: true, unambiguous: true },
  },
  {
    name: 'flawed: wrong key',
    sound: false,
    source: SRC_RBI,
    q: {
      stem: 'At what level did the RBI keep the policy repo rate?',
      options: opts('5.25 per cent', '5.50 per cent', '5.75 per cent', '6.00 per cent'),
      answer: 'c',
    },
    mock: { index: 0, answer: 'b', singleCorrect: true, grounded: true, unambiguous: true },
  },
  {
    name: 'flawed: two correct options',
    sound: false,
    source: SRC_PIB,
    q: {
      stem: 'Which activity is covered by the mission?',
      options: opts('Exploration', 'Recycling', 'Export subsidies', 'Price controls'),
      answer: 'a',
    },
    mock: { index: 0, answer: 'a', singleCorrect: false, grounded: true, unambiguous: false },
  },
  {
    name: 'flawed: answer not in source',
    sound: false,
    source: SRC_PIB,
    q: {
      stem: 'Which ministry will implement the mission?',
      options: opts('Mines', 'Steel', 'Coal', 'Environment'),
      answer: 'a',
    },
    mock: { index: 0, answer: 'a', singleCorrect: true, grounded: false, unambiguous: true },
  },
  {
    name: 'flawed: ambiguous stance',
    sound: false,
    source: SRC_RBI,
    q: {
      stem: 'The RBI policy this time was best described as:',
      options: opts('Neutral', 'Status quo', 'Accommodative', 'Tightening'),
      answer: 'a',
    },
    mock: { index: 0, answer: 'a', singleCorrect: false, grounded: true, unambiguous: false },
  },
];

async function verdict(c: Case, live: boolean) {
  if (!live) return c.mock;
  const res = await generateJson({
    feature: 'eval:ca-verify',
    tier: 'bulk',
    schema: McqVerdict,
    prompt: verifyPrompt([c.q], [c.source]),
  });
  return res.data.checks.find((x) => x.index === 0);
}

export const caVerifierEval: Eval<Case, boolean> = {
  name: 'CA verifier: accept sound MCQs, reject flawed ones',
  threshold: 0.95,
  cases: cases.map((c) => ({
    name: c.name,
    input: c,
    check: (accepted) =>
      accepted === c.sound
        ? { pass: true }
        : { pass: false, note: c.sound ? 'sound MCQ rejected' : 'flawed MCQ accepted' },
  })),
  async run(c, live) {
    return acceptMcq(c.q, await verdict(c, live));
  },
};
