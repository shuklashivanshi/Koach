import { schema } from '@koach/db';
import { nodeSource, pyqsForNode } from '@koach/kb';
import { playbooks } from '@koach/kb';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Deps } from '../deps';

// A PYQ-first Learn session (PED-01, PB-PYQ, PB-WHERE, PB-FOCUS): how it's asked → where to read
// → one goal line → a short retrieval check. Recall items are generated once per node, checked by
// a second pass, and cached for everyone (no PII in prompts).

const s = schema;
const Items = z.object({ items: z.array(z.object({ q: z.string(), a: z.string() })) });
const Verdicts = z.object({ ok: z.array(z.boolean()) });

async function recallItems(
  deps: Deps,
  uid: string,
  node: { id: string; title: string },
  source: string | null,
) {
  const [cached] = await deps.db
    .select()
    .from(s.recallItems)
    .where(eq(s.recallItems.nodeId, node.id));
  if (cached) return cached.items;
  const { min, max } = playbooks['PB-PYQ'].retrievalCheck;
  const gen = await deps.ai.json({
    feature: 'learn.recall.generate',
    tier: 'bulk',
    uid,
    schema: Items,
    prompt: `Write ${max} short retrieval questions (with model answers of at most 25 words) that test
the core facts and concepts of this UPSC syllabus node, the way UPSC examines it.
Node: ${node.title}${source ? `\nStandard source: ${source}` : ''}
Use only well-established facts. No names of teachers, coaching institutes, apps or websites.`,
  });
  const candidates = gen.data.items.slice(0, max);
  const check = await deps.ai.json({
    feature: 'learn.recall.verify',
    tier: 'bulk',
    uid,
    schema: Verdicts,
    prompt: `Check each question/answer pair for factual accuracy and clarity for a UPSC aspirant.
Return ok[i] = true only if the answer is correct and unambiguous.
${candidates.map((c, i) => `${i + 1}. Q: ${c.q}\n   A: ${c.a}`).join('\n')}`,
  });
  const items = candidates.filter((_, i) => check.data.ok[i] === true);
  if (items.length >= min) {
    await deps.db.insert(s.recallItems).values({ nodeId: node.id, items }).onConflictDoNothing();
  }
  return items;
}

export async function learnSession(deps: Deps, uid: string, nodeId: string) {
  const [node] = await deps.db
    .select()
    .from(s.syllabusNodes)
    .where(and(eq(s.syllabusNodes.id, nodeId), eq(s.syllabusNodes.kind, 'node')));
  if (!node) return null;
  const src = await nodeSource(deps.db, nodeId);
  const sourceLine = src ? `${src.label} · ${src.chapter}` : null;
  const all = await pyqsForNode(deps.db, nodeId, 20);
  const { max } = playbooks['PB-PYQ'].primingPyqs;
  // Prefer recent questions with options for priming; show answers only after an attempt.
  const priming = [...all].sort((a, b) => b.year - a.year).slice(0, max);
  const items = await recallItems(deps, uid, node, sourceLine).catch(() => []);
  return {
    node: { id: node.id, title: node.title, estMinutes: node.estMinutes ?? 60 },
    pyqs: priming.map((p) => ({
      id: p.id,
      exam: p.exam,
      year: p.year,
      text: p.text,
      options: p.options,
      marks: p.marks,
      directive: p.directive,
    })),
    source: src ? { label: src.label, chapter: src.chapter, reason: src.reason } : null,
    goal: src
      ? `Finish ${src.chapter}${priming.length ? ` + ${priming.length} PYQs` : ''}`
      : `Cover ${node.title}`,
    recall: items,
  };
}
