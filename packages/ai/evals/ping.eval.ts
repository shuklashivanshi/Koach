import { generateText } from '../src/text';
import { containsBlockedName } from './blocked-names';
import type { Eval } from './types';

const PROMPT = 'Reply with one short encouraging sentence for a UPSC aspirant. No names, no emoji.';

// Recorded outputs for mock mode (CI); replace via a live run when the prompt changes.
const fixtures = [
  'Every chapter you revise today is a mark you keep in May.',
  'Small steady sessions beat long tired ones; begin with twenty minutes.',
  'Trust the syllabus, revise what you read, and the rest follows.',
];

const oneSentence = (s: string) => (s.match(/[.!?](\s|$)/g) ?? []).length <= 1;
const words = (s: string) => s.trim().split(/\s+/).length;

export const pingEval: Eval<number, string> = {
  name: 'ping: one short encouraging sentence',
  threshold: 1,
  cases: [0, 1, 2].map((i) => ({
    name: `sample ${i + 1}`,
    input: i,
    check(out) {
      if (!oneSentence(out)) return { pass: false, note: 'more than one sentence' };
      if (words(out) > 25) return { pass: false, note: `${words(out)} words` };
      if (!/^[\x20-\x7E’]+$/.test(out)) return { pass: false, note: 'non-English or emoji' };
      if (containsBlockedName(out)) return { pass: false, note: 'blocked name' };
      return { pass: true };
    },
  })),
  async run(i, live) {
    if (!live) return fixtures[i] ?? '';
    return (await generateText({ feature: 'eval:ping', tier: 'bulk', prompt: PROMPT })).text;
  },
};
