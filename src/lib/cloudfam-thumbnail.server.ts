function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    const key = match[1];
    if (key) result[key.toLowerCase()] = (match[2] ?? match[3] ?? match[4] ?? "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  }
  return result;
}

export function extractCloudfamThumbnail(html: string): string | null {
  const tags = html.match(/<(?:meta|video)\b[^>]*>/gi) ?? [];
  const candidates: string[] = [];
  for (const tag of tags) {
    const attrs = attributes(tag);
    if (attrs["property"] === "og:image" || attrs["name"] === "twitter:image") candidates.push(attrs["content"] ?? "");
    if (attrs["poster"]) candidates.push(attrs["poster"]);
  }
  // Fallbacks: JSON fields in player scripts, then any Cloudfam-hosted image.
  for (const m of html.matchAll(/["'](?:thumbnail|thumb|poster|image|cover)(?:_?url)?["']\s*:\s*["']([^"']+)["']/gi)) if (m[1]) candidates.push(m[1].replace(/\\\//g, "/"));
  for (const m of html.matchAll(/https?:\/\/[a-z0-9.-]*cloudfam\.io\/[^"'\s)]+?\.(?:jpe?g|png|webp)/gi)) if (!/favicon|logo/i.test(m[0])) candidates.push(m[0]);
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate, "https://cloudfam.io");
      if (url.protocol === "https:" && (url.hostname === "cloudfam.io" || url.hostname.endsWith(".cloudfam.io")) && !/favicon|logo/i.test(url.pathname) && !url.username && !url.password && !url.port) return url.href;
    } catch { /* Ignore invalid provider metadata. */ }
  }
  return null;
}

import { formatDuration, probeMp4 } from "./mp4-metadata";

function isCloudfamUrl(u: URL) {
  return u.protocol === "https:" && (u.hostname === "cloudfam.io" || u.hostname.endsWith(".cloudfam.io")) && !u.username && !u.password && !u.port;
}

/** Lists provider files, preferring the original, without trusting labels as resolution. */
export function extractCloudfamVideoSources(html: string): string[] {
  const sources = new Map<string, number>();
  for (const tag of html.match(/<source\b[^>]*>/gi) ?? []) {
    const a = attributes(tag);
    if (!a["src"]) continue;
    try {
      const u = new URL(a["src"], "https://cloudfam.io");
      if (!isCloudfamUrl(u)) continue;
      const label = `${a["size"] ?? ""} ${a["res"] ?? ""} ${a["label"] ?? ""} ${a["data-quality"] ?? ""} ${a["title"] ?? ""}`;
      const rank = /\b(original|source)\b/i.test(label) ? 1e9 : /4k/i.test(label) ? 2160 : /2k/i.test(label) ? 1440 : parseInt(label.match(/(\d{3,4})/)?.[1] ?? "0", 10);
      sources.set(u.href, Math.max(sources.get(u.href) ?? 0, rank));
    } catch { /* skip */ }
  }
  return [...sources.entries()].sort((a, b) => b[1] - a[1]).map(([href]) => href);
}

export function extractCloudfamVideoSource(html: string): string | null {
  return extractCloudfamVideoSources(html)[0] ?? null;
}

async function fetchEmbedHtml(embedId: string): Promise<string | null> {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(embedId)) return null;
  try {
    const response = await fetch(`https://cloudfam.io/embed/${embedId}`, {
      redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { Accept: "text/html" },
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return null;
    const reader = response.body?.getReader();
    if (!reader) return null;
    const decoder = new TextDecoder();
    let html = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        // Read until the player closes so every <source> (all qualities) is seen.
        if (/<\/video>/i.test(html) || html.length > 3_000_000) break;
      }
      return html + decoder.decode();
    } finally { await reader.cancel().catch(() => {}); }
  } catch { return null; }
}

export interface CloudfamDetails { thumbnail: string | null; duration: string | null; height: number | null }

export async function fetchCloudfamDetails(embedId: string): Promise<CloudfamDetails> {
  const html = await fetchEmbedHtml(embedId);
  if (!html) return { thumbnail: null, duration: null, height: null };
  const thumbnail = extractCloudfamThumbnail(html);
  const sources = extractCloudfamVideoSources(html);
  let duration: string | null = null, height: number | null = null;
  for (const src of sources) {
    try {
      const info = await probeMp4(async (start, end) => {
        const r = await fetch(src, { headers: { Range: `bytes=${start}-${end}` }, redirect: "manual", signal: AbortSignal.timeout(15_000) });
        if (r.status !== 206 && r.status !== 200) return null;
        if (r.status === 200) { await r.body?.cancel(); return null; }
        const range = r.headers.get("content-range")?.match(/^bytes (\d+)-(\d+)\//);
        if (range && Number(range[1]) !== start) { await r.body?.cancel(); return null; }
        const buffer = await r.arrayBuffer();
        return buffer.byteLength === end - start + 1 ? buffer : null;
      });
      duration ??= formatDuration(info?.durationSeconds);
      const measured = info?.width && info.height ? Math.min(info.width, info.height) : null;
      if (measured) height = Math.max(height ?? 0, measured);
    } catch { /* metadata stays unknown */ }
  }
  return { thumbnail, duration, height };
}

export async function fetchCloudfamThumbnail(embedId: string): Promise<string | null> {
  const html = await fetchEmbedHtml(embedId);
  return html ? extractCloudfamThumbnail(html) : null;
}
