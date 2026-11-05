// Placeholder list for the naming rule (PROJECT.md Cross-Cutting Rule 2). Phase 2 (KB-08) turns
// this into the full blocked-names filter applied to all client-facing text.
export const blockedNames = ['coaching', 'academy', 'unacademy', 'byju', 'vision ias', 'drishti'];

export function containsBlockedName(text: string): boolean {
  const t = text.toLowerCase();
  return blockedNames.some((n) => t.includes(n));
}
