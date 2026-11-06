// Web build: browser downloads and data URIs instead of the native cache dir + share sheet.

/** Downloads JSON as a file. */
export function shareJson(name: string, data: unknown): Promise<void> {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return Promise.resolve();
}

/** Returns a playable data URI for base64 MP3 audio. */
export function cacheAudio(_name: string, base64: string): Promise<string> {
  return Promise.resolve(`data:audio/mpeg;base64,${base64}`);
}
