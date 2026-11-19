import type { AiMetadata } from "./ai-publisher";
import { CATEGORIES, type CategoryId } from "./videos";

export function reviewError(meta: AiMetadata): string | null {
  if (!meta.titleEn.trim() && !meta.titleAr.trim()) return "Add a title before publishing.";
  if (!CATEGORIES.some((c) => c.id !== "all" && c.id === meta.category)) return "Choose a category before publishing.";
  return null;
}

/** Store tags with the caption in the existing description field. */
export function publicationDescription(meta: AiMetadata): string {
  const caption = meta.descriptionEn.trim() || meta.descriptionAr.trim();
  const tags = [...new Set(meta.tags.map((tag) => tag.trim().replace(/^#+/, "").replace(/\s+/g, "_")).filter(Boolean))].map((tag) => `#${tag}`);
  return [caption, tags.join(" ")].filter(Boolean).join("\n\n");
}
export function publicationCategory(meta: AiMetadata): CategoryId {
  const cat = CATEGORIES.find((c) => c.id !== "all" && c.id === meta.category);
  return cat && cat.id !== "all" ? cat.id : "classic";
}

export function confirmedInsert(expected: string[], rows: { id: string }[] | null): boolean {
  return Boolean(rows && rows.length === expected.length && expected.every((id) => rows.some((row) => row.id === id)));
}
