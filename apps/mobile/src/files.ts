import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes JSON to the cache dir and opens the share sheet. */
export async function shareJson(name: string, data: unknown): Promise<void> {
  const file = new File(Paths.cache, name);
  await file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Your Koach data',
  });
}

/** Writes base64 audio to the cache dir and returns its URI for playback. */
export async function cacheAudio(name: string, base64: string): Promise<string> {
  const file = new File(Paths.cache, name);
  await file.write(base64, { encoding: 'base64' });
  return file.uri;
}
