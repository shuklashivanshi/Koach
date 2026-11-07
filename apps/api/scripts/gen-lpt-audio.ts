/**
 * Pre-generates the Learning Pattern Test "Listen & Recall" clips (one mp3 per recall list of
 * forms A and B) with real Cloud Text-to-Speech and writes them, plus manifest.json, to
 * apps/api/assets/lpt-audio/. The API serves them from there instead of calling TTS per request.
 *
 * Prerequisites: Application Default Credentials for an account allowed to call Cloud
 * Text-to-Speech on koach-dev-8cf0a5:
 *   gcloud auth application-default login
 *   gcloud auth application-default set-quota-project koach-dev-8cf0a5   # if ADC has no quota project
 *
 * Run:  pnpm --filter @koach/api gen:lpt-audio
 *       add --force to redo every clip, or --dry-run to only list what would be generated.
 *
 * Then commit apps/api/assets/lpt-audio/*.mp3 and manifest.json so the Docker image ships them.
 * The API falls back to live TTS for any missing or stale clip, so running this is never required
 * for correctness. Re-run it after changing the lists in packages/lpt/src/banks.ts or the voice in
 * packages/ai/src/models.config.ts (stale clips are regenerated automatically and never served).
 */
import { fileURLToPath } from 'node:url';
import { generateLptAudio, plannedClips } from '../src/services/lpt-audio';

const argv = process.argv.slice(2);

if (argv.includes('--dry-run')) {
  for (const clip of plannedClips()) console.log(`${clip.file}\t${clip.text}`);
} else {
  const outDir = fileURLToPath(new URL('../assets/lpt-audio/', import.meta.url));
  try {
    const res = await generateLptAudio({
      outDir,
      force: argv.includes('--force'),
      log: console.log,
    });
    console.log(
      `Done: ${res.written.length} written, ${res.skipped.length} skipped, ` +
        `est. cost US$${res.costUsd.toFixed(4)}`,
    );
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}
