import { schema } from '@koach/db';
import { checkText, findHits } from '@koach/guard';
import { nodeSource } from '@koach/kb';
import {
  applyEvidence,
  type CueFormat,
  chooseFormat,
  FORMATS,
  type Pattern,
  patternOf,
} from '@koach/lpt';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Deps } from '../deps';
import { addCard, istDay } from './study';

// Memory cues (CUE-01..08). Every cue is built from a node's verified facts so it can be checked;
// mnemonics and chants must decode back to every fact before they are shown (CUE-04).

const s = schema;
const NAMING = 'Never name any teacher, coaching institute, app, website or channel.';

const Facts = z.object({ facts: z.array(z.string()) });
const FactCheck = z.object({ ok: z.array(z.boolean()) });

async function nodeFacts(
  deps: Deps,
  uid: string,
  nodeId: string,
): Promise<{ title: string; facts: string[] } | null> {
  const [node] = await deps.db.select().from(s.syllabusNodes).where(eq(s.syllabusNodes.id, nodeId));
  if (!node) return null;
  const [cached] = await deps.db.select().from(s.nodeFacts).where(eq(s.nodeFacts.nodeId, nodeId));
  if (cached) return { title: node.title, facts: cached.facts };
  const src = await nodeSource(deps.db, nodeId);
  const gen = await deps.ai.json({
    feature: 'cue.facts',
    tier: 'bulk',
    uid,
    schema: Facts,
    prompt: `List the 5–8 most exam-relevant key facts for this UPSC syllabus node, each one short
sentence (≤20 words), well established, no opinions. ${NAMING}
Node: ${node.title}${src ? `\nStandard source: ${src.label} · ${src.chapter}` : ''}`,
  });
  const candidates = gen.data.facts.slice(0, 8);
  const check = await deps.ai.json({
    feature: 'cue.facts.verify',
    tier: 'bulk',
    uid,
    schema: FactCheck,
    prompt: `For each statement, ok[i] = true only if it is factually correct and unambiguous.
${candidates.map((f, i) => `${i + 1}. ${f}`).join('\n')}`,
  });
  const facts = candidates.filter((f, i) => check.data.ok[i] === true && !checkText(f).length);
  if (facts.length >= 4) {
    await deps.db.insert(s.nodeFacts).values({ nodeId, facts }).onConflictDoNothing();
  }
  return { title: node.title, facts };
}

const schemas = {
  palace: z.object({
    placements: z.array(z.object({ locus: z.string(), fact: z.string(), image: z.string() })),
  }),
  mindmap: z.object({
    center: z.string(),
    branches: z.array(z.object({ label: z.string(), leaves: z.array(z.string()) })),
  }),
  timeline: z.object({ events: z.array(z.object({ when: z.string(), what: z.string() })) }),
  spoken: z.object({ script: z.string() }),
  chant: z.object({ lines: z.array(z.string()) }),
  mnemonic: z.object({
    kind: z.enum(['acronym', 'story', 'rhyme']),
    device: z.string(),
    mapping: z.array(z.object({ key: z.string(), fact: z.string() })),
  }),
  cuesheet: z.object({ lines: z.array(z.string()) }),
  cloze: z.object({ items: z.array(z.object({ text: z.string(), answer: z.string() })) }),
  blurt: z.object({ prompt: z.string() }),
  sequence: z.object({ steps: z.array(z.string()) }),
  flowchart: z.object({ steps: z.array(z.object({ label: z.string(), detail: z.string() })) }),
  why: z.object({ question: z.string(), steps: z.array(z.string()), teachBack: z.string() }),
} satisfies Record<CueFormat, z.ZodType>;

const instructions: Record<CueFormat, string> = {
  palace:
    'Place each fact at one spot of the learner’s memory palace, in order, with a vivid, slightly absurd image (≤20 words) linking spot and fact.',
  mindmap:
    'A mind-map: one centre phrase and 3–5 branches, each with 1–3 short leaves (≤6 words each).',
  timeline:
    'A timeline of the dated facts in order (when = year or period; what ≤10 words). Skip undated facts.',
  spoken:
    'A spoken cue sheet: a calm script of ≤120 words a narrator reads aloud, covering every fact.',
  chant:
    'A rhythmic chant of 4–8 short lines (≤8 words each) that covers every fact; easy to repeat aloud.',
  mnemonic:
    'One verbal mnemonic (acronym, acronym story, or rhyme) that encodes every fact; mapping lists each key (letter/word) and the fact it stands for.',
  cuesheet: 'A one-page cue sheet: at most 12 terse lines, keywords not sentences.',
  cloze: 'One cloze item per fact: the fact with its key term replaced by ____, and the answer.',
  blurt: 'A one-line prompt asking the learner to write everything they remember about this topic.',
  sequence:
    'The facts that form a process or chronology, as 4–7 steps in the correct order (≤10 words each).',
  flowchart:
    'A flowchart of 4–7 steps (label ≤5 words, detail ≤12 words) showing cause → effect or process flow.',
  why: 'First principles: one "why" question about the core idea, 3–5 causal steps that answer it (each ≤20 words), and a one-line teach-back prompt.',
};

/** CUE-04: a fresh pass decodes the device blind; every fact must be recovered. */
async function decodes(deps: Deps, uid: string, device: string, facts: string[]): Promise<boolean> {
  const decoded = await deps.ai.json({
    feature: 'cue.decode',
    tier: 'bulk',
    uid,
    schema: Facts,
    prompt: `This is a memory device for a UPSC topic. Without any other help, list every fact it
encodes, one short sentence each.\n\n${device}`,
  });
  const judge = await deps.ai.json({
    feature: 'cue.decode.judge',
    tier: 'bulk',
    uid,
    schema: FactCheck,
    prompt: `Original facts:\n${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nDecoded facts:\n${decoded.data.facts.join('\n')}\n
For each ORIGINAL fact i, ok[i] = true only if the decoded list states it accurately.`,
  });
  return facts.every((_, i) => judge.data.ok[i] === true);
}

export async function getProfileScores(deps: Deps, uid: string) {
  const [lpt] = await deps.db
    .select()
    .from(s.lptResults)
    .where(eq(s.lptResults.uid, uid))
    .orderBy(desc(s.lptResults.takenAt))
    .limit(1);
  return lpt ?? null;
}

export async function getCue(deps: Deps, uid: string, nodeId: string, requested?: CueFormat) {
  const lpt = await getProfileScores(deps, uid);
  const scores = lpt
    ? {
        visual: lpt.visual,
        auditory: lpt.auditory,
        readwrite: lpt.readwrite,
        kinesthetic: lpt.kinesthetic,
      }
    : null;
  const format = requested ?? chooseFormat(scores, `${nodeId}:${istDay(deps.now())}`);
  const [existing] = await deps.db
    .select()
    .from(s.cues)
    .where(and(eq(s.cues.uid, uid), eq(s.cues.nodeId, nodeId), eq(s.cues.format, format)))
    .orderBy(desc(s.cues.createdAt))
    .limit(1);
  if (existing) return { cue: existing, format, facts: null as string[] | null };

  const base = await nodeFacts(deps, uid, nodeId);
  if (!base || base.facts.length < 3) return null;
  let context = '';
  if (format === 'palace') {
    const [palace] = await deps.db
      .select()
      .from(s.memoryPalaces)
      .where(eq(s.memoryPalaces.uid, uid));
    const loci = palace?.rooms.flatMap((r) => r.loci.map((l) => `${r.name}: ${l}`)) ?? [];
    if (loci.length < base.facts.length) return { needsPalace: true as const, format };
    context = `Memory palace spots, in walking order:\n${loci.slice(0, base.facts.length).join('\n')}`;
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await deps.ai.json({
      feature: `cue.${format}`,
      tier: 'bulk',
      uid,
      schema: schemas[format],
      prompt: `Make a memory cue for a UPSC aspirant. ${instructions[format]} Use only these facts. ${NAMING}
Topic: ${base.title}
Facts:
${base.facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}
${context}`,
    });
    const content = res.data as Record<string, unknown>;
    if (findHits(content).length) continue;
    if (format === 'mnemonic' || format === 'chant') {
      const device =
        format === 'chant'
          ? (content.lines as string[]).join('\n')
          : `${String(content.device)}\n${(content.mapping as { key: string; fact: string }[]).map((m) => m.key).join(', ')}`;
      if (!(await decodes(deps, uid, device, base.facts))) continue;
    }
    const [cue] = await deps.db.insert(s.cues).values({ uid, nodeId, format, content }).returning();
    return { cue: cue!, format, facts: base.facts };
  }
  return { failed: true as const, format };
}

/** CUE-08 + LPT-03: ratings move the pattern score a little. */
export async function rateCue(deps: Deps, uid: string, id: string, up: boolean) {
  const [cue] = await deps.db
    .select()
    .from(s.cues)
    .where(and(eq(s.cues.uid, uid), eq(s.cues.id, id)));
  if (!cue) return false;
  await deps.db
    .update(s.cues)
    .set({ rating: up ? 1 : -1 })
    .where(eq(s.cues.id, id));
  await evidence(deps, uid, patternOf(cue.format as CueFormat), up ? 0.7 : 0.3);
  return true;
}

export async function evidence(
  deps: Deps,
  uid: string,
  pattern: Pattern | 'everyone',
  success: number,
) {
  if (pattern === 'everyone') return;
  const lpt = await getProfileScores(deps, uid);
  if (!lpt) return;
  await deps.db
    .update(s.lptResults)
    .set({ [pattern]: applyEvidence(lpt[pattern], success), updatedAt: deps.now() })
    .where(eq(s.lptResults.id, lpt.id));
}

const Score = z.object({ covered: z.array(z.boolean()), feedback: z.string() });

/** Blurting / teach-back: graded against the facts (or the why-steps). */
export async function gradeRecall(deps: Deps, uid: string, cueId: string, text: string) {
  const [cue] = await deps.db
    .select()
    .from(s.cues)
    .where(and(eq(s.cues.uid, uid), eq(s.cues.id, cueId)));
  if (!cue) return null;
  const facts =
    cue.format === 'why'
      ? (cue.content.steps as string[])
      : ((await deps.db.select().from(s.nodeFacts).where(eq(s.nodeFacts.nodeId, cue.nodeId)))[0]
          ?.facts ?? []);
  if (!facts.length) return null;
  const res = await deps.ai.json({
    feature: `cue.grade.${cue.format}`,
    tier: 'lite',
    uid,
    schema: Score,
    prompt: `Key points:\n${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nLearner wrote:\n"""${text}"""\n
covered[i] = true if the learner conveys key point i (wording may differ). feedback: one kind sentence
naming the most important missing point, or saying it was complete. ${NAMING}`,
  });
  const score = facts.filter((_, i) => res.data.covered[i]).length / facts.length;
  if (cue.format === 'blurt') await evidence(deps, uid, 'readwrite', score);
  const feedback = checkText(res.data.feedback).length ? '' : res.data.feedback;
  return {
    score: Math.round(score * 100) / 100,
    feedback,
    missed: facts.filter((_, i) => !res.data.covered[i]),
  };
}

/** CUE-01: turn a cloze cue into FSRS cards. */
export async function clozeToCards(deps: Deps, uid: string, cueId: string) {
  const [cue] = await deps.db
    .select()
    .from(s.cues)
    .where(and(eq(s.cues.uid, uid), eq(s.cues.id, cueId)));
  if (!cue || cue.format !== 'cloze') return 0;
  const items = cue.content.items as { text: string; answer: string }[];
  for (const it of items) {
    await addCard(
      deps.db,
      uid,
      { nodeId: cue.nodeId, kind: 'recall', front: it.text, back: it.answer },
      deps.now(),
    );
  }
  return items.length;
}

export const allFormats = (): { pattern: string; formats: CueFormat[] }[] =>
  (Object.keys(FORMATS) as (keyof typeof FORMATS)[]).map((p) => ({
    pattern: p,
    formats: FORMATS[p],
  }));
