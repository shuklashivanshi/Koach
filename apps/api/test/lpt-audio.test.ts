import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tts, type TtsLike } from '@koach/ai';
import { forms } from '@koach/lpt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  fileLptClips,
  generateLptAudio,
  listText,
  LptAudioManifest,
  plannedClips,
} from '../src/services/lpt-audio';

/** Fake Cloud TTS: audio bytes are 'AUDIO:' + the input text; records every request. */
const fakeTts = (): TtsLike & { texts: string[] } => {
  const texts: string[] = [];
  return {
    texts,
    synthesizeSpeech: (req) => {
      texts.push(req.input.text);
      return Promise.resolve([{ audioContent: Buffer.from(`AUDIO:${req.input.text}`) }]);
    },
  };
};

const readManifest = async (dir: string) =>
  LptAudioManifest.parse(JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')));

// Derived from the banks, not hardcoded: each form currently has 3 recall lists.
const expectedFiles = (['A', 'B'] as const).flatMap((form) =>
  forms[form].lists.map((_, i) => `lpt-${form}-${i}.mp3`),
);

describe('plannedClips', () => {
  it('lists every recall list of both forms in order, with the exact spoken text', () => {
    const planned = plannedClips();
    expect(planned.map((c) => c.file)).toEqual(expectedFiles);
    expect(planned.length).toBe(forms.A.lists.length + forms.B.lists.length);
    for (const c of planned) expect(c.text).toBe(listText(forms[c.form].lists[c.list]!));
    expect(planned[0]?.file).toBe('lpt-A-0.mp3');
  });
});

describe('generateLptAudio', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lpt-gen-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('writes every clip and a manifest from the planned texts', async () => {
    const client = fakeTts();
    const res = await generateLptAudio({ outDir: dir, client });
    const planned = plannedClips();
    expect(res.written).toEqual(expectedFiles);
    expect(res.skipped).toEqual([]);
    expect(client.texts).toEqual(planned.map((c) => c.text));
    for (const c of planned) {
      expect((await readFile(join(dir, c.file))).toString()).toBe(`AUDIO:${c.text}`);
    }
    const manifest = await readManifest(dir);
    expect(manifest.voice).toBe(tts.voice);
    expect(manifest.clips).toEqual(Object.fromEntries(planned.map((c) => [c.file, c.text])));
  });

  it('skips current clips on a second run without any TTS call', async () => {
    await generateLptAudio({ outDir: dir, client: fakeTts() });
    const client = fakeTts();
    const res = await generateLptAudio({ outDir: dir, client });
    expect(res.written).toEqual([]);
    expect(res.skipped).toEqual(expectedFiles);
    expect(client.texts).toEqual([]);
  });

  it('regenerates only the clip whose manifest text is stale', async () => {
    await generateLptAudio({ outDir: dir, client: fakeTts() });
    const manifest = await readManifest(dir);
    manifest.clips['lpt-B-2.mp3'] = 'old words';
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest));
    const res = await generateLptAudio({ outDir: dir, client: fakeTts() });
    expect(res.written).toEqual(['lpt-B-2.mp3']);
  });

  it('regenerates a clip whose file is empty', async () => {
    await generateLptAudio({ outDir: dir, client: fakeTts() });
    await writeFile(join(dir, 'lpt-A-1.mp3'), '');
    const res = await generateLptAudio({ outDir: dir, client: fakeTts() });
    expect(res.written).toEqual(['lpt-A-1.mp3']);
  });

  it('regenerates everything with force', async () => {
    await generateLptAudio({ outDir: dir, client: fakeTts() });
    const res = await generateLptAudio({ outDir: dir, client: fakeTts(), force: true });
    expect(res.written).toEqual(expectedFiles);
  });

  it('never writes an empty clip', async () => {
    const empty: TtsLike = { synthesizeSpeech: () => Promise.resolve([{ audioContent: '' }]) };
    await expect(generateLptAudio({ outDir: dir, client: empty })).rejects.toThrow(/lpt-A-0\.mp3/);
    await expect(stat(join(dir, 'lpt-A-0.mp3'))).rejects.toThrow();
  });
});

describe('fileLptClips round trip', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lpt-clips-'));
    await generateLptAudio({ outDir: dir, client: fakeTts() });
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  const text = listText(forms.A.lists[2]!);

  it('serves the written bytes as base64 when the text matches', async () => {
    const clip = await fileLptClips(dir)({ file: 'lpt-A-2.mp3', text });
    expect(clip).toBe(Buffer.from(`AUDIO:${text}`).toString('base64'));
  });

  it('returns null for the wrong text, an unknown or malformed name, or an empty file', async () => {
    const clips = fileLptClips(dir);
    expect(await clips({ file: 'lpt-A-2.mp3', text: 'something else' })).toBeNull();
    expect(await clips({ file: 'lpt-B-9.mp3', text })).toBeNull();
    expect(await clips({ file: '../manifest.json', text })).toBeNull();
    await writeFile(join(dir, 'lpt-A-2.mp3'), '');
    expect(await fileLptClips(dir)({ file: 'lpt-A-2.mp3', text })).toBeNull();
  });

  it('returns null when the directory has no manifest', async () => {
    expect(await fileLptClips(join(dir, 'missing'))({ file: 'lpt-A-2.mp3', text })).toBeNull();
  });
});
