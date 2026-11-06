import { type Db, schema } from '@koach/db';
import { and, count, eq, inArray, sql } from 'drizzle-orm';

// Human review of AI suggestions (KB-07). A reviewer approves or corrects PYQ tags and node source
// mappings; every decision is logged in kb_reviews, and loadKb never overwrites reviewed rows.

const s = schema;
export type ReviewTarget = 'pyq' | 'source';

export interface PyqReviewItem {
  type: 'pyq';
  id: string;
  exam: string;
  year: number;
  text: string;
  options: { key: string; text: string }[] | null;
  answer: string | null;
  questionType: string | null;
  sourceType: string | null;
  directive: string | null;
  nodes: { id: string; title: string; primary: boolean }[];
}

export interface SourceReviewItem {
  type: 'source';
  id: string; // node id
  nodeTitle: string;
  sourceId: string;
  sourceLabel: string;
  chapter: string;
  reason: string;
}

/** A random sample of items still at "suggested". */
export async function reviewSample(
  db: Db,
  type: ReviewTarget,
  n: number,
): Promise<(PyqReviewItem | SourceReviewItem)[]> {
  if (type === 'pyq') {
    const rows = await db
      .select()
      .from(s.pyqs)
      .where(
        and(
          eq(s.pyqs.tagStatus, 'suggested'),
          sql`exists (select 1 from ${s.pyqTags} where ${s.pyqTags.pyqId} = ${s.pyqs.id})`,
        ),
      )
      .orderBy(sql`random()`)
      .limit(n);
    if (!rows.length) return [];
    const tags = await db
      .select({
        pyqId: s.pyqTags.pyqId,
        id: s.syllabusNodes.id,
        title: s.syllabusNodes.title,
        primary: s.pyqTags.primary,
      })
      .from(s.pyqTags)
      .innerJoin(s.syllabusNodes, eq(s.syllabusNodes.id, s.pyqTags.nodeId))
      .where(
        inArray(
          s.pyqTags.pyqId,
          rows.map((r) => r.id),
        ),
      );
    return rows.map((r) => ({
      type: 'pyq' as const,
      id: r.id,
      exam: r.exam,
      year: r.year,
      text: r.text,
      options: r.options,
      answer: r.answer,
      questionType: r.questionType,
      sourceType: r.sourceType,
      directive: r.directive,
      nodes: tags
        .filter((t) => t.pyqId === r.id)
        .map((t) => ({ id: t.id, title: t.title, primary: t.primary })),
    }));
  }
  const rows = await db
    .select()
    .from(s.nodeSources)
    .innerJoin(s.syllabusNodes, eq(s.syllabusNodes.id, s.nodeSources.nodeId))
    .innerJoin(s.sources, eq(s.sources.id, s.nodeSources.sourceId))
    .where(eq(s.nodeSources.status, 'suggested'))
    .orderBy(sql`random()`)
    .limit(n);
  return rows.map((r) => ({
    type: 'source' as const,
    id: r.node_sources.nodeId,
    nodeTitle: r.syllabus_nodes.title,
    sourceId: r.sources.id,
    sourceLabel: sourceLabel(r.sources),
    chapter: r.node_sources.chapter,
    reason: r.node_sources.reason,
  }));
}

export function sourceLabel(src: {
  title: string;
  author: string | null;
  neutralLabel: string | null;
}) {
  return src.neutralLabel ?? (src.author ? `${src.title} · ${src.author}` : src.title);
}

export class ReviewError extends Error {}

export interface PyqCorrection {
  nodes: { id: string; primary: boolean }[];
  questionType: string;
  sourceType: string;
  directive?: string | null;
}

export async function reviewPyq(
  db: Db,
  reviewer: string,
  pyqId: string,
  decision: { action: 'approve' } | ({ action: 'correct' } & PyqCorrection),
): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(s.pyqs).where(eq(s.pyqs.id, pyqId));
    if (!row) throw new ReviewError('not_found');
    const before = {
      questionType: row.questionType,
      sourceType: row.sourceType,
      directive: row.directive,
      nodes: await tx
        .select({ id: s.pyqTags.nodeId, primary: s.pyqTags.primary })
        .from(s.pyqTags)
        .where(eq(s.pyqTags.pyqId, pyqId)),
    };
    if (decision.action === 'approve') {
      await tx.update(s.pyqs).set({ tagStatus: 'approved' }).where(eq(s.pyqs.id, pyqId));
    } else {
      const ids = decision.nodes.map((n) => n.id);
      const known = await tx
        .select({ id: s.syllabusNodes.id })
        .from(s.syllabusNodes)
        .where(inArray(s.syllabusNodes.id, ids));
      if (!ids.length || known.length !== new Set(ids).size) throw new ReviewError('unknown_node');
      await tx
        .update(s.pyqs)
        .set({
          tagStatus: 'corrected',
          questionType: decision.questionType,
          sourceType: decision.sourceType,
          directive: decision.directive ?? null,
        })
        .where(eq(s.pyqs.id, pyqId));
      await tx.delete(s.pyqTags).where(eq(s.pyqTags.pyqId, pyqId));
      await tx
        .insert(s.pyqTags)
        .values(decision.nodes.map((n) => ({ pyqId, nodeId: n.id, primary: n.primary })));
    }
    await tx.insert(s.kbReviews).values({
      targetType: 'pyq',
      targetId: pyqId,
      action: decision.action,
      before,
      after: decision.action === 'correct' ? decision : null,
      reviewer,
    });
  });
}

export async function reviewSource(
  db: Db,
  reviewer: string,
  nodeId: string,
  decision:
    | { action: 'approve' }
    | { action: 'correct'; sourceId: string; chapter: string; reason: string },
): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(s.nodeSources).where(eq(s.nodeSources.nodeId, nodeId));
    if (!row) throw new ReviewError('not_found');
    if (decision.action === 'approve') {
      await tx
        .update(s.nodeSources)
        .set({ status: 'approved' })
        .where(eq(s.nodeSources.nodeId, nodeId));
    } else {
      const [src] = await tx.select().from(s.sources).where(eq(s.sources.id, decision.sourceId));
      if (!src) throw new ReviewError('unknown_source');
      await tx
        .update(s.nodeSources)
        .set({
          status: 'corrected',
          sourceId: decision.sourceId,
          chapter: decision.chapter,
          reason: decision.reason,
        })
        .where(eq(s.nodeSources.nodeId, nodeId));
    }
    await tx.insert(s.kbReviews).values({
      targetType: 'node_source',
      targetId: nodeId,
      action: decision.action,
      before: { sourceId: row.sourceId, chapter: row.chapter, reason: row.reason },
      after: decision.action === 'correct' ? decision : null,
      reviewer,
    });
  });
}

export interface ReviewSummary {
  pyq: { suggested: number; approved: number; corrected: number; accuracy: number | null };
  source: { suggested: number; approved: number; corrected: number; accuracy: number | null };
}

/** Audit accuracy = approved / (approved + corrected) over everything a human has reviewed. */
export async function reviewSummary(db: Db): Promise<ReviewSummary> {
  const [pyqRows, srcRows] = await Promise.all([
    db
      .select({ status: s.pyqs.tagStatus, n: count() })
      .from(s.pyqs)
      .where(sql`exists (select 1 from ${s.pyqTags} where ${s.pyqTags.pyqId} = ${s.pyqs.id})`)
      .groupBy(s.pyqs.tagStatus),
    db
      .select({ status: s.nodeSources.status, n: count() })
      .from(s.nodeSources)
      .groupBy(s.nodeSources.status),
  ]);
  const shape = (rows: { status: string; n: number }[]) => {
    const get = (k: string) => rows.find((r) => r.status === k)?.n ?? 0;
    const approved = get('approved');
    const corrected = get('corrected');
    return {
      suggested: get('suggested'),
      approved,
      corrected,
      accuracy: approved + corrected ? approved / (approved + corrected) : null,
    };
  };
  return { pyq: shape(pyqRows), source: shape(srcRows) };
}

export async function sourceCatalogue(db: Db) {
  const rows = await db.select().from(s.sources).orderBy(s.sources.kind, s.sources.id);
  return rows.map((r) => ({ id: r.id, kind: r.kind, label: sourceLabel(r) }));
}
