export type VideoStatus = "published" | "pending";
export interface Video {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  category: CategoryId;
  thumbnail: string;
  embedUrl: string;
  views: number;
  likes: number;
  duration: string;
  status: VideoStatus;
  createdAt: string;
  /** Verified playback quality. null/undefined = unknown; never guessed from the embed URL. */
  quality?: VideoQuality | null;
  /** Where the quality value came from, for auditing future provider/metadata detection. */
  qualitySource?: QualitySource;
}

export const VIDEO_QUALITIES = ["480p", "720p", "1080p", "1440p", "2160p"] as const;
export type VideoQuality = (typeof VIDEO_QUALITIES)[number];
export type QualitySource = "provider-api" | "file-metadata" | "manual" | "unknown";
export function qualityLabel(q: VideoQuality | null | undefined) {
  return q ? (q === "2160p" ? "4K" : q === "1440p" ? "2K" : q) : null;
}

export const CATEGORIES = [
  { id: "all", en: "All", ar: "الكل" },
  { id: "action", en: "Action", ar: "أكشن" },
  { id: "drama", en: "Drama", ar: "دراما" },
  { id: "thriller", en: "Thriller", ar: "إثارة" },
  { id: "horror", en: "Horror", ar: "رعب" },
  { id: "documentary", en: "Documentary", ar: "وثائقي" },
  { id: "music", en: "Music", ar: "مزيكا" },
  { id: "sports", en: "Sports", ar: "رياضة" },
  { id: "classic", en: "Classic", ar: "كلاسيك" },
] as const;
export type CategoryId = Exclude<(typeof CATEGORIES)[number]["id"], "all">;

const words = ["Midnight", "Shadow", "Crimson", "Silent", "Neon", "Iron", "Black Tide", "Lost", "Final", "Hidden", "Storm", "Ghost", "Velvet", "Cold", "Wild", "Dark Harbor"];
const nouns = ["Run", "Signal", "Protocol", "Archive", "Hunter", "Code", "Coast", "Echo", "Empire", "Witness", "Escape", "Frontier", "Legacy", "Reckoning"];
const arWords = ["منتصف الليل", "الظل", "القرمزي", "الصامت", "النيون", "الحديد", "المد الأسود", "الضايع", "الأخير", "المستخبي"];
const cats: CategoryId[] = ["action", "drama", "thriller", "horror", "documentary", "music", "sports", "classic"];
const embeds = ["https://www.youtube.com/embed/aqz-KE-bpKQ", "https://www.youtube.com/embed/YE7VzlLtp-4", "https://www.youtube.com/embed/eRsGyueVLvQ"];

export const SAMPLE_VIDEOS: Video[] = Array.from({ length: 52 }, (_, i) => {
  const t = `${words[i % words.length]} ${nouns[(i * 3) % nouns.length]}`;
  const m = 4 + ((i * 7) % 52);
  const s = (i * 13) % 60;
  return {
    id: `v${i + 1}`,
    title: t,
    titleAr: `${nouns[(i * 3) % nouns.length]} ${arWords[i % arWords.length]}`,
    description: `${t} — a cinematic piece from the PUREXDARK archive. Restored in high quality with full detail, part of our curated ${cats[i % cats.length]} collection.`,
    category: cats[i % cats.length] ?? "classic",
    thumbnail: `https://picsum.photos/seed/pxd${i + 7}/640/360`,
    embedUrl: embeds[i % embeds.length] ?? "https://www.youtube.com/embed/aqz-KE-bpKQ",
    views: Math.round(((i * 7919) % 980000) + 1200),
    likes: Math.round(((i * 331) % 9000) + 40),
    duration: `${m}:${String(s).padStart(2, "0")}`,
    status: i % 9 === 4 ? "pending" : "published",
    quality: null, // sample data: real quality is unknown
    qualitySource: "unknown",
    createdAt: new Date(Date.UTC(2026, 10, 16) - i * 86400000 * 0.7).toISOString(),
  };
});

export function formatViews(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
