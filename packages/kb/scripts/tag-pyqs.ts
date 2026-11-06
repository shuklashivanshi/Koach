// AI-suggests tags for every extracted PYQ (KB-02): syllabus nodes, question type, source type and
// (Mains) directive word. Output is status "suggested" until a reviewer approves it.
//
//   GCP_PROJECT=koach-dev-8cf0a5 pnpm --filter @koach/kb tag:pyqs [exam-year-paper ...]
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateJson } from '@koach/ai';
import { z } from 'zod';
import { type PyqFile, pyqId, QuestionTypes, SourceTypes, type SyllabusFile } from '../src/seed';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA = join(ROOT, 'data');

const Out = z.object({
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

/** Which syllabus papers a question can be tagged to. */
function candidatePapers(f: PyqFile): string[] {
  if (f.exam === 'prelims') return ['prelims_gs1', 'gs1', 'gs2', 'gs3'];
  return [f.paper];
}

async function main() {
  const syllabus = await Promise.all(
    (await readdir(join(DATA, 'syllabus')))
      .filter((f) => f.endsWith('.json') && !f.startsWith('optional-'))
      .map(async (f) => JSON.parse(await readFile(join(DATA, 'syllabus', f), 'utf8')) as SyllabusFile),
  );
  const leavesByPaper = new Map(
    syllabus.map((s) => [s.paper, s.nodes.filter((n) => n.kind === 'node')]),
  );
  const only = process.argv.slice(2);
  for (const name of (await readdir(join(DATA, 'pyq'))).filter((f) => f.endsWith('.json')).sort()) {
    const id = name.replace(/\.json$/, '');
    const out = join(DATA, 'tags', name);
    if (only.length ? !only.includes(id) : existsSync(out)) continue;
    const file = JSON.parse(await readFile(join(DATA, 'pyq', name), 'utf8')) as PyqFile;
    const leaves = candidatePapers(file).flatMap((p) => leavesByPaper.get(p) ?? []);
    const valid = new Set(leaves.map((n) => n.id));
    const nodeList = leaves.map((n) => `${n.id} | ${n.title}`).join('\n');
    const tags: z.infer<typeof Out>['tags'] = [];
    for (let i = 0; i < file.questions.length; i += 20) {
      const batch = file.questions.slice(i, i + 20);
      const res = await generateJson({
        feature: 'kb.pyq.tag',
        tier: 'bulk',
        schema: Out,
        maxOutputTokens: 16000,
        prompt: `Tag UPSC ${file.exam === 'prelims' ? 'Prelims GS-I' : `Mains ${file.paper.toUpperCase()}`} ${file.year} questions.
For each question:
- nodes: 1–3 syllabus node ids FROM THE LIST BELOW ONLY that the question tests; mark exactly one primary.
- questionType: statement (consider the following statements; which is/are correct), how_many (how
  many of the above), match (match/pairs), assertion_reason (statement I/II with explanation),
  direct (single direct question), descriptive (Mains).
- sourceType: static (answerable from standard books), current_affairs (needs recent news to answer),
  partial (static concept framed by a recent event).
- directive (Mains only): the directive word(s), lowercase, e.g. "discuss", "critically examine".

Syllabus nodes (id | title):
${nodeList}

Questions:
${batch.map((q) => `Q${q.number}. ${q.text}${q.options ? `\n${q.options.map((o) => `(${o.key}) ${o.text}`).join(' ')}` : ''}`).join('\n\n')}`,
      });
      for (const t of res.data.tags) {
        const nodes = t.nodes.filter((n) => valid.has(n.id));
        if (!nodes.length) continue;
        if (!nodes.some((n) => n.primary)) nodes[0]!.primary = true;
        tags.push({ ...t, nodes });
      }
    }
    const seeds = tags.map((t) => ({
      pyqId: pyqId(file.exam, file.year, file.paper, t.number),
      nodes: t.nodes,
      questionType: t.questionType,
      sourceType: t.sourceType,
      ...(file.exam === 'mains' && t.directive ? { directive: t.directive } : {}),
    }));
    const known = new Set(file.questions.map((q) => pyqId(file.exam, file.year, file.paper, q.number)));
    const kept = seeds.filter((s) => known.has(s.pyqId));
    await writeFile(out, `${JSON.stringify({ tags: kept }, null, 2)}\n`);
    console.log(`${id}: ${kept.length}/${file.questions.length} tagged`);
  }
}

await main();
