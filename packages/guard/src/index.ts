import { blockedNames } from './names';

export { blockedNames };

/** Lowercase, strip accents and apostrophes, turn every other non-alphanumeric into a space. */
export function normalise(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const patterns = blockedNames.map((name) => ({
  name,
  re: new RegExp(`(^| )${normalise(name).replace(/ /g, ' ')}( |$)`),
}));

/** Blocked names found in the text (empty when clean). */
export function checkText(text: string): string[] {
  const t = normalise(text);
  if (!t) return [];
  return patterns.filter((p) => p.re.test(t)).map((p) => p.name);
}

export interface GuardHit {
  path: string;
  names: string[];
}

/** Walks any JSON-like value and reports every string field that contains a blocked name. */
export function findHits(value: unknown, path = '$'): GuardHit[] {
  if (typeof value === 'string') {
    const names = checkText(value);
    return names.length ? [{ path, names }] : [];
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => findHits(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => findHits(v, `${path}.${k}`));
  }
  return [];
}

const REDACTED = '[source]';

/** Copy of the value with blocked names replaced, for prod (where failing would hurt the user). */
export function scrub<T>(value: T): T {
  if (typeof value === 'string') {
    let out: string = value;
    for (const name of checkText(value)) {
      const words = name.split(' ').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      out = out.replace(new RegExp(`\\b${words.join(`[^a-z0-9]+`)}\\b`, 'gi'), REDACTED);
    }
    return out as T;
  }
  if (Array.isArray(value)) return value.map((v: unknown) => scrub(v)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v)])) as T;
  }
  return value;
}
