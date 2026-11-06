// Discovers, downloads and identifies the official UPSC CSE General Studies papers (KB-02).
//
//   GCP_PROJECT=koach-dev-8cf0a5 pnpm --filter @koach/kb fetch:papers
//
// 1. Scrapes upsc.gov.in listing pages for PDF links (current, archives, per-year pages, answer keys).
// 2. Downloads each candidate into raw/papers/ (gitignored), skipping files already present.
// 3. Gemini reads the first pages of each PDF and says what it is (exam, paper, year).
// 4. Writes data/pyq-manifest.json: one entry per wanted paper, with its official URL.
//    Wanted: Prelims GS-I 2011–2026 (+ answer keys), Mains GS I–IV 2013–2026.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateJson } from '@koach/ai';
import { PDFDocument } from 'pdf-lib';
import { z } from 'zod';

const ROOT = new URL('..', import.meta.url).pathname;
const RAW = join(ROOT, 'raw', 'papers');
const MANIFEST = join(ROOT, 'data', 'pyq-manifest.json');
const CACHE = join(ROOT, 'raw', 'identified.json');
const BASE = 'https://www.upsc.gov.in';
const UA = { 'user-agent': 'Mozilla/5.0 (Macintosh) Koach-KB/1.0 (official papers, personal study)' };

const LISTINGS = [
  '/examinations/previous-question-papers?field_exam_name_value=Civil+Services+(Preliminary)+Examination',
  '/examinations/previous-question-papers/archives?field_exam_name_value=Civil+Services+(Preliminary)+Examination',
  '/examinations/previous-question-papers?field_exam_name_value=Civil+Services+(Main)+Examination',
  '/examinations/previous-question-papers/archives?field_exam_name_value=Civil+Services+(Main)+Examination',
  ...[2011, 2012, 2013, 2014, 2015, 2016].map(
    (y) => `/examinations/question-papers/question-papers-year-${y}?field_exam_name_value=civil+services`,
  ),
  // Each exam's own page lists its papers and, after the final result, the official answer key.
  ...Array.from({ length: 16 }, (_, i) => 2011 + i).flatMap((y) => [
    `/examinations/Civil%20Services%20(Preliminary)%20Examination,%20${y}`,
    `/examinations/Civil%20Services%20(Main)%20Examination,%20${y}`,
    `/examinations/CIVIL%20SERVICES%20(PRELIMINARY)%20EXAM.%20${y}`,
    `/examinations/CIVIL%20SERVICES%20(MAIN)%20EXAM.%20${y}`,
  ]),
  '/examinations/answer-key',
  '/examinations/answer-key?field_exam_name_value=Civil+Services',
];

/** Link text or file name suggesting a GS paper, essay excluded later by identification. */
const WANTED = /general|gen[_ -]?st|g\.?s\.?[ _-]?(i|1|paper)|csp|prelim|pre[_ -]?exam|answer|ans[_ -]?key|key|csm|gs\d|qp/i;
const SKIP =
  /\b(optional|literature|lit|compulsory|engg|engineering|agricultur\w*|anthropolog\w*|botan\w*|chemistry|commerce|economics|geograph\w*|geolog\w*|history|law|management|mathematics|medical|philosoph\w*|physics|political|psychology|public administration|sociology|statistics|zoology|animal|ifs|forest|cds|nda|cms|ese|ies|capf|geo scientist|cgsp|cgsm|ifsp|ifsm|cds\w*|nda\w*|cms\w*|esep|esem|iesm|iess|capf\w*)\b/i;

async function listPdfs(): Promise<Map<string, string>> {
  const found = new Map<string, string>(); // url -> link text
  for (const path of LISTINGS) {
    const res = await fetch(BASE + path, { headers: UA });
    if (!res.ok) continue; // not every naming variant exists for every year
    const html = await res.text();
    for (const m of html.matchAll(/<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const href = m[1] ?? '';
      const text = (m[2] ?? '').replace(/<[^>]+>|\s+/g, ' ').trim();
      const url = href.startsWith('http') ? href : BASE + (href.startsWith('/') ? '' : '/') + href;
      const words = `${text} ${decodeURIComponent(url).split('/').pop() ?? ''}`.replace(/[^a-z0-9]+/gi, ' ');
      if (!WANTED.test(`${text} ${url}`) || SKIP.test(words)) continue;
      if (!url.includes('upsc.gov.in')) continue;
      found.set(url, text);
    }
  }
  return found;
}

const fileFor = (url: string) =>
  join(RAW, `${createHash('sha1').update(url).digest('hex').slice(0, 16)}.pdf`);

async function download(url: string): Promise<string | null> {
  const file = fileFor(url);
  if (existsSync(file)) return file;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) {
    console.warn(`download ${res.status}: ${url}`);
    return null;
  }
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

/** First pages only, so even 30 MB scanned papers fit an inline request. */
export async function pdfPages(file: string, from: number, to: number): Promise<string> {
  const src = await PDFDocument.load(await readFile(file), { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const idx = [...Array(Math.min(to, src.getPageCount()) - from).keys()].map((i) => i + from);
  for (const p of await out.copyPages(src, idx)) out.addPage(p);
  return Buffer.from(await out.save()).toString('base64');
}

const Identity = z.object({
  /** The paper's title exactly as printed at the top of its first page. */
  title: z.string(),
  kind: z.enum(['question_paper', 'answer_key', 'other']),
  exam: z.enum(['prelims', 'mains', 'other']),
  /** gs1..gs4 for General Studies; csat for Prelims Paper II; essay; other */
  paper: z.enum(['gs1', 'gs2', 'gs3', 'gs4', 'csat', 'essay', 'other']),
  year: z.number().int(),
  /** For an answer key: which series/booklet codes it covers, e.g. ["A","B","C","D"] */
  series: z.array(z.string()),
});
type Identity = z.infer<typeof Identity>;

async function identify(file: string): Promise<Identity> {
  const base64 = await pdfPages(file, 0, 2);
  const res = await generateJson({
    feature: 'kb.pyq.identify',
    tier: 'lite',
    schema: Identity,
    files: [{ mimeType: 'application/pdf', base64 }],
    prompt: `These are the first pages of a UPSC document. Identify it.
kind: question_paper, answer_key, or other.
exam: prelims = Civil Services (Preliminary) Examination; mains = Civil Services (Main) Examination;
other = any other UPSC exam (IFS, CDS, ...).
paper: Prelims "General Studies Paper I" = gs1, Prelims "Paper II"/CSAT = csat; Mains "General
Studies Paper I..IV" = gs1..gs4, Mains Essay = essay; anything else = other.
year: the examination year printed on the paper (four digits).
series: for answer keys, the booklet series covered; else [].
title: copy the paper/subject title exactly as printed (e.g. "GENERAL STUDIES (PAPER-II)",
"PUBLIC ADMINISTRATION (PAPER-I)", "ANSWER KEY ... GENERAL STUDIES PAPER-I").`,
  });
  return res.data;
}

const ROMAN: Record<string, string> = { i: 'gs1', '1': 'gs1', ii: 'gs2', '2': 'gs2', iii: 'gs3', '3': 'gs3', iv: 'gs4', '4': 'gs4' };

/** The printed title must say General Studies and agree with the paper number (catches optionals). */
function titleMatches(id: Identity): boolean {
  if (!['gs1', 'gs2', 'gs3', 'gs4'].includes(id.paper) || !id.title) return false;
  const t = id.title.toLowerCase();
  // Papers are bilingual; the title may be printed in Hindi first.
  if (!/general\s*studies|सामान्य\s*अध्ययन/.test(t)) return false;
  const m = /(?:paper|प्रश्न-पत्र)\s*[-–—:]?\s*\(?\s*(iv|iii|ii|i|[1-4])(?![a-z])/.exec(t);
  // A printed number must agree; a bare "General Studies" title is accepted.
  return m ? ROMAN[m[1] ?? ''] === id.paper : true;
}

export interface ManifestEntry {
  exam: 'prelims' | 'mains';
  paper: 'gs1' | 'gs2' | 'gs3' | 'gs4';
  year: number;
  url: string;
  file: string;
  answerKeyUrl?: string;
  answerKeyFile?: string;
}

async function main() {
  await mkdir(RAW, { recursive: true });
  const links = await listPdfs();
  console.log(`${links.size} candidate PDFs`);
  const cache: Record<string, Identity> = existsSync(CACHE)
    ? (JSON.parse(await readFile(CACHE, 'utf8')) as Record<string, Identity>)
    : {};
  for (const url of links.keys()) {
    // Older cache entries have no title; re-identify the ones that claimed to be GS papers.
    const cached = cache[url];
    if (cached && (cached.title !== undefined || !['gs1', 'gs2', 'gs3', 'gs4'].includes(cached.paper))) continue;
    const file = await download(url);
    if (!file) continue;
    try {
      cache[url] = await identify(file);
      console.log(`${cache[url].exam} ${cache[url].paper} ${cache[url].year} ${cache[url].kind} ← ${url}`);
    } catch (err) {
      console.warn(`identify failed: ${url}: ${(err as Error).message}`);
    }
    await writeFile(CACHE, JSON.stringify(cache, null, 2));
  }

  const entries = new Map<string, ManifestEntry>();
  const keys = new Map<number, string>();
  for (const [url, id] of Object.entries(cache)) {
    if (!titleMatches(id)) continue;
    if (id.kind === 'answer_key' && id.exam === 'prelims' && id.paper === 'gs1') keys.set(id.year, url);
    if (id.kind !== 'question_paper') continue;
    const wanted =
      (id.exam === 'prelims' && id.paper === 'gs1' && id.year >= 2011) ||
      (id.exam === 'mains' && ['gs1', 'gs2', 'gs3', 'gs4'].includes(id.paper) && id.year >= 2013);
    if (!wanted) continue;
    const k = `${id.exam}-${id.year}-${id.paper}`;
    if (!entries.has(k)) {
      entries.set(k, {
        exam: id.exam as 'prelims' | 'mains',
        paper: id.paper as ManifestEntry['paper'],
        year: id.year,
        url,
        file: fileFor(url).slice(ROOT.length),
      });
    }
  }
  for (const e of entries.values()) {
    const key = e.exam === 'prelims' ? keys.get(e.year) : undefined;
    if (key) {
      e.answerKeyUrl = key;
      e.answerKeyFile = fileFor(key).slice(ROOT.length);
    }
  }
  const list = [...entries.values()].sort((a, b) =>
    a.exam === b.exam ? a.year - b.year || a.paper.localeCompare(b.paper) : a.exam.localeCompare(b.exam),
  );
  await writeFile(MANIFEST, `${JSON.stringify({ papers: list }, null, 2)}\n`);

  // Report coverage against what KB-02 needs.
  const missing: string[] = [];
  for (let y = 2011; y <= 2026; y++) {
    if (!entries.has(`prelims-${y}-gs1`)) missing.push(`prelims ${y} gs1`);
  }
  for (let y = 2013; y <= 2026; y++) {
    for (const p of ['gs1', 'gs2', 'gs3', 'gs4']) {
      if (!entries.has(`mains-${y}-${p}`)) missing.push(`mains ${y} ${p}`);
    }
  }
  console.log(`manifest: ${list.length} papers; missing ${missing.length}: ${missing.join(', ')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
