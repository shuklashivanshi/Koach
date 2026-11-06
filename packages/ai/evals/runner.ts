// Runs every eval suite. Mock mode by default (CI); EVAL_LIVE=1 calls Vertex.
import { caVerifierEval } from './ca-verifier.eval';
import { pingEval } from './ping.eval';
import type { Eval } from './types';

const suites: Eval<never, never>[] = [
  pingEval as unknown as Eval<never, never>,
  caVerifierEval as unknown as Eval<never, never>,
];
const live = process.env.EVAL_LIVE === '1';

let failed = false;
console.log(`evals (${live ? 'live' : 'mock'})\n`);
for (const suite of suites) {
  let passed = 0;
  for (const c of suite.cases) {
    const out = await suite.run(c.input, live);
    const { pass, note } = c.check(out);
    if (pass) passed++;
    console.log(`  ${pass ? '✓' : '✗'} ${c.name}${note ? ` (${note})` : ''}`);
  }
  const rate = passed / suite.cases.length;
  const ok = rate >= suite.threshold;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${suite.name}: ${passed}/${suite.cases.length} (threshold ${suite.threshold})\n`,
  );
}
process.exit(failed ? 1 : 0);
