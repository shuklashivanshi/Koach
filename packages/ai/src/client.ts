import { GoogleGenAI } from '@google/genai';

/** The subset of the Gemini SDK Koach uses; tests substitute a fake. */
export interface GenAiLike {
  models: {
    generateContent(req: { model: string; contents: string }): Promise<{
      text?: string | undefined;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
    }>;
  };
}

const clients = new Map<string, GenAiLike>();

/** One Vertex client per location (D-17). */
export function vertexClient(location: string, project = process.env.GCP_PROJECT): GenAiLike {
  if (!project) throw new Error('GCP_PROJECT is not set');
  let c = clients.get(location);
  if (!c) {
    c = new GoogleGenAI({ vertexai: true, project, location });
    clients.set(location, c);
  }
  return c;
}
