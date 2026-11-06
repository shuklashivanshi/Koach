// Optional subject profiles for the Fit Quiz and Explorer (OPT-01/02). GS/Essay overlap is computed
// from the syllabus graph (topic → GS sections), not guessed. Output: data/optionals/profiles.json
//
//   GCP_PROJECT=koach-dev-8cf0a5 pnpm --filter @koach/kb exec tsx scripts/optional-profiles.ts [slug...]
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateJson } from '@koach/ai';
import { checkText } from '@koach/guard';
import { z } from 'zod';
import type { SyllabusFile } from '../src/seed';
import { BACKGROUNDS, INTERESTS } from '../src/optionals';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA = join(ROOT, 'data');
const OUT = join(DATA, 'optionals', 'profiles.json');

const Profile = z.object({
  backgrounds: z.array(z.enum(BACKGROUNDS)),
  interests: z.array(z.enum(INTERESTS)),
  reading: z.object({
    theory: z.number(),
    data: z.number(),
    narratives: z.number(),
    debates: z.number(),
  }),
  answer: z.object({
    analytical: z.number(),
    factual: z.number(),
    diagrams: z.number(),
    numericals: z.number(),
  }),
  materials: z.number(),
  hours: z.number().int(),
  books: z.array(z.string()),
  summary: z.string(),
});
const Overlap = z.object({
  topics: z.array(z.object({ index: z.number().int(), sections: z.array(z.string()) })),
});

async function main() {
  const syl = join(DATA, 'syllabus');
  const files = await Promise.all(
    (await readdir(syl))
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => JSON.parse(await readFile(join(syl, f), 'utf8')) as SyllabusFile),
  );
  const gsSections = files
    .filter((f) => !f.paper.startsWith('optional:'))
    .flatMap((f) => f.nodes.filter((n) => n.kind === 'section'))
    .map((n) => `${n.id} | ${n.title}`)
    .join('\n');
  const validSections = new Set(gsSections.split('\n').map((l) => l.split(' | ')[0]));
  const existing: Record<string, unknown> = existsSync(OUT)
    ? (JSON.parse(await readFile(OUT, 'utf8')) as { profiles: Record<string, unknown> }).profiles
    : {};
  const only = process.argv.slice(2);
  const profiles: Record<string, unknown> = { ...existing };
  for (const f of files.filter((x) => x.paper.startsWith('optional:'))) {
    const slug = f.paper.slice('optional:'.length);
    if (only.length ? !only.includes(slug) : existing[slug]) continue;
    const topics = f.nodes.filter((n) => n.kind === 'topic');
    try {
      const p = await generateJson({
        feature: 'kb.optional.profile',
        tier: 'bulk',
        schema: Profile,
        prompt: `Profile the UPSC CSE Mains optional subject "${f.title}" for an aspirant choosing an optional.
Syllabus topics: ${topics.map((t) => t.title).join('; ')}
- backgrounds: degree backgrounds that give a real head start (from: ${BACKGROUNDS.join(', ')}; "any" if none needed)
- interests: from: ${INTERESTS.join(', ')}
- reading: how much the subject rewards each reading taste (0..1)
- answer: how much answers need each style (0..1)
- materials: availability of standard books and past papers (0..1)
- hours: realistic first full preparation hours for both papers
- books: 3–5 standard book titles with authors (no coaching institute or platform names, no
  material named after one)
- summary: one neutral sentence on what the subject is like to study.`,
      });
      const ov = await generateJson({
        feature: 'kb.optional.overlap',
        tier: 'bulk',
        schema: Overlap,
        prompt: `For each optional syllabus topic, list the GS/Essay section ids (from the list) whose content
substantially overlaps it. Use [] when there is no real overlap.
GS sections:
${gsSections}
Optional topics:
${topics.map((t, i) => `${i}. ${t.title}`).join('\n')}`,
      });
      const sectionsByTopic = ov.data.topics.map((t) =>
        t.sections.filter((s) => validSections.has(s)),
      );
      const overlapping = sectionsByTopic.filter((x) => x.length).length;
      const books = p.data.books.filter((b) => !checkText(b).length);
      profiles[slug] = {
        name: f.title,
        ...p.data,
        books,
        topics: topics.length,
        gsOverlap: topics.length ? Math.round((overlapping / topics.length) * 100) / 100 : 0,
        overlapSections: [...new Set(sectionsByTopic.flat())],
      };
      console.log(
        `${slug}: overlap ${(profiles[slug] as { gsOverlap: number }).gsOverlap}, ${p.data.hours}h`,
      );
      await writeFile(OUT, `${JSON.stringify({ profiles }, null, 2)}\n`);
    } catch (err) {
      console.warn(`${slug}: ${(err as Error).message}`);
    }
  }
}

await main();
