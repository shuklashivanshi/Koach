// Builds the syllabus graph seed (KB-01) from the official CSE notification.
//
//   GCP_PROJECT=koach-dev-8cf0a5 pnpm --filter @koach/kb gen:syllabus [official|gs|optionals] [paper]
//
// 1. official   : extract the official syllabus text per paper + the optional subjects' topics
//                 from raw/notif-2026.pdf into data/official/ (reference, not loaded into the DB)
// 2. gs         : split each GS paper into sections → topics → nodes (one 30–90 min study session)
// 3. optionals  : one topic-level file per optional subject
// Re-runnable per step and per paper; output is validated by test/syllabus.test.ts.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateJson } from '@koach/ai';
import { z } from 'zod';
import type { NodeSeed, SyllabusFile } from '../src/seed';

const ROOT = new URL('..', import.meta.url).pathname;
const RAW = join(ROOT, 'raw', 'notif-2026.pdf');
const OFFICIAL = join(ROOT, 'data', 'official');
const OUT = join(ROOT, 'data', 'syllabus');

const write = (path: string, data: unknown) =>
  writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
const read = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, 'utf8')) as T;

async function pdf() {
  return [{ mimeType: 'application/pdf', base64: (await readFile(RAW)).toString('base64') }];
}

// --- 1. Official text -------------------------------------------------------------------------

const OfficialPapers = z.object({
  papers: z.array(
    z.object({
      paper: z.enum(['prelims_gs1', 'csat', 'essay', 'gs1', 'gs2', 'gs3', 'gs4']),
      title: z.string(),
      officialText: z.string(),
    }),
  ),
});
const OptionalList = z.object({
  optionals: z.array(z.object({ slug: z.string(), name: z.string() })),
});
const OptionalTopics = z.object({
  optionals: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      topics: z.array(z.object({ paper: z.enum(['I', 'II']), title: z.string() })),
    }),
  ),
});
type OfficialPapers = z.infer<typeof OfficialPapers>;
type OptionalTopics = z.infer<typeof OptionalTopics>;

async function official() {
  const files = await pdf();
  const papers = await generateJson({
    feature: 'kb.syllabus.official',
    tier: 'bulk',
    files,
    schema: OfficialPapers,
    maxOutputTokens: 32000,
    prompt: `This is the official UPSC Civil Services Examination notification.
From Appendix I (Scheme and Syllabus), copy the official syllabus text VERBATIM for each of:
prelims_gs1 (Preliminary General Studies Paper I), csat (Preliminary General Studies Paper II),
essay (Main Paper I Essay), gs1, gs2, gs3, gs4 (Main General Studies Papers I–IV).
Do not summarise or add anything. title = the paper's official title.`,
  });
  await write(join(OFFICIAL, 'gs-papers.json'), papers.data);

  const list = await generateJson({
    feature: 'kb.syllabus.optionals',
    tier: 'bulk',
    files,
    schema: OptionalList,
    prompt: `List every optional subject for the Main Examination in this notification (including
each Literature subject). slug = lowercase-hyphenated name (e.g. "public-administration",
"literature-hindi"). Return all of them.`,
  });
  const all: OptionalTopics['optionals'] = [];
  const subjects = list.data.optionals;
  for (let i = 0; i < subjects.length; i += 6) {
    const batch = subjects.slice(i, i + 6);
    const res = await generateJson({
      feature: 'kb.syllabus.optional-topics',
      tier: 'bulk',
      files,
      schema: OptionalTopics,
      maxOutputTokens: 32000,
      prompt: `For each of these optional subjects, list the syllabus as short topic titles (each a
heading or numbered unit of the official syllabus, 5–15 words), separately for Paper I and Paper II,
in official order. For literature subjects list the units of each paper.
Subjects: ${batch.map((b) => `${b.slug} (${b.name})`).join('; ')}`,
    });
    all.push(...res.data.optionals);
    console.log(`optionals ${i + batch.length}/${subjects.length}`);
  }
  await write(join(OFFICIAL, 'optionals.json'), { optionals: all });
  console.log(`official: ${papers.data.papers.length} papers, ${all.length} optionals`);
}

// --- 2. GS node trees ---------------------------------------------------------------------------

/** Target number of study-session nodes per paper (~810 total). */
const TARGET: Record<string, number> = {
  prelims_gs1: 90,
  csat: 40,
  essay: 20,
  gs1: 220,
  gs2: 170,
  gs3: 220,
  gs4: 80,
};

const Tree = z.object({
  sections: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      topics: z.array(
        z.object({
          key: z.string(),
          title: z.string(),
          nodes: z.array(
            z.object({
              key: z.string(),
              title: z.string(),
              estMinutes: z.number().int(),
              prelims: z.boolean(),
              mains: z.boolean(),
            }),
          ),
        }),
      ),
    }),
  ),
});
const Prereqs = z.object({
  prereqs: z.array(z.object({ id: z.string(), requires: z.array(z.string()) })),
});

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

async function gsPaper(paper: string) {
  const { papers } = await read<OfficialPapers>(join(OFFICIAL, 'gs-papers.json'));
  const off = papers.find((p) => p.paper === paper);
  if (!off) throw new Error(`no official text for ${paper}`);
  const target = TARGET[paper] ?? 100;
  const scope =
    paper === 'prelims_gs1'
      ? `Only include what is NOT already covered by Mains GS I–III:
(1) ancient and medieval Indian history (political, administrative, economic and religious history
from prehistory to the Mughals and regional kingdoms; art and architecture are covered elsewhere),
(2) basic general science (physics, chemistry, biology, everyday science),
(3) how current events are covered. Modern history, art and culture, geography, polity, economy,
environment and S&T live in the Mains GS papers.`
      : paper === 'csat'
        ? 'Cover comprehension, reasoning, decision making, basic numeracy (Class X) and data interpretation.'
        : '';
  const tree = await generateJson({
    feature: 'kb.syllabus.tree',
    tier: 'bulk',
    schema: Tree,
    maxOutputTokens: 60000,
    prompt: `You are building a study graph for the UPSC Civil Services Examination.
Paper: ${off.title} (${paper}). Official syllabus:
"""
${off.officialText}
"""
${scope}
Break it into sections (subjects), topics, and about ${target} nodes in total. A node is ONE study
session of 30–90 minutes on a concrete, nameable unit that UPSC questions are asked on
(e.g. "Right to Equality (Art 14–18)", "Monsoon mechanism and Indian rainfall"). Cover the full
scope UPSC has actually examined under this syllabus, not just the literal words. Keys are short
lowercase slugs unique within their parent. estMinutes 30–90. prelims/mains = whether the node is
examined in that stage. Titles: plain, neutral; never name any teacher, coaching institute, app,
platform, channel or course.`,
  });

  const nodes: NodeSeed[] = [
    { id: paper, parentId: null, title: off.title, kind: 'paper', prelims: paper === 'prelims_gs1' || paper === 'csat', mains: !['prelims_gs1', 'csat'].includes(paper), prereqs: [] },
  ];
  for (const sec of tree.data.sections) {
    const secId = `${paper}.${slug(sec.key)}`;
    const topicNodes = sec.topics.flatMap((t) => t.nodes);
    nodes.push({
      id: secId,
      parentId: paper,
      title: sec.title,
      kind: 'section',
      prelims: topicNodes.some((n) => n.prelims),
      mains: topicNodes.some((n) => n.mains),
      prereqs: [],
    });
    for (const top of sec.topics) {
      const topId = `${secId}.${slug(top.key)}`;
      nodes.push({
        id: topId,
        parentId: secId,
        title: top.title,
        kind: 'topic',
        prelims: top.nodes.some((n) => n.prelims),
        mains: top.nodes.some((n) => n.mains),
        prereqs: [],
      });
      for (const n of top.nodes) {
        nodes.push({
          id: `${topId}.${slug(n.key)}`,
          parentId: topId,
          title: n.title,
          kind: 'node',
          estMinutes: Math.min(90, Math.max(30, n.estMinutes)),
          prelims: n.prelims,
          mains: n.mains,
          prereqs: [],
        });
      }
    }
  }
  // Deduplicate ids (models occasionally repeat a key).
  const seen = new Map<string, number>();
  for (const n of nodes) {
    const c = seen.get(n.id) ?? 0;
    seen.set(n.id, c + 1);
    if (c) n.id = `${n.id}-${c + 1}`;
  }

  // Second pass: prerequisites between leaf nodes of this paper.
  const leaves = nodes.filter((n) => n.kind === 'node');
  const pre = await generateJson({
    feature: 'kb.syllabus.prereqs',
    tier: 'bulk',
    schema: Prereqs,
    maxOutputTokens: 30000,
    prompt: `These are study nodes for ${off.title}. For each node that genuinely needs another node
studied first, list those prerequisite ids (only ids from this list, at most 3, never itself; skip
nodes with no real prerequisite). Avoid cycles: a prerequisite should be more foundational.
${leaves.map((n) => `${n.id} | ${n.title}`).join('\n')}`,
  });
  const ids = new Set(leaves.map((n) => n.id));
  const byId = new Map(leaves.map((n) => [n.id, n]));
  for (const p of pre.data.prereqs) {
    const node = byId.get(p.id);
    if (!node) continue;
    node.prereqs = [...new Set(p.requires.filter((r) => r !== p.id && ids.has(r)))].slice(0, 3);
  }
  breakCycles(leaves);

  const file: SyllabusFile = { paper, title: off.title, nodes };
  await write(join(OUT, `${paper}.json`), file);
  console.log(`${paper}: ${tree.data.sections.length} sections, ${leaves.length} nodes`);
}

/** Drops the edge that closes any prerequisite cycle (keeps the graph a DAG). */
function breakCycles(nodes: NodeSeed[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const state = new Map<string, 1 | 2>();
  const visit = (n: NodeSeed) => {
    state.set(n.id, 1);
    for (const p of [...n.prereqs]) {
      const s = state.get(p);
      if (s === 1) n.prereqs = n.prereqs.filter((x) => x !== p);
      else if (!s) {
        const next = byId.get(p);
        if (next) visit(next);
      }
    }
    state.set(n.id, 2);
  };
  for (const n of nodes) if (!state.has(n.id)) visit(n);
}

// --- 3. Optional subjects (topic level) --------------------------------------------------------

async function optionals() {
  const { optionals: subjects } = await read<OptionalTopics>(join(OFFICIAL, 'optionals.json'));
  for (const sub of subjects) {
    const paper = `optional:${slug(sub.slug)}`;
    const root = `opt.${slug(sub.slug)}`;
    const nodes: NodeSeed[] = [
      { id: root, parentId: null, title: sub.name, kind: 'paper', prelims: false, mains: true, prereqs: [] },
    ];
    for (const p of ['I', 'II'] as const) {
      const topics = sub.topics.filter((t) => t.paper === p);
      if (!topics.length) continue;
      const secId = `${root}.p${p.length}`;
      nodes.push({ id: secId, parentId: root, title: `${sub.name} · Paper ${p}`, kind: 'section', prelims: false, mains: true, prereqs: [] });
      topics.forEach((t, i) =>
        nodes.push({
          id: `${secId}.t${String(i + 1).padStart(2, '0')}`,
          parentId: secId,
          title: t.title,
          kind: 'topic',
          prelims: false,
          mains: true,
          prereqs: [],
        }),
      );
    }
    await write(join(OUT, `optional-${slug(sub.slug)}.json`), { paper, title: sub.name, nodes });
  }
  console.log(`optionals: ${subjects.length} files`);
}

const [step = 'all', only] = process.argv.slice(2);
if (step === 'official' || step === 'all') await official();
if (step === 'gs' || step === 'all') {
  for (const p of only ? [only] : Object.keys(TARGET)) await gsPaper(p);
}
if (step === 'optionals' || step === 'all') await optionals();
