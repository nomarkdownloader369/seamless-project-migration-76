/**
 * Video quality detection — INTEGRATION POINT (to be completed server-side in Replit).
 *
 * Rules:
 *  - Never infer resolution from an embed URL alone.
 *  - Only return a value verified by a provider API or real file metadata.
 *  - If nothing can be verified, return { quality: null, source: "unknown" }.
 */
import { VIDEO_QUALITIES, type QualitySource, type VideoQuality } from "./videos";

export interface QualityResult { quality: VideoQuality | null; source: QualitySource }

/** Map a verified pixel height (e.g. from provider metadata) to the nearest standard tier at or below it. */
export function qualityFromHeight(height: number | null | undefined): VideoQuality | null {
  if (!height || !Number.isFinite(height) || height < 480) return null;
  const tiers = VIDEO_QUALITIES.map((q) => [q, parseInt(q, 10)] as const);
  let best: VideoQuality | null = null;
  for (const [q, h] of tiers) if (height >= h) best = q;
  return best;
}

export async function detectVideoQuality(_input: { embedUrl: string }): Promise<QualityResult> {
  // TODO(replit): POST /api/videos/quality -> server queries the hosting provider's API
  // (or probes file metadata) and returns the verified max height.
  return { quality: null, source: "unknown" };
}
