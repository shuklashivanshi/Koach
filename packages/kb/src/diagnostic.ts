import { type Db, schema } from '@koach/db';
import { and, eq, gte, inArray, isNotNull, max } from 'drizzle-orm';
import { selfLevelValue, subjectOfSection, subjects } from './subjects';

// Onboarding diagnostic (PROF-02): ~20 keyed Prelims GS-I PYQs from the last 10 years, stratified
// across subjects by how often the bank itself asks them; answers are scored on the server.

const s = schema;

export interface DiagnosticQuestion {
  id: string;
  year: number;
  text: string;
  options: { key: string; text: string }[];
  subject: string;
}

/** Section id for every node (walking up the tree). */
async function sectionOf(db: Db): Promise<Map<string, string>> {
  const nodes = await db
    .select({
      id: s.syllabusNodes.id,
      parentId: s.syllabusNodes.parentId,
      kind: s.syllabusNodes.kind,
    })
    .from(s.syllabusNodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, string>();
  for (const n of nodes) {
    let cur: (typeof nodes)[number] | undefined = n;
    while (cur && cur.kind !== 'section') cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    if (cur) out.set(n.id, cur.id);
  }
  return out;
}

/** Largest-remainder allocation of `total` slots by weight, at least one per subject with weight. */
export function allocate(weights: Map<string, number>, total: number): Map<string, number> {
  const entries = [...weights].filter(([, w]) => w > 0);
  const sum = entries.reduce((a, [, w]) => a + w, 0);
  const out = new Map(entries.map(([k]) => [k, 1]));
  let left = total - out.size;
  if (left <= 0) return new Map(entries.slice(0, total).map(([k]) => [k, 1]));
  const share = entries.map(([k, w]) => ({ k, exact: (w / sum) * left }));
  for (const { k, exact } of share) {
    out.set(k, (out.get(k) ?? 0) + Math.floor(exact));
  }
  left = total - [...out.values()].reduce((a, b) => a + b, 0);
  share
    .sort((a, b) => (b.exact % 1) - (a.exact % 1))
    .slice(0, left)
    .forEach(({ k }) => out.set(k, (out.get(k) ?? 0) + 1));
  return out;
}

export async function diagnosticQuestions(
  db: Db,
  n = 20,
  rand: () => number = Math.random,
): Promise<DiagnosticQuestion[]> {
  const [latest] = await db
    .select({ y: max(s.pyqs.year) })
    .from(s.pyqs)
    .where(eq(s.pyqs.exam, 'prelims'));
  if (!latest?.y) return [];
  const rows = await db
    .select({
      id: s.pyqs.id,
      year: s.pyqs.year,
      text: s.pyqs.text,
      options: s.pyqs.options,
      nodeId: s.pyqTags.nodeId,
    })
    .from(s.pyqs)
    .innerJoin(s.pyqTags, and(eq(s.pyqTags.pyqId, s.pyqs.id), eq(s.pyqTags.primary, true)))
    .where(
      and(eq(s.pyqs.exam, 'prelims'), gte(s.pyqs.year, latest.y - 9), isNotNull(s.pyqs.answer)),
    );
  const sections = await sectionOf(db);
  const bySubject = new Map<string, DiagnosticQuestion[]>();
  for (const r of rows) {
    const subject = subjectOfSection.get(sections.get(r.nodeId) ?? '');
    if (!subject || r.options?.length !== 4) continue;
    const list = bySubject.get(subject) ?? [];
    list.push({ id: r.id, year: r.year, text: r.text, options: r.options, subject });
    bySubject.set(subject, list);
  }
  const alloc = allocate(new Map([...bySubject].map(([k, v]) => [k, v.length])), n);
  const picked: DiagnosticQuestion[] = [];
  for (const [subject, k] of alloc) {
    const pool = [...(bySubject.get(subject) ?? [])];
    for (let i = 0; i < k && pool.length; i++) {
      picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
    }
  }
  return picked.sort(() => rand() - 0.5);
}

export interface DiagnosticResult {
  score: number;
  total: number;
  /** subject id → accuracy 0..1 on the questions asked */
  bySubject: Record<string, { correct: number; asked: number }>;
  answers: { pyqId: string; chosen: string | null; correct: boolean }[];
}

export async function scoreDiagnostic(
  db: Db,
  answers: { pyqId: string; chosen: string | null }[],
): Promise<DiagnosticResult> {
  const ids = answers.map((a) => a.pyqId);
  if (!ids.length) return { score: 0, total: 0, bySubject: {}, answers: [] };
  const [rows, sections] = await Promise.all([
    db
      .select({ id: s.pyqs.id, answer: s.pyqs.answer, nodeId: s.pyqTags.nodeId })
      .from(s.pyqs)
      .innerJoin(s.pyqTags, and(eq(s.pyqTags.pyqId, s.pyqs.id), eq(s.pyqTags.primary, true)))
      .where(inArray(s.pyqs.id, ids)),
    sectionOf(db),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const bySubject: DiagnosticResult['bySubject'] = {};
  const scored = answers
    .filter((a) => byId.has(a.pyqId))
    .map((a) => {
      const row = byId.get(a.pyqId)!;
      const correct = !!a.chosen && a.chosen.toLowerCase() === row.answer;
      const subject = subjectOfSection.get(sections.get(row.nodeId) ?? '');
      if (subject) {
        const t = (bySubject[subject] ??= { correct: 0, asked: 0 });
        t.asked++;
        if (correct) t.correct++;
      }
      return { pyqId: a.pyqId, chosen: a.chosen, correct };
    });
  return {
    score: scored.filter((a) => a.correct).length,
    total: scored.length,
    bySubject,
    answers: scored,
  };
}

/**
 * Starting level per section: self-rating alone, or 0.6 × diagnostic accuracy + 0.4 × self-rating
 * for subjects the diagnostic asked about.
 */
export function blendLevels(
  self: Record<string, 'new' | 'some' | 'strong'>,
  diag: DiagnosticResult['bySubject'] | null,
): { sectionId: string; level: number; source: 'self' | 'diagnostic' }[] {
  return subjects.flatMap((subj) => {
    const selfValue = selfLevelValue[self[subj.id] ?? 'new'];
    const d = diag?.[subj.id];
    const level = d?.asked ? 0.6 * (d.correct / d.asked) + 0.4 * selfValue : selfValue;
    return subj.sections.map((sectionId) => ({
      sectionId,
      level: Math.round(level * 100) / 100,
      source: d?.asked ? ('diagnostic' as const) : ('self' as const),
    }));
  });
}
