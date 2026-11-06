import { pricing, sttPricePerMinute, ttsPricePerMChars } from './models.config';

export function textCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = pricing[model];
  if (!p) return 0;
  return round6((inputTokens * p.inputPerM + outputTokens * p.outputPerM) / 1_000_000);
}

export function ttsCostUsd(chars: number): number {
  return round6((chars * ttsPricePerMChars.usd) / 1_000_000);
}

export function sttCostUsd(seconds: number): number {
  return round6((Math.max(1, seconds) / 60) * sttPricePerMinute.usd);
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
