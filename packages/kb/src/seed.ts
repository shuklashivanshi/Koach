import { z } from 'zod';

// Shapes of the committed seed files under packages/kb/data. Every file is validated on load.

export const Papers = ['prelims_gs1', 'csat', 'gs1', 'gs2', 'gs3', 'gs4', 'essay'] as const;

const id = z.string().regex(/^[a-z0-9][a-z0-9_.:-]*$/, 'lowercase id');

export const NodeSeed = z.object({
  id,
  parentId: id.nullable(),
  title: z.string().min(2),
  kind: z.enum(['paper', 'section', 'topic', 'node']),
  estMinutes: z.number().int().min(15).max(180).optional(),
  prelims: z.boolean(),
  mains: z.boolean(),
  prereqs: z.array(id).default([]),
});
export type NodeSeed = z.infer<typeof NodeSeed>;

export const SyllabusFile = z.object({
  /** One of Papers, or optional:<slug> */
  paper: z.string(),
  title: z.string(),
  nodes: z.array(NodeSeed).min(1),
});
export type SyllabusFile = z.infer<typeof SyllabusFile>;

export const PyqSeed = z.object({
  number: z.number().int().positive(),
  text: z.string().min(5),
  options: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
  answer: z.string().optional(),
  /** official = UPSC key; model = two independent AI solves agreed (never shown as official). */
  answerSource: z.enum(['official', 'model']).optional(),
  marks: z.number().int().optional(),
  wordLimit: z.number().int().optional(),
});

export const PyqFile = z.object({
  exam: z.enum(['prelims', 'mains']),
  paper: z.enum(['gs1', 'gs2', 'gs3', 'gs4']),
  year: z.number().int().min(2011).max(2030),
  sourceUrl: z.string().url(),
  questions: z.array(PyqSeed).min(1),
});
export type PyqFile = z.infer<typeof PyqFile>;

export const pyqId = (exam: string, year: number, paper: string, n: number) =>
  `${exam === 'prelims' ? 'pre' : 'mains'}-${year}-${paper}-q${String(n).padStart(3, '0')}`;

export const QuestionTypes = [
  'statement',
  'how_many',
  'match',
  'assertion_reason',
  'direct',
  'descriptive',
] as const;
export const SourceTypes = ['static', 'partial', 'current_affairs'] as const;

export const TagSeed = z.object({
  pyqId: z.string(),
  nodes: z.array(z.object({ id, primary: z.boolean().default(false) })).min(1),
  questionType: z.enum(QuestionTypes),
  sourceType: z.enum(SourceTypes),
  directive: z.string().optional(),
});
export const TagFile = z.object({ tags: z.array(TagSeed) });

export const SourceSeed = z.object({
  id,
  kind: z.enum(['ncert', 'book', 'official']),
  title: z.string(),
  author: z.string().optional(),
  neutralLabel: z.string().optional(),
});
export const SourcesFile = z.object({ sources: z.array(SourceSeed) });

export const NodeSourceSeed = z.object({
  nodeId: id,
  sourceId: id,
  chapter: z.string().min(1),
  reason: z.string().min(5).max(200),
});
export const SourceMapFile = z.object({ map: z.array(NodeSourceSeed) });

export const ClaimSeed = z.object({
  id,
  topic: z.string(),
  claim: z.string().min(10).max(400),
  kind: z.enum(['topper', 'official']),
  officialSource: z.string().optional(),
  sourceUrl: z.string().url(),
  sourceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export const ClaimsFile = z.object({ claims: z.array(ClaimSeed) });
