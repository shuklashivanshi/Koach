// AI-suggests one primary source + chapter per GS study node (KB-03), chosen ONLY from the curated
// catalogue in data/sources/books.json. References only: no book text is stored. Status
// "suggested" until a reviewer approves or corrects it.
//
//   GCP_PROJECT=koach-dev-8cf0a5 pnpm --filter @koach/kb map:sources [paper ...]
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateJson } from '@koach/ai';
import { checkText } from '@koach/guard';
import { z } from 'zod';
import type { SyllabusFile } from '../src/seed';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA = join(ROOT, 'data');

const Out = z.object({
  map: z.array(
    z.object({ nodeId: z.string(), sourceId: z.string(), chapter: z.string(), reason: z.string() }),
  ),
});

interface Source {
  id: string;
  title: string;
  author?: string;
  neutralLabel?: string;
}

async function main() {
  const { sources } = JSON.parse(await readFile(join(DATA, 'sources', 'books.json'), 'utf8')) as {
    sources: Source[];
  };
  const sourceIds = new Set(sources.map((s) => s.id));
  const catalogue = sources
    .map((s) => `${s.id} | ${s.title}${s.author ? ` — ${s.author}` : ''}`)
    .join('\n');
  const only = process.argv.slice(2);
  const files = (await readdir(join(DATA, 'syllabus'))).filter(
    (f) => f.endsWith('.json') && !f.startsWith('optional-'),
  );
  for (const name of files) {
    const syl = JSON.parse(await readFile(join(DATA, 'syllabus', name), 'utf8')) as SyllabusFile;
    const out = join(DATA, 'sources', 'map', name);
    if (only.length ? !only.includes(syl.paper) : existsSync(out)) continue;
    const byId = new Map(syl.nodes.map((n) => [n.id, n]));
    const leaves = syl.nodes.filter((n) => n.kind === 'node');
    const map: z.infer<typeof Out>['map'] = [];
    for (let i = 0; i < leaves.length; i += 40) {
      const batch = leaves.slice(i, i + 40);
      const res = await generateJson({
        feature: 'kb.source.map',
        tier: 'bulk',
        schema: Out,
        maxOutputTokens: 16000,
        prompt: `For each UPSC study node, choose the ONE best primary source to read it from, from
this catalogue only (id | title — author). Prefer NCERT for foundations, then the standard book, then
an official document for policy/current topics.
chapter: the chapter number and title in that source as precisely as you know it (e.g. "Ch 7 ·
Fundamental Rights"); if unsure of the number, give the chapter title only.
reason: ONE short line (max 15 words) on why this source suits how UPSC asks this node. Never name a
teacher, coaching institute, app, platform or channel.

Catalogue:
${catalogue}

Nodes (id | section > topic > node):
${batch
  .map((n) => {
    const topic = n.parentId ? byId.get(n.parentId) : undefined;
    const section = topic?.parentId ? byId.get(topic.parentId) : undefined;
    return `${n.id} | ${section?.title ?? ''} > ${topic?.title ?? ''} > ${n.title}`;
  })
  .join('\n')}`,
      });
      const ids = new Set(batch.map((n) => n.id));
      for (const m of res.data.map) {
        if (!ids.has(m.nodeId) || !sourceIds.has(m.sourceId)) continue;
        if (checkText(`${m.reason} ${m.chapter}`).length) continue;
        map.push({ ...m, reason: m.reason.slice(0, 200) });
      }
    }
    await writeFile(out, `${JSON.stringify({ map }, null, 2)}\n`);
    console.log(`${syl.paper}: ${map.length}/${leaves.length} nodes mapped`);
  }
}

await main();
