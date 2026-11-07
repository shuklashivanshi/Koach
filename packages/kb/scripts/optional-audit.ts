// Read-only audit of the committed optional data, for subject-expert review (no AI, no GCP).
// Prints one line per optional and soft flags. Always exits 0: the output is for a reviewer, not a gate.
//
//   pnpm --filter @koach/kb exec tsx scripts/optional-audit.ts
import { type OptionalProfile, pooledSuccess, readKb } from '../src';

const DATA = new URL('../data', import.meta.url).pathname;
const OVERLAP_FLAG = 0.95;
const SMALL_SAMPLE = 100;

const kb = await readKb(DATA);
const pad = (s: string | number, n: number) => String(s).padEnd(n);

console.log(
  [
    pad('slug', 42),
    pad('hours', 6),
    pad('gs%', 5),
    pad('appeared', 9),
    pad('rate', 7),
    'band',
    'flags',
  ].join(' '),
);

const flagged: Record<'overlap' | 'small' | 'nodata', string[]> = {
  overlap: [],
  small: [],
  nodata: [],
};

for (const o of [...kb.optionals].sort((a, b) => a.slug.localeCompare(b.slug))) {
  const p = o.profile as unknown as OptionalProfile;
  const s = pooledSuccess(o.stats);
  const flags: string[] = [];
  if (p.gsOverlap >= OVERLAP_FLAG) {
    flags.push('GS-OVERLAP>=95%');
    flagged.overlap.push(o.slug);
  }
  if (o.stats.length === 0) {
    flags.push('NO-DATA');
    flagged.nodata.push(o.slug);
  } else if (s.appeared < SMALL_SAMPLE) {
    flags.push('SMALL-SAMPLE');
    flagged.small.push(o.slug);
  }
  const rate = s.rate === null ? '-' : `${(s.rate * 100).toFixed(1)}%`;
  const band =
    s.low === null || s.high === null
      ? '-'
      : `${(s.low * 100).toFixed(1)}-${(s.high * 100).toFixed(1)}%`;
  console.log(
    [
      pad(o.slug, 42),
      pad(p.hours, 6),
      pad(`${Math.round(p.gsOverlap * 100)}`, 5),
      pad(s.appeared, 9),
      pad(rate, 7),
      band,
      flags.join(','),
    ]
      .join(' ')
      .trimEnd(),
  );
}

console.log('');
console.log(`GS overlap >= 95% (${flagged.overlap.length}), expert should check the overlap rule:`);
console.log(`  ${flagged.overlap.join(', ') || 'none'}`);
console.log(`Small sample, pooled appeared < ${SMALL_SAMPLE} (${flagged.small.length}):`);
console.log(`  ${flagged.small.join(', ') || 'none'}`);
console.log(
  `No rows in any of the ${new Set(kb.optionals.flatMap((o) => o.stats.map((r) => r.examYear))).size} reports (${flagged.nodata.length}):`,
);
console.log(`  ${flagged.nodata.join(', ') || 'none'}`);
