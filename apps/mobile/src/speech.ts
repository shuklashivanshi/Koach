// Native build: spoken answers arrive with the phone build (expo-audio recording); typing works now.
export const canRecord = false;

export function startRecording(): Promise<{
  stop: () => Promise<{ base64: string; seconds: number }>;
}> {
  return Promise.reject(new Error('recording is not available in this build'));
}
