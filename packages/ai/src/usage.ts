/** One AI or speech call, logged and persisted for cost tracking (D-19). */
export interface AiUsage {
  feature: string;
  uid: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  chars: number;
  costUsd: number;
  latencyMs: number;
}

export type OnCall = (usage: AiUsage) => Promise<void> | void;

export function logUsage(usage: AiUsage): void {
  // Structured line for Cloud Logging; never includes prompt or output text.
  console.log(JSON.stringify({ severity: 'INFO', message: 'ai_call', ...usage }));
}
