/**
 * AI Publisher — INTEGRATION POINT.
 * Not connected. Implement `analyzeVideo` against your server (e.g. POST /api/ai/metadata),
 * which calls the AI model with the thumbnail and returns metadata. Never call AI providers
 * with secret keys from the browser.
 */
export interface AiMetadata {
  titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string; category: string; tags: string[];
}
export class AiNotConnectedError extends Error {
  constructor() { super("AI engine is not connected yet."); }
}
export async function analyzeVideo(_input: { embed: string; thumbnail: string }): Promise<AiMetadata> {
  // TODO(replit): const r = await fetch("/api/ai/metadata", { method: "POST", body: JSON.stringify(_input) }); return r.json();
  throw new AiNotConnectedError();
}
