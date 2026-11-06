// OPT-05: optional-wise appeared/recommended counts from official UPSC Annual Reports (multi-year),
// never from third-party tables. Output: data/optionals/stats.json (committed; sources listed).
//
//   GCP_PROJECT=koach-dev-8cf0a5 pnpm --filter @koach/kb exec tsx scripts/optional-stats.ts
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateJson } from '@koach/ai';
import { z } from 'zod';

const ROOT = new URL('..', import.meta.url).pathname;
const RAW = join(ROOT, 'raw', 'annual');
const OUT = join(ROOT, 'data', 'optionals', 'stats.json');

/** English annual reports on upsc.gov.in that carry the optional-subject table. */
const REPORTS = [
  'https://www.upsc.gov.in/sites/default/files/UPSC_Annual_Report_English_For_digita_%2028-11-15.pdf',
  'https://www.upsc.gov.in/sites/default/files/68rh-AnnualReport-2017-18Engl160719.pdf',
  'https://www.upsc.gov.in/sites/default/files/69-FinalAnnualReport-2018-19-English.pdf',
  'https://www.upsc.gov.in/sites/default/files/72nd-AnnualReport-2021-22-ENGLISH-270423.pdf',
  'https://www.upsc.gov.in/sites/default/files/73rd-AnnualReport-2022-23-Engl-220824.pdf',
  'https://www.upsc.gov.in/sites/default/files/74thAnnualReport-2023-24-Engl-230326.pdf',
];

const Table = z.object({
  examYear: z.number().int(),
  rows: z.array(
    z.object({ optional: z.string(), appeared: z.number().int(), recommended: z.number().int() }),
  ),
});

async function main() {
  await mkdir(RAW, { recursive: true });
  await mkdir(join(ROOT, 'data', 'optionals'), { recursive: true });
  const { optionals } = JSON.parse(
    await readFile(join(ROOT, 'data', 'official', 'optionals.json'), 'utf8'),
  ) as {
    optionals: { slug: string; name: string }[];
  };
  const names = optionals.map((o) => `${o.slug} = ${o.name}`).join('\n');
  type Year = {
    examYear: number;
    source: string;
    rows: { slug: string; appeared: number; recommended: number }[];
  };
  // Merge with what earlier runs extracted; only reports not yet read are processed.
  const years: Year[] = existsSync(OUT)
    ? (JSON.parse(await readFile(OUT, 'utf8')) as { years: Year[] }).years
    : [];
  const done = new Set(years.map((y) => y.source));
  for (const url of REPORTS) {
    if (done.has(url)) continue;
    const file = join(
      RAW,
      decodeURIComponent(url.split('/').pop() ?? 'report.pdf').replace(/\s+/g, '_'),
    );
    if (!existsSync(file)) {
      const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Koach-KB/1.0' },
      });
      if (!res.ok) {
        console.warn(`download ${res.status}: ${url}`);
        continue;
      }
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
    }
    try {
      const res = await generateJson({
        feature: 'kb.optional-stats',
        tier: 'bulk',
        schema: Table,
        maxOutputTokens: 12000,
        files: [{ mimeType: 'application/pdf', base64: (await readFile(file)).toString('base64') }],
        prompt: `This is a UPSC Annual Report. Find the table that shows, for the Civil Services (Main)
Examination, the number of candidates who APPEARED and who were RECOMMENDED, broken down by optional
subject (often titled "Distribution of Candidates who Appeared vis-à-vis Recommended by Optional
Subjects"). Copy every row exactly (literature subjects included). examYear = the examination year
the table describes. Map each optional name to the slug from this list (use the exact slug):
${names}`,
      });
      const slugs = new Set(optionals.map((o) => o.slug));
      const rows = res.data.rows
        .filter((r) => slugs.has(r.optional) && r.appeared >= r.recommended)
        .map((r) => ({ slug: r.optional, appeared: r.appeared, recommended: r.recommended }));
      if (rows.length < 20) {
        console.warn(`${url}: only ${rows.length} rows recognised; skipped`);
        continue;
      }
      years.push({ examYear: res.data.examYear, source: url, rows });
      console.log(
        `CSM ${res.data.examYear}: ${rows.length} optionals from ${url.split('/').pop()}`,
      );
    } catch (err) {
      console.warn(`${url}: ${(err as Error).message}`);
    }
  }
  // One entry per exam year (later reports win).
  const byYear = new Map(years.map((y) => [y.examYear, y]));
  const out = [...byYear.values()].sort((a, b) => a.examYear - b.examYear);
  await writeFile(OUT, `${JSON.stringify({ years: out }, null, 2)}\n`);
  console.log(`wrote ${out.length} exam years`);
}

await main();
