// Web build: record a short spoken answer with MediaRecorder (WebM/Opus) for transcription.
export const canRecord =
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof MediaRecorder !== 'undefined';

export async function startRecording(): Promise<{
  stop: () => Promise<{ base64: string; seconds: number }>;
}> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  const started = Date.now();
  recorder.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const buf = new Uint8Array(await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer());
          let bin = '';
          for (let i = 0; i < buf.length; i += 0x8000)
            bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          resolve({ base64: btoa(bin), seconds: Math.min(60, (Date.now() - started) / 1000) });
        };
        recorder.stop();
      }),
  };
}
