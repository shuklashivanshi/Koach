import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { synthesize, tts, type TtsLike } from '@koach/ai';
import { forms } from '@koach/lpt';
import { z } from 'zod';

// Pre-generated Learning Pattern Test "Listen & Recall" clips. The recall lists are fixed, so they are
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

export interface PlannedClip {
  form: 'A' | 'B';
  list: number;
  file: string;
  text: string;
}

/** Every recall list of both forms, in order (the clip set is derived from the banks). */
export const plannedClips = (): PlannedClip[] =>
  (['A', 'B'] as const).flatMap((form) =>
    forms[form].lists.map((list, i) => ({
      form,
      list: i,
      file: clipFile(form, i),
      text: listText(list),
    })),
  );

const readManifest = async (dir: string): Promise<LptAudioManifest> => {
  try {
    return LptAudioManifest.parse(JSON.parse(await readFile(join(dir, LPT_MANIFEST_FILE), 'utf8')));
  } catch {
    return { voice: tts.voice, clips: {} };
  }
};

const hasBytes = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
};

/**
 * Synthesises the clips that are missing or stale into `outDir` with real Cloud TTS (or `client`).
 * Run through apps/api/scripts/gen-lpt-audio.ts. Sequential on purpose: Vertex/TTS quota has
 * returned 429s, and `synthesize` already retries. The manifest is rewritten after every clip so
 * progress survives a mid-run failure.
 */
export async function generateLptAudio(opts: {
  outDir: string;
  force?: boolean;
  client?: TtsLike;
  log?: (line: string) => void;
}): Promise<{ written: string[]; skipped: string[]; costUsd: number }> {
  await mkdir(opts.outDir, { recursive: true });
  const manifest = await readManifest(opts.outDir);
  const written: string[] = [];
  const skipped: string[] = [];
  let costUsd = 0;
  for (const clip of plannedClips()) {
    const path = join(opts.outDir, clip.file);
    const current =
      !opts.force &&
      manifest.voice === tts.voice &&
      manifest.clips[clip.file] === clip.text &&
      (await hasBytes(path));
    if (current) {
      skipped.push(clip.file);
      continue;
    }
    const speech = await synthesize(
      { feature: 'lpt.listen.pregen', text: clip.text },
      { client: opts.client },
    );
    const bytes = Buffer.from(speech.audioBase64, 'base64');
    if (bytes.length === 0) throw new Error(`TTS returned no audio for ${clip.file}`);
    await writeFile(path, bytes);
    manifest.voice = tts.voice;
    manifest.clips[clip.file] = clip.text;
    await writeFile(join(opts.outDir, LPT_MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
    costUsd += speech.costUsd;
    written.push(clip.file);
    opts.log?.(clip.file);
  }
  return { written, skipped, costUsd };
}
