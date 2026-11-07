import { z } from 'zod';
import { type PyqFile, pyqId, QuestionTypes, SourceTypes } from './seed';

// AI tagging of PYQs (KB-02, D-13). The model may only use node ids from the graph; anything else
// is rejected and the question is asked again. Pure logic lives here so it can be tested with a
// fake generator; scripts/tag-pyqs.ts supplies the real Gemini call.

export const TagOut = z.object({
  tags: z.array(
    z.object({
      number: z.number().int(),
      nodes: z.array(z.object({ id: z.string(), primary: z.boolean() })),
      questionType: z.enum(QuestionTypes),
      sourceType: z.enum(SourceTypes),
      directive: z.string().optional(),
    }),
  ),
});
export type RawTag = z.infer<typeof TagOut>['tags'][number];

export interface TaggedPyq {
  pyqId: string;
  nodes: { id: string; primary: boolean }[];
  questionType: RawTag['questionType'];
  sourceType: RawTag['sourceType'];
  directive?: string;
}

/** Which syllabus papers a question can be tagged to. */
export function candidatePapers(f: Pick<PyqFile, 'exam' | 'paper'>): string[] {
  if (f.exam === 'prelims') return ['prelims_gs1', 'gs1', 'gs2', 'gs3'];
  return [f.paper];
}

export interface Rejection {
  number: number;
  reason: string;
}

/**
 * Validates one model tag against the graph: unknown node ids are dropped (and reported), at most
 * three nodes are kept, exactly one is primary, and Mains questions need a directive word.
 */
export function cleanTag(
  raw: RawTag,
  exam: PyqFile['exam'],
  validIds: ReadonlySet<string>,
): { tag: RawTag } | { rejected: string } {
  const unknown = raw.nodes.filter((n) => !validIds.has(n.id)).map((n) => n.id);
  const seen = new Set<string>();
  const nodes = raw.nodes
    .filter((n) => validIds.has(n.id) && !seen.has(n.id) && seen.add(n.id))
    .slice(0, 3)
    .map((n) => ({ ...n }));
  if (!nodes.length) {
    return { rejected: unknown.length ? `unknown node ids: ${unknown.join(', ')}` : 'no nodes' };
  }
  const primary = nodes.findIndex((n) => n.primary);
  nodes.forEach((n, i) => {
    n.primary = i === (primary < 0 ? 0 : primary);
  });
  const directive = raw.directive?.trim().toLowerCase();
  if (exam === 'mains' && !directive) return { rejected: 'missing directive word' };
  return {
    tag: {
      number: raw.number,
      nodes,
      questionType: raw.questionType,
      sourceType: raw.sourceType,
      ...(exam === 'mains' && directive ? { directive } : {}),
    },
  };
}

export type TagGenerator = (
  questions: PyqFile['questions'],
  retryNotes: Map<number, string>,
) => Promise<RawTag[]>;

export interface TagResult {
  tags: TaggedPyq[];
  /** Questions that stayed untagged after all retries, with the last reason. */
  failed: Rejection[];
}

/**
 * Tags every question of a paper in batches. Questions whose tag is rejected (unknown ids, no
 * nodes, missing Mains directive) are re-asked with the reason, up to `maxRetries` more rounds.
 */
export async function tagPaper(
  file: PyqFile,
  validIds: ReadonlySet<string>,
  generate: TagGenerator,
  opts: { batchSize?: number; maxRetries?: number } = {},
): Promise<TagResult> {
  const batchSize = opts.batchSize ?? 20;
  const maxRetries = opts.maxRetries ?? 2;
  const known = new Map(file.questions.map((q) => [q.number, q]));
  const done = new Map<number, RawTag>();
  let pending = file.questions;
  let notes = new Map<number, string>();
  const lastReason = new Map<number, string>();

  for (let round = 0; round <= maxRetries && pending.length; round++) {
    const next: PyqFile['questions'] = [];
    const nextNotes = new Map<number, string>();
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);
      const raw = await generate(batch, notes);
      const byNumber = new Map(raw.map((t) => [t.number, t]));
      for (const q of batch) {
        const t = byNumber.get(q.number);
        const res = t ? cleanTag(t, file.exam, validIds) : { rejected: 'no tag returned' };
        if ('tag' in res) {
          done.set(q.number, res.tag);
        } else {
          lastReason.set(q.number, res.rejected);
          nextNotes.set(q.number, res.rejected);
          next.push(q);
        }
      }
    }
    pending = next;
    notes = nextNotes;
  }

  const tags: TaggedPyq[] = [...done.entries()]
    .filter(([n]) => known.has(n))
    .sort(([a], [b]) => a - b)
    .map(([n, t]) => ({
      pyqId: pyqId(file.exam, file.year, file.paper, n),
      nodes: t.nodes,
      questionType: t.questionType,
      sourceType: t.sourceType,
      ...(t.directive ? { directive: t.directive } : {}),
    }));
  return {
    tags,
    failed: pending.map((q) => ({ number: q.number, reason: lastReason.get(q.number) ?? '' })),
  };
}
