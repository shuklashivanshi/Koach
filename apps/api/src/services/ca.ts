import { type Db, schema } from '@koach/db';
import { acceptMcq, McqVerdict, verifyPrompt } from '@koach/ai';
import { checkText } from '@koach/guard';
import { and, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AiService } from './ai';
import { istDay } from './study';

// Current affairs pipeline (CA-01..06): official feeds → filter → dedupe → Gemini summary and
// syllabus links → daily MCQs → blind verifier. Rules decide what is kept; Gemini only writes.

const s = schema;
export type FetchFn = (url: string) => Promise<{ ok: boolean; text: () => Promise<string> }>;

export const FEEDS = [
  { source: 'PIB', url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=2&Regid=3' },
  { source: 'RBI', url: 'https://www.rbi.org.in/pressreleases_rss.xml' },
  { source: 'SEBI', url: 'https://www.sebi.gov.in/sebirss.xml' },
];

/** Routine releases with no UPSC value, dropped by rule before any AI call. */
const ROUTINE =
  /auction|cut-?off|recovery certificate|notice of demand|tender|corrigendum|money market operations|treasury bills?|lending facility|reserve money|results? of|scheme of arrangement|appointment of|auction results|weekly statistical|attachment order|settlement order|adjudication order/i;

export interface FeedItem {
  source: string;
  url: string;
  title: string;
  publishedAt: Date | null;
}

const decode = (t: string) =>
  t
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

export function parseRss(xml: string, source: string): FeedItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap((m) => {
    const body = m[1] ?? '';
    const title = decode(/<title>([\s\S]*?)<\/title>/.exec(body)?.[1] ?? '');
    const url = decode(/<link>([\s\S]*?)<\/link>/.exec(body)?.[1] ?? '');
    const date = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(body)?.[1];
    if (!title || !url.startsWith('http')) return [];
    const parsed = date ? new Date(decode(date)) : null;
    return [
      {
        source,
        url,
        title,
        publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed : null,
      },
    ];
  });
}

export const titleKey = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, 120);

const pageText = (html: string) =>
  decode(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).slice(
    0,
    4000,
  );

const Analysis = z.object({
  items: z.array(
    z.object({
      index: z.number().int(),
      relevance: z.number().min(0).max(1),
      summary: z.string(),
      nodes: z.array(z.string()),
    }),
  ),
});

const Quiz = z.object({
  questions: z.array(
    z.object({
      item: z.number().int(),
      kind: z.enum(['statement', 'how_many', 'match']),
      stem: z.string(),
      options: z.array(z.object({ key: z.enum(['a', 'b', 'c', 'd']), text: z.string() })).length(4),
      answer: z.enum(['a', 'b', 'c', 'd']),
      explanation: z.string(),
    }),
  ),
});

type QuizQ = z.infer<typeof Quiz>['questions'][number];

export async function verifyQuestions(
  ai: AiService,
  questions: QuizQ[],
  sources: string[],
): Promise<{ kept: QuizQ[]; dropped: number }> {
  if (!questions.length) return { kept: [], dropped: 0 };
  const res = await ai.json({
    feature: 'ca.verify',
    tier: 'bulk',
    uid: '',
    schema: McqVerdict,
    prompt: verifyPrompt(
      questions,
      questions.map((q) => sources[q.item] ?? ''),
    ),
  });
  const byIndex = new Map(res.data.checks.map((c) => [c.index, c]));
  const kept = questions.filter((q, i) => acceptMcq(q, byIndex.get(i)));
  return { kept, dropped: questions.length - kept.length };
}

export interface IngestReport {
  fetched: number;
  routine: number;
  duplicates: number;
  stored: number;
  visible: number;
  questions: number;
  dropped: number;
}

export async function ingestCurrentAffairs(
  db: Db,
  ai: AiService,
  now: Date,
  fetchFn: FetchFn = fetch,
  opts: { maxItems?: number; maxQuestions?: number } = {},
): Promise<IngestReport> {
  const report: IngestReport = {
    fetched: 0,
    routine: 0,
    duplicates: 0,
    stored: 0,
    visible: 0,
    questions: 0,
    dropped: 0,
  };
  // 1. Collect candidates from feeds and shared links.
  const candidates: FeedItem[] = [];
  for (const f of FEEDS) {
    try {
      const res = await fetchFn(f.url);
      if (res.ok) candidates.push(...parseRss(await res.text(), f.source));
    } catch {
      // One feed being down must not stop the others.
    }
  }
  const shared = await db.select().from(s.caShared).where(eq(s.caShared.status, 'queued'));
  for (const l of shared)
    candidates.push({ source: 'shared', url: l.url, title: l.url, publishedAt: now });
  report.fetched = candidates.length;

  // 2. Rules: drop routine releases and anything already stored.
  const fresh = candidates.filter((c) => {
    if (ROUTINE.test(c.title)) {
      report.routine++;
      return false;
    }
    return true;
  });
  const keys = fresh.map((c) => titleKey(c.title));
  const existing = fresh.length
    ? await db
        .select({ url: s.caItems.url, key: s.caItems.titleKey })
        .from(s.caItems)
        .where(
          or(
            inArray(
              s.caItems.url,
              fresh.map((c) => c.url),
            ),
            inArray(s.caItems.titleKey, keys),
          ),
        )
    : [];
  const seen = new Set([...existing.map((e) => e.url), ...existing.map((e) => e.key)]);
  const unique: (FeedItem & { key: string; text: string })[] = [];
  for (const c of fresh) {
    const key = titleKey(c.title);
    if (seen.has(c.url) || seen.has(key)) {
      report.duplicates++;
      continue;
    }
    seen.add(c.url).add(key);
    unique.push({ ...c, key, text: '' });
    if (unique.length >= (opts.maxItems ?? 30)) break;
  }
  for (const u of unique) {
    try {
      const res = await fetchFn(u.url);
      u.text = res.ok ? pageText(await res.text()) : '';
    } catch {
      u.text = '';
    }
  }
  if (shared.length) {
    await db
      .update(s.caShared)
      .set({ status: 'done' })
      .where(
        inArray(
          s.caShared.id,
          shared.map((x) => x.id),
        ),
      );
  }
  if (!unique.length) return report;

  // 3. Gemini: relevance, UPSC-angle summary, syllabus nodes (ids from the list only).
  const nodes = await db
    .select({ id: s.syllabusNodes.id, title: s.syllabusNodes.title, paper: s.syllabusNodes.paper })
    .from(s.syllabusNodes)
    .where(eq(s.syllabusNodes.kind, 'node'));
  const gs = nodes.filter(
    (n) => !n.paper.startsWith('optional:') && n.paper !== 'csat' && n.paper !== 'essay',
  );
  const validNodes = new Set(gs.map((n) => n.id));
  const nodeList = gs.map((n) => `${n.id} | ${n.title}`).join('\n');
  const analysed: ((typeof unique)[number] & {
    relevance: number;
    summary: string;
    nodes: string[];
  })[] = [];
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10);
    const res = await ai.json({
      feature: 'ca.analyse',
      tier: 'bulk',
      uid: '',
      schema: Analysis,
      prompt: `For each official release below (it may be in Hindi), give:
- relevance: 0..1, how useful it is for the UPSC Civil Services exam (policy, schemes, economy,
  environment, science, international relations, polity score high; routine administration low)
- summary: at most 80 words in English, the UPSC angle (what it is, why it matters, link to the
  static syllabus). Do not copy sentences; never name any coaching institute, app or website.
- nodes: 1–3 syllabus node ids from the list that this news links to

Syllabus nodes:
${nodeList}

Releases:
${batch.map((b, j) => `#${j} [${b.source}] ${b.title}\n${b.text.slice(0, 1500)}`).join('\n\n')}`,
    });
    for (const a of res.data.items) {
      const b = batch[a.index];
      if (!b) continue;
      const summary = checkText(a.summary).length ? '' : a.summary.trim();
      analysed.push({
        ...b,
        relevance: a.relevance,
        summary,
        nodes: a.nodes.filter((n) => validNodes.has(n)).slice(0, 3),
      });
    }
  }
  const stored = [];
  for (const a of analysed) {
    const visible = a.relevance >= 0.5 && !!a.summary;
    const [row] = await db
      .insert(s.caItems)
      .values({
        url: a.url,
        titleKey: a.key,
        source: a.source,
        title: a.source === 'shared' ? a.summary.slice(0, 80) || a.url : a.title,
        publishedAt: a.publishedAt,
        summary: a.summary || null,
        relevance: a.relevance,
        nodes: a.nodes,
        visible,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning();
    if (row) {
      stored.push({ row, text: a.text });
      report.stored++;
      if (visible) report.visible++;
    }
  }

  // 4. Daily quiz from the most relevant items, verified blind before anyone sees it.
  const day = istDay(now);
  const top = stored
    .filter((x) => x.row.visible)
    .sort((a, b) => (b.row.relevance ?? 0) - (a.row.relevance ?? 0))
    .slice(0, opts.maxQuestions ?? 10);
  if (!top.length) return report;
  const sources = top.map((t) => `${t.row.title}. ${t.row.summary ?? ''} ${t.text.slice(0, 1200)}`);
  const quiz = await ai.json({
    feature: 'ca.quiz',
    tier: 'bulk',
    uid: '',
    schema: Quiz,
    prompt: `Write one UPSC Prelims-style MCQ for each source below (item = its index). Mix formats:
statement (consider the following statements, which is/are correct; options like "1 only"),
how_many (how many of the above are correct; options "Only one", "Only two", ...), match (pairs).
Exactly one option must be correct and provable from the source text alone. Explanation: 1–2
sentences citing the source. Never name any coaching institute, app or website.

${sources.map((src, i) => `#${i} ${src}`).join('\n\n')}`,
  });
  const clean = quiz.data.questions.filter(
    (q) =>
      top[q.item] &&
      !checkText(`${q.stem} ${q.explanation} ${q.options.map((o) => o.text).join(' ')}`).length,
  );
  const { kept, dropped } = await verifyQuestions(ai, clean, sources);
  report.dropped = dropped + (quiz.data.questions.length - clean.length);
  if (kept.length) {
    await db.insert(s.caQuestions).values(
      kept.map((q) => ({
        day,
        itemId: top[q.item]!.row.id,
        kind: q.kind,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      })),
    );
  }
  report.questions = kept.length;
  return report;
}

/** Today's live questions (answers withheld until submitted). */
export async function todayQuiz(db: Db, now: Date) {
  return db
    .select({
      id: s.caQuestions.id,
      kind: s.caQuestions.kind,
      stem: s.caQuestions.stem,
      options: s.caQuestions.options,
      itemId: s.caQuestions.itemId,
      title: s.caItems.title,
      url: s.caItems.url,
      source: s.caItems.source,
    })
    .from(s.caQuestions)
    .innerJoin(s.caItems, eq(s.caItems.id, s.caQuestions.itemId))
    .where(and(eq(s.caQuestions.day, istDay(now)), eq(s.caQuestions.status, 'live')));
}

export async function caQuizReady(db: Db, now: Date) {
  return (await todayQuiz(db, now)).length > 0;
}

export async function recentForNode(db: Db, nodeId: string, now: Date) {
  const since = new Date(now.getTime() - 90 * 86_400_000);
  return db
    .select({
      id: s.caItems.id,
      title: s.caItems.title,
      summary: s.caItems.summary,
      url: s.caItems.url,
      source: s.caItems.source,
      createdAt: s.caItems.createdAt,
    })
    .from(s.caItems)
    .where(
      and(
        eq(s.caItems.visible, true),
        gte(s.caItems.createdAt, since),
        sql`${s.caItems.nodes} @> ${JSON.stringify([nodeId])}::jsonb`,
      ),
    )
    .orderBy(desc(s.caItems.createdAt))
    .limit(10);
}
