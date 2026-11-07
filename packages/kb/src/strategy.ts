import { type Db, schema } from '@koach/db';
import { checkText } from '@koach/guard';
import { z } from 'zod';

// Grounded strategy answers (KB-05): answers come only from stored claims, or Koach declines.
// The client never sees a person or site: only "Based on N topper accounts" or an official source.

export type ClaimRow = typeof schema.strategyClaims.$inferSelect;

const STOP = new Set(
  'a an the and or of to in on for with how what when should i my me is are do does can be it upsc cse exam'.split(
    ' ',
  ),
);
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

/** Keyword retrieval over claim text and topic (embeddings can replace this later). */
export function rankClaims(claims: ClaimRow[], question: string, limit = 8): ClaimRow[] {
  const q = new Set(words(question));
  return claims
    .map((c) => {
      const hay = words(`${c.topic.replace(/_/g, ' ')} ${c.claim}`);
      const score = hay.filter(
        (w) => q.has(w) || [...q].some((x) => x.length > 4 && w.startsWith(x.slice(0, 5))),
      ).length;
      return { c, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.c);
}

export const GroundedAnswer = z.object({
  /** Empty when the claims do not answer the question. */
  answer: z.string(),
  usedClaimIds: z.array(z.string()),
});
export type GroundedAnswer = z.infer<typeof GroundedAnswer>;

export type AnswerFn = (prompt: string) => Promise<GroundedAnswer>;

export interface StrategyAnswer {
  answered: boolean;
  answer: string | null;
  basis: { topperAccounts: number; officialSources: string[] };
}

const DECLINE: StrategyAnswer = {
  answered: false,
  answer: null,
  basis: { topperAccounts: 0, officialSources: [] },
};

/**
 * Retrieves claims by keyword, asks the model to answer from them only, and declines when nothing
 * matches, the model cites no real claim, or its wording trips the naming guard.
 */
export async function groundStrategyAnswer(
  db: Db,
  question: string,
  answer: AnswerFn,
): Promise<StrategyAnswer> {
  const all = await db.select().from(schema.strategyClaims);
  const claims = rankClaims(all, question);
  if (!claims.length) return DECLINE;
  const res = await answer(`You are a calm UPSC study coach. Answer the aspirant's question in 2–4
short sentences using ONLY the claims below. If the claims do not answer it, return an empty answer
and no ids. Do not add facts. Never name any person, coaching institute, app, website or channel.
List the ids of the claims you used.

Question: ${question}

Claims:
${claims.map((c) => `[${c.id}] ${c.claim}`).join('\n')}`);
  const used = claims.filter((c) => res.usedClaimIds.includes(c.id));
  if (!res.answer.trim() || !used.length) return DECLINE;
  // Defence in depth: the prompt forbids names, and a model that ignores it is declined, not shown.
  if (checkText(res.answer).length) return DECLINE;
  const toppers = new Set(used.filter((c) => c.kind === 'topper').map((c) => c.sourceUrl));
  const official = [
    ...new Set(used.filter((c) => c.kind === 'official').map((c) => c.officialSource ?? 'UPSC')),
  ];
  return {
    answered: true,
    answer: res.answer.trim(),
    basis: { topperAccounts: toppers.size, officialSources: official },
  };
}
