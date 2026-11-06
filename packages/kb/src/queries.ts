import { type Db, schema } from '@koach/db';
import { asc, count, eq, inArray } from 'drizzle-orm';

const s = schema;

export type NodeRow = typeof s.syllabusNodes.$inferSelect;

/** How often a node (and everything under it) was asked, per exam. */
export interface NodeFrequency {
  prelims: number;
  mains: number;
  /** Distinct years the node was asked in, newest first. */
  years: number[];
}

/** Direct tag counts per node and exam, plus the years asked. */
async function directCounts(db: Db) {
  const rows = await db
    .select({ nodeId: s.pyqTags.nodeId, exam: s.pyqs.exam, year: s.pyqs.year, n: count() })
    .from(s.pyqTags)
    .innerJoin(s.pyqs, eq(s.pyqs.id, s.pyqTags.pyqId))
    .groupBy(s.pyqTags.nodeId, s.pyqs.exam, s.pyqs.year);
  return rows;
}

/** Frequency for every node, rolled up from leaves to ancestors. */
export async function nodeFrequencies(db: Db): Promise<Map<string, NodeFrequency>> {
  const [nodes, rows] = await Promise.all([
    db.select({ id: s.syllabusNodes.id, parentId: s.syllabusNodes.parentId }).from(s.syllabusNodes),
    directCounts(db),
  ]);
  const parent = new Map(nodes.map((n) => [n.id, n.parentId]));
  const freq = new Map<string, { prelims: number; mains: number; years: Set<number> }>();
  const get = (id: string) => {
    let f = freq.get(id);
    if (!f) freq.set(id, (f = { prelims: 0, mains: 0, years: new Set() }));
    return f;
  };
  for (const r of rows) {
    // Walk up the tree so each ancestor counts the question too.
    for (let id: string | null | undefined = r.nodeId; id; id = parent.get(id)) {
      const f = get(id);
      if (r.exam === 'prelims') f.prelims += r.n;
      else f.mains += r.n;
      f.years.add(r.year);
    }
  }
  return new Map(
    [...freq].map(([id, f]) => [
      id,
      { prelims: f.prelims, mains: f.mains, years: [...f.years].sort((a, b) => b - a) },
    ]),
  );
}

export interface SubjectWeight {
  paper: string;
  sectionId: string;
  title: string;
  prelims: number;
  mains: number;
  /** Share of all tagged questions of that exam, 0..1 */
  prelimsShare: number;
  mainsShare: number;
}

/** Weightage of each top-level section (subject) computed from the PYQ bank itself. */
export async function subjectWeightage(db: Db): Promise<SubjectWeight[]> {
  const [sections, freq, totals] = await Promise.all([
    db
      .select()
      .from(s.syllabusNodes)
      .where(eq(s.syllabusNodes.kind, 'section'))
      .orderBy(asc(s.syllabusNodes.paper), asc(s.syllabusNodes.ord)),
    nodeFrequencies(db),
    db.select({ exam: s.pyqs.exam, n: count() }).from(s.pyqs).groupBy(s.pyqs.exam),
  ]);
  const total = Object.fromEntries(totals.map((t) => [t.exam, t.n])) as Record<string, number>;
  return sections.map((sec) => {
    const f = freq.get(sec.id) ?? { prelims: 0, mains: 0, years: [] };
    return {
      paper: sec.paper,
      sectionId: sec.id,
      title: sec.title,
      prelims: f.prelims,
      mains: f.mains,
      prelimsShare: total.prelims ? f.prelims / total.prelims : 0,
      mainsShare: total.mains ? f.mains / total.mains : 0,
    };
  });
}

export async function listNodes(db: Db, paper?: string): Promise<NodeRow[]> {
  const q = db.select().from(s.syllabusNodes);
  return (paper ? q.where(eq(s.syllabusNodes.paper, paper)) : q).orderBy(
    asc(s.syllabusNodes.paper),
    asc(s.syllabusNodes.ord),
  );
}

export interface NodeSourceView {
  /** Neutral label when the book is named after an institute, else "Title · Author". */
  label: string;
  kind: string;
  chapter: string;
  reason: string;
  status: string;
}

export async function nodeSource(db: Db, nodeId: string): Promise<NodeSourceView | null> {
  const [row] = await db
    .select()
    .from(s.nodeSources)
    .innerJoin(s.sources, eq(s.sources.id, s.nodeSources.sourceId))
    .where(eq(s.nodeSources.nodeId, nodeId));
  if (!row) return null;
  const src = row.sources;
  return {
    label: src.neutralLabel ?? (src.author ? `${src.title} · ${src.author}` : src.title),
    kind: src.kind,
    chapter: row.node_sources.chapter,
    reason: row.node_sources.reason,
    status: row.node_sources.status,
  };
}

export type PyqRow = typeof s.pyqs.$inferSelect;

export async function pyqsForNode(db: Db, nodeId: string, limit = 50): Promise<PyqRow[]> {
  const ids = await db
    .select({ id: s.pyqTags.pyqId })
    .from(s.pyqTags)
    .where(eq(s.pyqTags.nodeId, nodeId));
  if (!ids.length) return [];
  return db
    .select()
    .from(s.pyqs)
    .where(
      inArray(
        s.pyqs.id,
        ids.map((r) => r.id),
      ),
    )
    .orderBy(asc(s.pyqs.year), asc(s.pyqs.number))
    .limit(limit);
}

export async function getNode(db: Db, id: string) {
  const [node] = await db.select().from(s.syllabusNodes).where(eq(s.syllabusNodes.id, id));
  if (!node) return null;
  const [prereqs, children, source, freq] = await Promise.all([
    db
      .select({ id: s.nodePrereqs.prereqId })
      .from(s.nodePrereqs)
      .where(eq(s.nodePrereqs.nodeId, id)),
    db
      .select({ id: s.syllabusNodes.id, title: s.syllabusNodes.title })
      .from(s.syllabusNodes)
      .where(eq(s.syllabusNodes.parentId, id))
      .orderBy(asc(s.syllabusNodes.ord)),
    nodeSource(db, id),
    nodeFrequencies(db),
  ]);
  return {
    node,
    prereqs: prereqs.map((p) => p.id),
    children,
    source,
    frequency: freq.get(id) ?? { prelims: 0, mains: 0, years: [] },
  };
}
