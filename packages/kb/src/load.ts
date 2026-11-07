import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Db, schema } from '@koach/db';
import { findHits } from '@koach/guard';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { joinOptionalStats, type OptionalStatYear } from './optionals';
import {
  ClaimsFile,
  type NodeSeed,
  PyqFile,
  pyqId,
  SourceMapFile,
  SourcesFile,
  SyllabusFile,
  TagFile,
} from './seed';

export interface KbBundle {
  syllabus: SyllabusFile[];
  pyqs: PyqFile[];
  tags: z.infer<typeof TagFile>['tags'];
  sources: z.infer<typeof SourcesFile>['sources'];
  sourceMap: z.infer<typeof SourceMapFile>['map'];
  claims: z.infer<typeof ClaimsFile>['claims'];
  optionals: {
    slug: string;
    profile: Record<string, unknown>;
    stats: { examYear: number; appeared: number; recommended: number; source: string }[];
  }[];
}

async function readJsonDir<T>(dir: string, parse: (v: unknown) => T): Promise<T[]> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return Promise.all(
    files.map(async (f) => {
      try {
        return parse(JSON.parse(await readFile(join(dir, f), 'utf8')));
      } catch (err) {
        throw new Error(`${join(dir, f)}: ${(err as Error).message}`, { cause: err });
      }
    }),
  );
}

/** Reads every seed file under `dir` (packages/kb/data layout) and validates its shape. */
export async function readKb(dir: string): Promise<KbBundle> {
  const [syllabus, pyqs, tagFiles, sourceFiles, mapFiles, claimFiles] = await Promise.all([
    readJsonDir(join(dir, 'syllabus'), (v) => SyllabusFile.parse(v)),
    readJsonDir(join(dir, 'pyq'), (v) => PyqFile.parse(v)),
    readJsonDir(join(dir, 'tags'), (v) => TagFile.parse(v)),
    readJsonDir(join(dir, 'sources'), (v) => SourcesFile.parse(v)),
    readJsonDir(join(dir, 'sources', 'map'), (v) => SourceMapFile.parse(v)),
    readJsonDir(join(dir, 'strategy'), (v) => ClaimsFile.parse(v)),
  ]);
  // Optional Discovery data (profiles + official stats), joined by slug.
  const readOpt = async <T>(name: string): Promise<T | null> => {
    try {
      return JSON.parse(await readFile(join(dir, 'optionals', name), 'utf8')) as T;
    } catch {
      return null;
    }
  };
  const profiles =
    (await readOpt<{ profiles: Record<string, Record<string, unknown>> }>('profiles.json'))
      ?.profiles ?? {};
  const statYears = (await readOpt<{ years: OptionalStatYear[] }>('stats.json'))?.years ?? [];
  // Canonical-slug join: the syllabus generator truncates some profile slugs, so exact equality
  // would silently drop their official rows. Unresolved slugs are surfaced by the data test.
  const { optionals } = joinOptionalStats(profiles, statYears);
  return {
    optionals,
    syllabus,
    pyqs,
    tags: tagFiles.flatMap((f) => f.tags),
    sources: sourceFiles.flatMap((f) => f.sources),
    sourceMap: mapFiles.flatMap((f) => f.map),
    claims: claimFiles.flatMap((f) => f.claims),
  };
}

/** Cross-file checks: references resolve, the prerequisite graph is acyclic, no blocked names. */
export function validateKb(kb: KbBundle): string[] {
  const errors: string[] = [];
  const nodes = new Map<string, NodeSeed>();
  for (const file of kb.syllabus) {
    for (const n of file.nodes) {
      if (nodes.has(n.id)) errors.push(`duplicate node ${n.id}`);
      nodes.set(n.id, n);
    }
  }
  for (const n of nodes.values()) {
    if (n.parentId && !nodes.has(n.parentId)) errors.push(`${n.id}: unknown parent ${n.parentId}`);
    for (const p of n.prereqs) if (!nodes.has(p)) errors.push(`${n.id}: unknown prereq ${p}`);
  }
  // Prerequisite cycles (DFS with colours).
  const colour = new Map<string, 1 | 2>();
  const visit = (id: string, path: string[]): void => {
    if (colour.get(id) === 2) return;
    if (colour.get(id) === 1) {
      errors.push(`prereq cycle: ${[...path, id].join(' -> ')}`);
      return;
    }
    colour.set(id, 1);
    for (const p of nodes.get(id)?.prereqs ?? []) if (nodes.has(p)) visit(p, [...path, id]);
    colour.set(id, 2);
  };
  for (const id of nodes.keys()) visit(id, []);

  const pyqIds = new Set(
    kb.pyqs.flatMap((f) => f.questions.map((q) => pyqId(f.exam, f.year, f.paper, q.number))),
  );
  for (const t of kb.tags) {
    if (!pyqIds.has(t.pyqId)) errors.push(`tag for unknown pyq ${t.pyqId}`);
    for (const n of t.nodes) if (!nodes.has(n.id)) errors.push(`${t.pyqId}: unknown node ${n.id}`);
  }
  const sourceIds = new Set(kb.sources.map((s) => s.id));
  for (const m of kb.sourceMap) {
    if (!nodes.has(m.nodeId)) errors.push(`source map: unknown node ${m.nodeId}`);
    if (!sourceIds.has(m.sourceId)) errors.push(`source map: unknown source ${m.sourceId}`);
  }
  // Client-facing text must pass the naming guard (sources show their neutral label if set).
  const facing = {
    nodes: [...nodes.values()].map((n) => n.title),
    reasons: kb.sourceMap.map((m) => m.reason),
    sources: kb.sources.map((s) =>
      s.neutralLabel ? s.neutralLabel : `${s.title} ${s.author ?? ''}`,
    ),
    claims: kb.claims.map((c) => [c.claim, c.officialSource ?? '']),
    optionals: kb.optionals.map((o) => [o.profile.name, o.profile.summary, o.profile.books]),
  };
  for (const hit of findHits(facing))
    errors.push(`blocked name at ${hit.path}: ${hit.names.join(', ')}`);
  return errors;
}

const CHUNK = 500;
async function inChunks<T>(rows: T[], fn: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) await fn(rows.slice(i, i + CHUNK));
}

export interface LoadResult {
  nodes: number;
  pyqs: number;
  tags: number;
  sources: number;
  nodeSources: number;
  claims: number;
  optionals: number;
}

/**
 * Idempotently upserts the seed into the database. Rows a reviewer approved or corrected are
 * never overwritten (their tags, metadata and source mappings stay as reviewed).
 */
export async function loadKb(db: Db, kb: KbBundle): Promise<LoadResult> {
  const errors = validateKb(kb);
  if (errors.length) {
    throw new Error(`KB seed invalid (${errors.length}):\n${errors.slice(0, 20).join('\n')}`);
  }
  const s = schema;
  const nodes = kb.syllabus.flatMap((f) =>
    f.nodes.map((n, i) => ({ ...n, paper: f.paper, ord: i })),
  );

  await db.transaction(async (tx) => {
    // parent_id has no FK, so node order does not matter.
    await inChunks(nodes, (chunk) =>
      tx
        .insert(s.syllabusNodes)
        .values(
          chunk.map((n) => ({
            id: n.id,
            paper: n.paper,
            parentId: n.parentId,
            title: n.title,
            kind: n.kind,
            estMinutes: n.estMinutes ?? null,
            prelims: n.prelims,
            mains: n.mains,
            ord: n.ord,
          })),
        )
        .onConflictDoUpdate({
          target: s.syllabusNodes.id,
          set: {
            paper: sql`excluded.paper`,
            parentId: sql`excluded.parent_id`,
            title: sql`excluded.title`,
            kind: sql`excluded.kind`,
            estMinutes: sql`excluded.est_minutes`,
            prelims: sql`excluded.prelims`,
            mains: sql`excluded.mains`,
            ord: sql`excluded.ord`,
          },
        }),
    );
    const prereqs = nodes.flatMap((n) => n.prereqs.map((p) => ({ nodeId: n.id, prereqId: p })));
    await tx.delete(s.nodePrereqs);
    await inChunks(prereqs, (chunk) => tx.insert(s.nodePrereqs).values(chunk));

    const pyqRows = kb.pyqs.flatMap((f) =>
      f.questions.map((q) => ({
        id: pyqId(f.exam, f.year, f.paper, q.number),
        exam: f.exam,
        paper: f.paper,
        year: f.year,
        number: q.number,
        text: q.text,
        options: q.options ?? null,
        answer: q.answer ?? null,
        answerSource: q.answerSource ?? null,
        marks: q.marks ?? null,
        wordLimit: q.wordLimit ?? null,
      })),
    );
    await inChunks(pyqRows, (chunk) =>
      tx
        .insert(s.pyqs)
        .values(chunk)
        .onConflictDoUpdate({
          target: s.pyqs.id,
          set: {
            text: sql`excluded.text`,
            options: sql`excluded.options`,
            answer: sql`excluded.answer`,
            answerSource: sql`excluded.answer_source`,
            marks: sql`excluded.marks`,
            wordLimit: sql`excluded.word_limit`,
          },
        }),
    );

    // Tags: only for questions still at 'suggested'.
    const reviewed = new Set(
      (
        await tx.select({ id: s.pyqs.id }).from(s.pyqs).where(ne(s.pyqs.tagStatus, 'suggested'))
      ).map((r) => r.id),
    );
    const tags = kb.tags.filter((t) => !reviewed.has(t.pyqId));
    for (const t of tags) {
      await tx
        .update(s.pyqs)
        .set({
          questionType: t.questionType,
          sourceType: t.sourceType,
          directive: t.directive ?? null,
        })
        .where(and(eq(s.pyqs.id, t.pyqId), eq(s.pyqs.tagStatus, 'suggested')));
    }
    const taggedIds = tags.map((t) => t.pyqId);
    await inChunks(taggedIds, (chunk) =>
      tx.delete(s.pyqTags).where(inArray(s.pyqTags.pyqId, chunk)),
    );
    const tagRows = tags.flatMap((t) =>
      t.nodes.map((n) => ({ pyqId: t.pyqId, nodeId: n.id, primary: n.primary })),
    );
    await inChunks(tagRows, (chunk) => tx.insert(s.pyqTags).values(chunk).onConflictDoNothing());

    await inChunks(kb.sources, (chunk) =>
      tx
        .insert(s.sources)
        .values(
          chunk.map((src) => ({
            id: src.id,
            kind: src.kind,
            title: src.title,
            author: src.author ?? null,
            neutralLabel: src.neutralLabel ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: s.sources.id,
          set: {
            kind: sql`excluded.kind`,
            title: sql`excluded.title`,
            author: sql`excluded.author`,
            neutralLabel: sql`excluded.neutral_label`,
          },
        }),
    );
    await inChunks(kb.sourceMap, (chunk) =>
      tx
        .insert(s.nodeSources)
        .values(chunk)
        .onConflictDoUpdate({
          target: s.nodeSources.nodeId,
          set: {
            sourceId: sql`excluded.source_id`,
            chapter: sql`excluded.chapter`,
            reason: sql`excluded.reason`,
          },
          setWhere: eq(s.nodeSources.status, 'suggested'),
        }),
    );

    await inChunks(kb.optionals, (chunk) =>
      tx
        .insert(s.optionalInfo)
        .values(chunk)
        .onConflictDoUpdate({
          target: s.optionalInfo.slug,
          set: { profile: sql`excluded.profile`, stats: sql`excluded.stats` },
        }),
    );

    await inChunks(kb.claims, (chunk) =>
      tx
        .insert(s.strategyClaims)
        .values(
          chunk.map((c) => ({
            id: c.id,
            topic: c.topic,
            claim: c.claim,
            kind: c.kind,
            officialSource: c.officialSource ?? null,
            sourceUrl: c.sourceUrl,
            sourceDate: c.sourceDate ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: s.strategyClaims.id,
          set: {
            topic: sql`excluded.topic`,
            claim: sql`excluded.claim`,
            kind: sql`excluded.kind`,
            officialSource: sql`excluded.official_source`,
            sourceUrl: sql`excluded.source_url`,
            sourceDate: sql`excluded.source_date`,
          },
        }),
    );
  });

  return {
    nodes: nodes.length,
    pyqs: kb.pyqs.reduce((a, f) => a + f.questions.length, 0),
    tags: kb.tags.length,
    sources: kb.sources.length,
    nodeSources: kb.sourceMap.length,
    claims: kb.claims.length,
    optionals: kb.optionals.length,
  };
}
