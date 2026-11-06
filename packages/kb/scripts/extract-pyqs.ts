// Extracts questions from the official papers in data/pyq-manifest.json into data/pyq/*.json (KB-02).
//
//   GCP_PROJECT=koach-dev-8cf0a5 pnpm --filter @koach/kb extract:pyqs [exam-year-paper ...]
//
// English text only. Prelims papers are scanned and bilingual, so they are sent in page chunks
// (with one page of overlap) and merged by question number; the booklet series on the cover picks
// the right column of the official answer key. A report lists every paper whose count is off.
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateJson } from '@koach/ai';
import { PDFDocument } from 'pdf-lib';
import { z } from 'zod';
import type { PyqFile } from '../src/seed';
import { type ManifestEntry, pdfPages } from './fetch-papers';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'data', 'pyq');
const REPORT = join(ROOT, 'data', 'pyq-report.json');

const Chunk = z.object({
  /** Title printed on these pages, if any; used to reject a mislabelled paper. */
  paperTitle: z.string().optional(),
  series: z.string().optional(),
  questions: z.array(
    z.object({
      number: z.number().int(),
      text: z.string(),
      options: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
      marks: z.number().int().optional(),
      wordLimit: z.number().int().optional(),
    }),
  ),
});
type Question = z.infer<typeof Chunk>['questions'][number];

const Key = z.object({
  series: z.array(
    z.object({
      series: z.string(),
      answers: z.array(z.object({ number: z.number().int(), answer: z.string() })),
    }),
  ),
});

const PRELIMS_PROMPT = `This is part of an official UPSC Civil Services (Preliminary) General
Studies Paper I booklet. It is bilingual: copy only the ENGLISH version.
Return every question whose number appears on these pages, with its full English text (all
statements, lists and tables written out as plain text) and the four options keyed a–d exactly as
printed. If a question is cut off at the page edge, return what is visible. Ignore instructions and
rough-work pages. series = the Test Booklet Series letter if it is printed on these pages.
paperTitle = the paper title if printed on these pages.`;

const MAINS_PROMPT = `This is an official UPSC Civil Services (Main) Examination General Studies
question paper. Copy only the ENGLISH version of each question, numbered 1..N in paper order (if the
paper uses sub-parts like 1(a), number them sequentially in order). Include marks and the word limit
when printed. Skip instructions. paperTitle = the paper title as printed on the first page.`;

async function pageCount(file: string) {
  return (await PDFDocument.load(await readFile(file), { ignoreEncryption: true })).getPageCount();
}

async function extractPaper(e: ManifestEntry): Promise<{ file: PyqFile; series?: string }> {
  const path = join(ROOT, e.file);
  const pages = await pageCount(path);
  const merged = new Map<number, Question>();
  let series: string | undefined;
  const step = e.exam === 'prelims' ? 6 : 40;
  for (let from = 0; from < pages; from += step) {
    const to = Math.min(pages, from + step + (e.exam === 'prelims' ? 1 : 0));
    const res = await generateJson({
      feature: 'kb.pyq.extract',
      tier: 'bulk',
      schema: Chunk,
      maxOutputTokens: 40000,
      files: [{ mimeType: 'application/pdf', base64: await pdfPages(path, from, to) }],
      prompt: e.exam === 'prelims' ? PRELIMS_PROMPT : MAINS_PROMPT,
    });
    series ??= res.data.series || undefined;
    if (from === 0 && res.data.paperTitle && !/general\s*studies/i.test(res.data.paperTitle)) {
      throw new Error(`not a General Studies paper: "${res.data.paperTitle}"`);
    }
    for (const q of res.data.questions) {
      const prev = merged.get(q.number);
      // Keep the most complete copy (a question split across chunks appears twice).
      if (!prev || q.text.length + (q.options?.length ?? 0) * 20 > prev.text.length + (prev.options?.length ?? 0) * 20) {
        merged.set(q.number, q);
      }
    }
  }
  const questions = [...merged.values()].sort((a, b) => a.number - b.number);
  return {
    series,
    file: {
      exam: e.exam,
      paper: e.paper,
      year: e.year,
      sourceUrl: e.url,
      questions: questions.map((q) => ({
        number: q.number,
        text: q.text.trim(),
        ...(q.options?.length ? { options: q.options } : {}),
        ...(q.marks ? { marks: q.marks } : {}),
        ...(q.wordLimit ? { wordLimit: q.wordLimit } : {}),
      })),
    },
  };
}

async function answerKey(e: ManifestEntry, series: string | undefined) {
  if (!e.answerKeyFile) return null;
  const path = join(ROOT, e.answerKeyFile);
  const res = await generateJson({
    feature: 'kb.pyq.answer-key',
    tier: 'bulk',
    schema: Key,
    maxOutputTokens: 20000,
    files: [{ mimeType: 'application/pdf', base64: (await readFile(path)).toString('base64') }],
    prompt: `This is the official UPSC answer key for Civil Services (Preliminary) ${e.year},
General Studies Paper I. For each booklet series in it, list the answer (a, b, c or d, lowercase;
"x" if the question was dropped) for every question number.`,
  });
  const all = res.data.series;
  const pick = (series && all.find((s) => s.series.toUpperCase() === series.toUpperCase())) || all[0];
  return pick ? new Map(pick.answers.map((a) => [a.number, a.answer.toLowerCase()])) : null;
}

const Solved = z.object({
  answers: z.array(z.object({ number: z.number().int(), answer: z.enum(['a', 'b', 'c', 'd']) })),
});

/**
 * No official key: two independent solves (different question order). Only answers both agree on
 * are kept, marked answerSource "model"; disagreements are reported for human review.
 */
async function solveAnswers(file: PyqFile): Promise<{ agreed: Map<number, string>; disputed: number[] }> {
  const run = async (order: PyqFile['questions']) => {
    const out = new Map<number, string>();
    for (let i = 0; i < order.length; i += 25) {
      const batch = order.slice(i, i + 25);
      const res = await generateJson({
        feature: 'kb.pyq.solve',
        tier: 'bulk',
        schema: Solved,
        maxOutputTokens: 8000,
        prompt: `Answer these UPSC Civil Services (Preliminary) ${file.year} General Studies questions.
Think carefully about each statement; return only the letter of the correct option for each number.
${batch.map((q) => `Q${q.number}. ${q.text}\n${(q.options ?? []).map((o) => `(${o.key}) ${o.text}`).join(' ')}`).join('\n\n')}`,
      });
      for (const a of res.data.answers) out.set(a.number, a.answer);
    }
    return out;
  };
  const qs = file.questions.filter((q) => q.options?.length === 4);
  const [first, second] = await Promise.all([run(qs), run([...qs].reverse())]);
  const agreed = new Map<number, string>();
  const disputed: number[] = [];
  for (const q of qs) {
    const a = first.get(q.number);
    if (a && a === second.get(q.number)) agreed.set(q.number, a);
    else disputed.push(q.number);
  }
  return { agreed, disputed };
}

async function main() {
  const { papers } = JSON.parse(
    await readFile(join(ROOT, 'data', 'pyq-manifest.json'), 'utf8'),
  ) as { papers: ManifestEntry[] };
  const only = process.argv.slice(2);
  const report: Record<string, unknown> = existsSync(REPORT)
    ? (JSON.parse(await readFile(REPORT, 'utf8')) as Record<string, unknown>)
    : {};
  for (const e of papers) {
    const id = `${e.exam}-${e.year}-${e.paper}`;
    if (only.length && !only.includes(id)) continue;
    if (!only.length && existsSync(join(OUT, `${id}.json`))) continue;
    try {
      const { file, series } = await extractPaper(e);
      const issues: string[] = [];
      if (e.exam === 'prelims') {
        const key = await answerKey(e, series);
        if (key) {
          for (const q of file.questions) {
            const a = key.get(q.number);
            if (a && a !== 'x') Object.assign(q, { answer: a, answerSource: 'official' as const });
          }
        } else {
          const { agreed, disputed } = await solveAnswers(file);
          for (const q of file.questions) {
            const a = agreed.get(q.number);
            if (a) Object.assign(q, { answer: a, answerSource: 'model' as const });
          }
          issues.push(`no official key: ${agreed.size} model-agreed, ${disputed.length} disputed (${disputed.join(',')})`);
        }
        if (file.questions.length !== 100) issues.push(`${file.questions.length}/100 questions`);
        const noOptions = file.questions.filter((q) => (q.options?.length ?? 0) !== 4).length;
        if (noOptions) issues.push(`${noOptions} questions without 4 options`);
      } else if (file.questions.length < 12 || file.questions.length > 25) {
        issues.push(`${file.questions.length} questions (expected 12–25)`);
      }
      await writeFile(join(OUT, `${id}.json`), `${JSON.stringify(file, null, 2)}\n`);
      report[id] = { questions: file.questions.length, series: series ?? null, issues };
      console.log(`${id}: ${file.questions.length} questions${issues.length ? ` ⚠ ${issues.join('; ')}` : ''}`);
    } catch (err) {
      report[id] = { error: (err as Error).message };
      console.warn(`${id}: failed: ${(err as Error).message}`);
    }
    await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  }
}

await main();
