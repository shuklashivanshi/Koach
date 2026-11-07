// AI-suggests tags for every extracted PYQ (KB-02): syllabus nodes, question type, source type and
// (Mains) directive word. Output is status "suggested" until a reviewer approves it. Unknown node
// ids are rejected and the question is asked again (see src/tagging.ts).
//
//   GCP_PROJECT=koach-dev-8cf0a5 pnpm --filter @koach/kb tag:pyqs [exam-year-paper ...]
//
// Papers whose tag file already covers every question are skipped, so a re-run only fills gaps.
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateJson } from '@koach/ai';
import type { PyqFile, SyllabusFile } from '../src/seed';
import { candidatePapers, TagOut, tagPaper } from '../src/tagging';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA = join(ROOT, 'data');

async function main() {
  const syllabus = await Promise.all(
    (await readdir(join(DATA, 'syllabus')))
      .filter((f) => f.endsWith('.json') && !f.startsWith('optional-'))
      .map(
        async (f) => JSON.parse(await readFile(join(DATA, 'syllabus', f), 'utf8')) as SyllabusFile,
      ),
  );
  const leavesByPaper = new Map(
    syllabus.map((s) => [s.paper, s.nodes.filter((n) => n.kind === 'node')]),
  );
  const only = process.argv.slice(2);
  let failedAny = false;
  for (const name of (await readdir(join(DATA, 'pyq'))).filter((f) => f.endsWith('.json')).sort()) {
    const id = name.replace(/\.json$/, '');
    const out = join(DATA, 'tags', name);
    const file = JSON.parse(await readFile(join(DATA, 'pyq', name), 'utf8')) as PyqFile;
    if (only.length ? !only.includes(id) : existsSync(out)) {
      if (!only.length) {
        const have = (JSON.parse(await readFile(out, 'utf8')) as { tags: unknown[] }).tags.length;
        if (have >= file.questions.length) continue;
        console.log(`${id}: ${have}/${file.questions.length} tagged, re-running`);
      } else continue;
    }
    const leaves = candidatePapers(file).flatMap((p) => leavesByPaper.get(p) ?? []);
    const valid = new Set(leaves.map((n) => n.id));
    const nodeList = leaves.map((n) => `${n.id} | ${n.title}`).join('\n');
    const result = await tagPaper(file, valid, async (batch, notes) => {
      const res = await generateJson({
        feature: 'kb.pyq.tag',
        tier: 'bulk',
        schema: TagOut,
        maxOutputTokens: 16000,
        prompt: `Tag UPSC ${file.exam === 'prelims' ? 'Prelims GS-I' : `Mains ${file.paper.toUpperCase()}`} ${file.year} questions.
For each question:
- nodes: 1–3 syllabus node ids FROM THE LIST BELOW ONLY (copy the id exactly) that the question tests;
  mark exactly one primary.
- questionType: statement (consider the following statements; which is/are correct), how_many (how
  many of the above), match (match/pairs), assertion_reason (statement I/II with explanation),
  direct (single direct question), descriptive (Mains).
- sourceType: static (answerable from standard books), current_affairs (needs recent news to answer),
  partial (static concept framed by a recent event).
- directive (Mains only, required): the directive word(s), lowercase, e.g. "discuss", "critically examine".
${notes.size ? `\nA previous answer for these questions was rejected, fix it: ${[...notes].map(([n, r]) => `Q${n}: ${r}`).join('; ')}.\n` : ''}
Syllabus nodes (id | title):
${nodeList}

Questions:
${batch.map((q) => `Q${q.number}. ${q.text}${q.options ? `\n${q.options.map((o) => `(${o.key}) ${o.text}`).join(' ')}` : ''}`).join('\n\n')}`,
      });
      return res.data.tags;
    });
    await writeFile(out, `${JSON.stringify({ tags: result.tags }, null, 2)}\n`);
    console.log(`${id}: ${result.tags.length}/${file.questions.length} tagged`);
    if (result.failed.length) {
      failedAny = true;
      console.warn(
        `${id}: ${result.failed.length} untagged after retries: ${result.failed.map((f) => `Q${f.number} (${f.reason})`).join(', ')}`,
      );
    }
  }
  if (failedAny) process.exitCode = 1;
}

await main();
