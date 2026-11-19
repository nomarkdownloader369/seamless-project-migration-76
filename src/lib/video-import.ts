import { Parser } from "htmlparser2";

export interface ImportedEmbed { embed: string; thumbnail: string }
export interface ImportIssue { entry: string; reason: string }
export interface BulkImportResult { entries: ImportedEmbed[]; errors: ImportIssue[] }

export function cloudfamEmbedId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || !["cloudfam.io", "www.cloudfam.io"].includes(url.hostname) || url.port || url.username || url.password) return null;
    return url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{1,80})\/?$/)?.[1] ?? null;
  } catch { return null; }
}

function fromUrl(src: string): ImportedEmbed | null {
  try {
    const url = new URL(src.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || src.length > 500) return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.startsWith("[")) return null;
    url.hash = "";
    const cloudfamId = cloudfamEmbedId(url.href);
    if (cloudfamId) return { embed: `https://cloudfam.io/embed/${cloudfamId}`, thumbnail: "" };
    let yt: string | null = null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      yt = url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)\/?$/)?.[1] ?? (url.pathname === "/watch" ? url.searchParams.get("v") : null);
    } else if (host === "youtu.be") yt = url.pathname.slice(1);
    if (yt && /^[\w-]{6,}$/.test(yt)) return { embed: `https://www.youtube.com/embed/${yt}`, thumbnail: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` };
    url.searchParams.sort();
    return { embed: url.href, thumbnail: "" };
  } catch { return null; }
}

/** Parse HTML without mounting it or executing any third-party content. */
export function parseBulkEmbeds(raw: string, existing: string[] = []): BulkImportResult {
  const entries: ImportedEmbed[] = [];
  const errors: ImportIssue[] = [];
  const seen = new Set(existing.map((url) => fromUrl(url)?.embed ?? url));
  const add = (src: string) => {
    const entry = fromUrl(src);
    if (!entry) { errors.push({ entry: src || "iframe", reason: "Invalid or unsafe URL" }); return; }
    if (seen.has(entry.embed)) { errors.push({ entry: entry.embed, reason: "Duplicate video" }); return; }
    seen.add(entry.embed);
    entries.push(entry);
  };
  let iframe: { src: string; start: number } | null = null;
  let ignored = 0;
  const parser = new Parser({
    onopentag(name, attrs) {
      if (["script", "style"].includes(name)) ignored++;
      if (name === "iframe" && !ignored) {
        if (iframe) errors.push({ entry: iframe.src, reason: "Incomplete iframe" });
        iframe = { src: attrs["src"] ?? "", start: parser.startIndex };
      }
    },
    ontext(text) {
      if (!iframe && !ignored) for (const token of text.trim().split(/\s+/).filter(Boolean)) add(token);
    },
    onclosetag(name, implied) {
      if (name === "iframe" && iframe) {
        if (implied) errors.push({ entry: iframe.src, reason: "Incomplete iframe" });
        else add(iframe.src);
        iframe = null;
      }
      if (["script", "style"].includes(name)) ignored = Math.max(0, ignored - 1);
    },
  }, { decodeEntities: true });
  parser.end(raw);
  return { entries, errors };
}

export function parseEmbed(line: string): ImportedEmbed | null { return parseBulkEmbeds(line).entries[0] ?? null; }
export function parseEmbeds(raw: string): ImportedEmbed[] { return parseBulkEmbeds(raw).entries; }
export function embedProvider(embed: string): string {
  const host = new URL(embed).hostname.replace(/^www\./, "");
  if (host === "cloudfam.io") return "Cloudfam";
  if (["youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) return "YouTube";
  if (host === "player.vimeo.com" || host === "vimeo.com") return "Vimeo";
  if (host === "dailymotion.com" || host === "geo.dailymotion.com") return "Dailymotion";
  if (host === "archive.org") return "Internet Archive";
  return host;
}
