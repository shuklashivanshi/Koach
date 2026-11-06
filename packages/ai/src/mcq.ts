import { z } from 'zod';

// Shared MCQ verifier (CA-04): a blind solve plus three checks. The API uses it on every
// generated question; evals/ca-verifier.eval.ts measures it on planted good and flawed items.

export interface Mcq {
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
}

export const McqVerdict = z.object({
  checks: z.array(
    z.object({
      index: z.number().int(),
      answer: z.enum(['a', 'b', 'c', 'd']),
      singleCorrect: z.boolean(),
      grounded: z.boolean(),
      unambiguous: z.boolean(),
    }),
  ),
});
export type McqVerdict = z.infer<typeof McqVerdict>;

export function verifyPrompt(questions: Mcq[], sources: string[]): string {
  return `You are checking UPSC-style multiple-choice questions written from official releases.
For each question, solve it yourself using ONLY its source text (the answer key is withheld), then
judge: singleCorrect (exactly one option is right), grounded (the right answer follows from the
source text alone), unambiguous (no option is arguably also correct; wording is clear).

${questions
  .map(
    (q, i) => `#${i}
Source: ${sources[i] ?? ''}
Question: ${q.stem}
${q.options.map((o) => `(${o.key}) ${o.text}`).join('\n')}`,
  )
  .join('\n\n')}`;
}

/** Keep only when the blind answer matches the key and every check passes. */
export function acceptMcq(q: Mcq, v: McqVerdict['checks'][number] | undefined): boolean {
  return !!v && v.answer === q.answer && v.singleCorrect && v.grounded && v.unambiguous;
}
