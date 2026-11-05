export interface EvalCase<I, O> {
  name: string;
  input: I;
  check(output: O): { pass: boolean; note?: string };
}

export interface Eval<I, O> {
  name: string;
  /** Minimum pass rate (0–1) for the suite to succeed. */
  threshold: number;
  cases: EvalCase<I, O>[];
  /** Mock mode returns recorded fixtures; live mode (EVAL_LIVE=1) calls Vertex. */
  run(input: I, live: boolean): Promise<O>;
}
