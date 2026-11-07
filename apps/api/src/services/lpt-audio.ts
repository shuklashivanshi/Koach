import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

// Pre-generated Learning Pattern Test "Listen & Recall" clips. The 10 lists are fixed, so they are
// synthesised once by apps/api/scripts/gen-lpt-audio.ts and served from disk. The clips are only
// ever reachable through the authenticated /v1/lpt/audio route (no static file serving), so the
// list words stay audio-only for the client.

export const LPT_MANIFEST_FILE = 'manifest.json';

/** The exact text spoken for a list. The route fallback and the generator both use this. */
export const listText = (list: readonly string[]): string => list.join(', ');

/** Clip file name; matches the mobile cache name lpt-{form}-{i}.mp3. */
export const clipFile = (form: 'A' | 'B', list: number): string => `lpt-${form}-${list}.mp3`;

/** manifest.json: which text each clip file was synthesised from, and with which voice. */
export const LptAudioManifest = z.object({
  voice: z.string(),
  clips: z.record(z.string(), z.string()),
});
export type LptAudioManifest = z.infer<typeof LptAudioManifest>;

/** Looks up a pre-generated clip; base64 mp3, or null when absent or stale. */
export type LptClips = (clip: { file: string; text: string }) => Promise<string | null>;

const CLIP_NAME = /^lpt-[AB]-\d\.mp3$/;

/**
 * Clips read from `dir`. A clip is served only when the manifest records it was made from the
 * current list text; any fs/parse problem yields null (never throws) so the route falls back to
 * live TTS. Only hits are cached, so clips generated while the server runs are picked up.
 */
export function fileLptClips(dir: string): LptClips {
  const cache = new Map<string, string>();
  return async ({ file, text }) => {
    // Defence in depth against path traversal; the route already validates its params.
    if (!CLIP_NAME.test(file)) return null;
    const key = `${file}\n${text}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    try {
      const manifest = LptAudioManifest.parse(
        JSON.parse(await readFile(join(dir, LPT_MANIFEST_FILE), 'utf8')),
      );
      if (manifest.clips[file] !== text) return null;
      const bytes = await readFile(join(dir, file));
      if (bytes.length === 0) return null;
      const base64 = bytes.toString('base64');
      cache.set(key, base64);
      return base64;
    } catch {
      return null;
    }
  };
}
