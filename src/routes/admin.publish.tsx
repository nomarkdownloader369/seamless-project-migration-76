import { useI18n } from "@/lib/i18n";
import { adminCopy } from "@/lib/admin-copy";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Upload, Trash2, Send, Download, Pencil, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { AiMetadata } from "@/lib/ai-publisher";
import { generateVideoMetadata } from "@/lib/ai-publisher.functions";
import { useStore } from "@/lib/store";
import { CATEGORIES, qualityLabel, type CategoryId, type VideoQuality } from "@/lib/videos";
import { qualityFromHeight } from "@/lib/video-quality";
import { Thumb } from "@/components/site/Thumb";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { cloudfamEmbedId, parseBulkEmbeds, embedProvider, type ImportIssue } from "@/lib/video-import";
import { publicationDescription, publicationCategory, reviewError } from "@/lib/video-publishing";
import { getCloudfamThumbnail } from "@/lib/video-import.functions";

export const Route = createFileRoute("/admin/publish")({
  head: () => ({ meta: [
    { title: "Video Importer — TABOOBOX" }, { name: "description", content: "Import and publish videos in the TABOOBOX archive." },
    { property: "og:title", content: "Video Importer — TABOOBOX" }, { property: "og:description", content: "Import and publish videos in the TABOOBOX archive." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Publisher,
});

type Status = "imported" | "analyzing" | "ready" | "approved" | "error";
interface Item { id: string; embed: string; thumbnail: string; duration: string; quality: VideoQuality | null; status: Status; selected: boolean; meta: AiMetadata; error?: string | undefined }

const emptyMeta: AiMetadata = { titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", category: "", tags: [] };

const statusCls: Record<Status, string> = {
  imported: "bg-overlay text-foreground", analyzing: "bg-warning/20 text-warning", ready: "bg-foreground/90 text-background",
  approved: "bg-success/20 text-success", error: "bg-primary/20 text-primary",
};
const field = "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function Publisher() {
  const { lang } = useI18n(); const ar = lang === "ar";
  const tr = (value: string) => ar ? adminCopy[value] ?? value : value;
  const { addVideos, videos } = useStore();
  const lock = useRef(false);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const fetchThumbnail = useServerFn(getCloudfamThumbnail);
  const analyzeVideo = useServerFn(generateVideoMetadata);
  const [importing, setImporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [raw, setRaw] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  // Keep unpublished review cards across refreshes so nothing imported is lost.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem("pxd-review") ?? "[]"); if (Array.isArray(saved)) setItems(saved.map((x: Item) => ({ ...x, status: x.status === "analyzing" ? "imported" : x.status }))); } catch { localStorage.removeItem("pxd-review"); }
    setRestored(true);
  }, []);
  useEffect(() => { if (restored) localStorage.setItem("pxd-review", JSON.stringify(items)); }, [items, restored]);
  const patch = (id: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const selected = items.filter((i) => i.selected);
  const busy = importing || publishing || Boolean(progress && progress.done < progress.total);
  const approved = items.filter((i) => i.status === "approved");
  const editMeta = (id: string, meta: AiMetadata) => patch(id, { meta, status: "ready", error: undefined });
  const approve = (it: Item) => {
    const error = reviewError(it.meta);
    if (error) { patch(it.id, { error }); return; }
    patch(it.id, { status: "approved", error: undefined });
  };

  const doImport = async () => {
    if (busy || lock.current) return;
    const result = parseBulkEmbeds(raw, [...items.map((it) => it.embed), ...videos.map((v) => v.embedUrl)]);
    setIssues(result.errors);
    setImportedCount(0);
    const parsed = result.entries;
    if (!parsed.length) { toast.error("No new valid videos found"); return; }
    lock.current = true;
    setImporting(true);
    setProgress({ done: 0, total: parsed.length, label: "Importing" });
    try {
      let missing = 0;
      // Sequential requests keep large imports from overwhelming the provider.
      const results: (typeof parsed[number] & { duration: string; quality: VideoQuality | null })[] = [];
      const details = new Map<string, { thumbnail: string; duration: string; quality: VideoQuality | null }>();
      for (const [index, entry] of parsed.entries()) {
        const embedId = cloudfamEmbedId(entry.embed);
        let extra = { thumbnail: entry.thumbnail, duration: "", quality: null as VideoQuality | null };
        if (embedId) {
          if (!details.has(embedId)) {
            try {
              const d = await fetchThumbnail({ data: { embedId } });
              details.set(embedId, { thumbnail: d.thumbnail ?? "", duration: d.duration ?? "", quality: qualityFromHeight(d.height) });
            } catch { details.set(embedId, { thumbnail: "", duration: "", quality: null }); }
          }
          const d = details.get(embedId);
          // Keep the original pasted thumbnail URL when present; provider metadata only fills gaps.
          if (d) extra = { ...d, thumbnail: entry.thumbnail || d.thumbnail };
          if (!extra.thumbnail) missing++;
        }
        results.push({ ...entry, ...extra });
        setProgress({ done: index + 1, total: parsed.length, label: "Importing" });
      }
      setItems((xs) => [...xs, ...results.map((p) => ({ ...p, id: crypto.randomUUID(), status: "imported" as Status, selected: false, meta: { ...emptyMeta } }))]);
      setImportedCount(results.length);
      setRaw("");
      toast.success(`${parsed.length} videos added for review`);
      if (missing) toast.info(`${missing} Cloudfam thumbnail${missing === 1 ? "" : "s"} not found — using a static cover instead.`);
    } finally { setImporting(false); lock.current = false; }
  };

  const run = async (targets: Item[]) => {
    if (busy || lock.current || !targets.length) return;
    lock.current = true;
    setProgress({ done: 0, total: targets.length, label: "Analyzing" });
    for (const [i, it] of targets.entries()) {
      patch(it.id, { status: "analyzing", error: undefined });
      try {
        const meta = await analyzeVideo({ data: { embed: it.embed, thumbnail: it.thumbnail } });
        patch(it.id, { status: "ready", meta });
      } catch (e) {
        patch(it.id, { status: "error", error: e instanceof Error ? e.message : String(e) });
      }
      setProgress({ done: i + 1, total: targets.length, label: "Analyzing" });
    }
    lock.current = false;
  };

  const publish = async (ok: Item[]) => {
    if (busy || lock.current || !ok.length) return false;
    const valid = ok.filter((it) => {
      const error = reviewError(it.meta);
      if (error) patch(it.id, { error });
      return !error;
    });
    if (valid.length !== ok.length) { toast.error("Complete titles and categories before publishing."); return false; }
    lock.current = true;
    setPublishing(true);
    setProgress({ done: 0, total: valid.length, label: "Publishing" });
    let count = 0;
    try {
      for (const it of valid) {
        const duplicate = parseBulkEmbeds(it.embed, videos.filter((v) => v.id !== `imp-${it.id}`).map((v) => v.embedUrl));
        if (!duplicate.entries.length) { patch(it.id, { error: "This video is already in the archive." }); continue; }
        const saved = await addVideos([{
          id: `imp-${it.id}`, title: it.meta.titleEn.trim() || it.meta.titleAr.trim(), titleAr: it.meta.titleAr.trim() || it.meta.titleEn.trim(),
          description: publicationDescription(it.meta), category: publicationCategory(it.meta),
          thumbnail: it.thumbnail, embedUrl: it.embed, quality: it.quality, qualitySource: it.quality ? "file-metadata" : "unknown",
          views: 0, likes: 0, duration: it.duration, status: "published", createdAt: new Date().toISOString(),
        }]);
        if (saved) { count++; setItems((xs) => xs.filter((x) => x.id !== it.id)); }
        else patch(it.id, { error: "Not published. Your video is still here; retry when connected." });
        setProgress((p) => p ? { ...p, done: p.done + 1 } : p);
      }
      if (count) toast.success(`${count} video${count === 1 ? "" : "s"} saved to the archive`);
      return count === valid.length;
    } finally { setPublishing(false); lock.current = false; setProgress({ done: valid.length, total: valid.length, label: "Publishing" }); }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items.map(({ embed, thumbnail, status, meta }) => ({ embed, thumbnail, status, ...meta })), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "taboobox-videos.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const editing = items.find((i) => i.id === editId);

  const step = items.length ? (approved.length ? 3 : 2) : 1;
  const steps = [ar ? "استيراد" : "Import", ar ? "مراجعة بالذكاء الاصطناعي" : "Review with AI", ar ? "نشر" : "Publish"];
  const statusLabel: Record<Status, string> = { imported: "New", analyzing: "AI writing…", ready: "Ready", approved: "Approved", error: "Needs attention" };

  return (
    <div className="space-y-5 pb-28 md:pb-24">
      <header className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{tr("AI video publishing")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tr("Paste links, let AI write titles, descriptions and tags in English and Arabic, then publish.")}</p>
        </div>
        <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Publishing steps">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`step-dot ${step > i + 1 ? "step-done" : step === i + 1 ? "step-active" : ""}`}>{i + 1}</span>
              <span className={step === i + 1 ? "text-foreground" : "text-muted-foreground"}>{s}</span>
              {i < steps.length - 1 && <span className="hidden h-px w-5 bg-border sm:block" />}
            </li>
          ))}
        </ol>
      </header>

      <section className="panel p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2"><span className="step-dot step-active">1</span><label htmlFor="video-import" className="font-display text-lg font-bold uppercase">{tr("Add video links")}</label></div>
        <p className="mb-3 text-xs text-muted-foreground">{tr("One per line. Supports Cloudfam, YouTube, Vimeo, Dailymotion and Internet Archive links or embed codes.")}</p>
        <textarea id="video-import" disabled={busy} aria-label="Video URLs or embed codes" value={raw} onChange={(e) => setRaw(e.target.value)} rows={5} dir="ltr" placeholder={'<iframe src="https://cloudfam.io/embed/..."></iframe>\nhttps://youtu.be/...'} className={`${field} font-mono text-xs`} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={doImport} disabled={busy || !raw.trim()} className="h-11 px-6">{importing ? <Loader2 className="animate-spin" /> : <Upload />}{importing ? ar ? "جارٍ الاستيراد…" : "Importing…" : ar ? "استيراد الفيديوهات" : "Import videos"}</Button>
          {(importedCount > 0 || issues.length > 0) && <p role="status" className="text-sm text-muted-foreground"><span className="font-semibold text-success">{importedCount} imported</span>{issues.length > 0 && <> · <span className="font-semibold text-primary">{issues.length} skipped</span></>}</p>}
        </div>
        {issues.length > 0 && <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-md bg-surface-2 p-3 text-xs text-muted-foreground">{issues.map((issue, i) => <li key={i} className="break-all">{issue.reason}: {issue.entry}</li>)}</ul>}
      </section>

      {progress && progress.done < progress.total && <div role="status" className="panel space-y-2 p-4"><div className="flex justify-between text-sm font-semibold"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-primary" />{progress.label}…</span><span>{progress.done} / {progress.total}</span></div><progress className="h-2 w-full accent-primary" value={progress.done} max={progress.total} aria-label={`${progress.label} progress`} /></div>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><span className={`step-dot ${items.length ? "step-active" : ""}`}>2</span><h2 className="font-display text-lg font-bold uppercase">{ar ? "المراجعة" : "Review"} <span className="text-sm text-muted-foreground">{items.length}</span></h2></div>
          {items.length > 0 && <div className="flex flex-wrap gap-2">
            <Button variant="ai" size="sm" disabled={busy} onClick={() => run(items)}><Sparkles />{tr("Write all with AI")}</Button>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => setItems((xs) => xs.map((x) => ({ ...x, selected: !selected.length })))}>{selected.length ? ar ? "إلغاء تحديد الكل" : "Deselect all" : ar ? "تحديد الكل" : "Select all"}</Button>
            <Button variant="ghost" size="icon" title="Export JSON" aria-label="Export JSON" disabled={busy} onClick={exportJson}><Download /></Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => { if (window.confirm("Clear all unpublished review videos?")) setItems([]); }}><X />{tr("Clear")}</Button>
          </div>}
        </div>
        {!items.length ? <div className="panel flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground"><Upload className="h-8 w-8 text-primary" />{tr("Imported videos appear here for review.")}</div> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((it) => (
              <article aria-label={`Review video ${items.indexOf(it) + 1}`} key={it.id} className={`panel overflow-hidden transition-shadow ${it.selected ? "ring-2 ring-primary" : ""}`}>
                <div className="relative aspect-video bg-surface-2">
                  <Thumb src={it.thumbnail} embed={it.embed} alt="" />
                  {it.duration && <span className="absolute bottom-2 end-2 rounded bg-overlay px-1.5 py-0.5 text-[11px] font-bold">{it.duration}</span>}
                  <input type="checkbox" aria-label={`Select ${it.meta.titleEn || "video"}`} disabled={busy} checked={it.selected} onChange={(e) => patch(it.id, { selected: e.target.checked })} className="absolute top-2 start-2 h-5 w-5 accent-primary" />
                  <span className={`absolute top-2 end-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusCls[it.status]}`}>{statusLabel[it.status]}</span>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold uppercase tracking-wide text-primary">{embedProvider(it.embed)}{it.quality ? ` · ${qualityLabel(it.quality)}` : ""}</span>
                    <Button size="icon" variant="ghost" title="Remove video" aria-label="Remove video" disabled={busy} onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))}><Trash2 /></Button>
                  </div>
                  <Button variant="ai" size="sm" className="w-full" disabled={busy} onClick={() => run([it])}>{it.status === "analyzing" ? <Loader2 className="animate-spin" /> : <Sparkles />}{it.meta.titleEn ? "Rewrite with AI" : "Write with AI"}</Button>
                  <label className="block text-xs font-semibold text-muted-foreground">{tr("Title")}<input disabled={busy} className={`${field} mt-1`} value={it.meta.titleEn} onChange={(e) => editMeta(it.id, { ...it.meta, titleEn: e.target.value })} /></label>
                  <label className="block text-xs font-semibold text-muted-foreground">{tr("Description")}<textarea disabled={busy} rows={3} className={`${field} mt-1`} value={it.meta.descriptionEn} onChange={(e) => editMeta(it.id, { ...it.meta, descriptionEn: e.target.value })} /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-semibold text-muted-foreground">{tr("Category")}<select disabled={busy} className={`${field} mt-1`} value={it.meta.category} onChange={(e) => editMeta(it.id, { ...it.meta, category: e.target.value })}><option value="">{ar ? "اختر…" : "Choose…"}</option>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c[lang]}</option>)}</select></label>
                    <label className="block text-xs font-semibold text-muted-foreground">{tr("Tags")}<input disabled={busy} className={`${field} mt-1`} value={it.meta.tags.join(", ")} onChange={(e) => editMeta(it.id, { ...it.meta, tags: e.target.value.split(",") })} /></label>
                  </div>
                  {it.error && <p role="alert" className="rounded-md bg-primary/10 p-2 text-xs text-primary">{it.error}</p>}
                  <div className="flex items-center justify-between gap-2 border-t pt-3">
                    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-primary" disabled={busy} checked={it.status === "approved"} onChange={(e) => e.target.checked ? approve(it) : patch(it.id, { status: "ready" })} />{tr("Approved")}</label>
                    <div className="flex gap-1">
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => setEditId(it.id)}><Pencil />{tr("More")}</Button>
                      <Button size="sm" disabled={busy} onClick={() => publish([it])}><Send />{tr("Publish")}</Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {items.length > 0 && (
        <div className="action-bar fixed inset-x-0 bottom-16 z-40 md:bottom-0">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-3 md:px-6">
            <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{selected.length}</span> selected · <span className="font-semibold text-success">{approved.length}</span> approved</p>
            <div className="flex flex-wrap gap-2">
              {selected.length > 0 && <>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setItems((xs) => xs.filter((x) => !x.selected))}><Trash2 />{tr("Remove")}</Button>
                <Button variant="ai" size="sm" disabled={busy} onClick={() => run(selected)}><Sparkles />{tr("AI selected")}</Button>
                <Button size="sm" disabled={busy} onClick={() => publish(selected)}><Send />{tr("Publish selected")}</Button>
              </>}
              {!selected.length && <Button size="sm" disabled={busy || !approved.length} onClick={() => publish(approved)}><Send />Publish {approved.length || ""} approved</Button>}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay md:items-center">
          <div className="max-h-[90vh] w-full max-w-lg space-y-2 overflow-y-auto rounded-t-2xl border bg-card p-5 md:rounded-2xl">
            <div className="flex items-center justify-between"><h3 className="font-display text-lg font-bold uppercase">{tr("Video details")}</h3><Button size="icon" variant="ghost" aria-label="Close details" onClick={() => setEditId(null)}><X /></Button></div>
            <label className="block text-xs font-semibold text-muted-foreground">{tr("Thumbnail URL")}<input className={field} value={editing.thumbnail} onChange={(e) => patch(editing.id, { thumbnail: e.target.value })} /></label>
            {(["titleEn", "titleAr", "descriptionEn", "descriptionAr"] as const).map((k) => (
              <label key={k} className="block text-xs font-semibold text-muted-foreground">{({ titleEn: "Title", titleAr: "Arabic title", descriptionEn: "Description", descriptionAr: "Arabic description" })[k]}
                <textarea rows={k.startsWith("desc") ? 3 : 1} dir={k.endsWith("Ar") ? "rtl" : "ltr"} className={field} value={editing.meta[k]} onChange={(e) => patch(editing.id, { meta: { ...editing.meta, [k]: e.target.value }, status: "ready" })} />
              </label>
            ))}
            <label className="block text-xs font-semibold text-muted-foreground">{tr("Category")}
              <select className={field} value={editing.meta.category} onChange={(e) => patch(editing.id, { meta: { ...editing.meta, category: e.target.value }, status: "ready" })}>
                <option value="">—</option>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c[lang]}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted-foreground">{tr("Duration (e.g. 12:34)")}
              <input className={field} dir="ltr" value={editing.duration} onChange={(e) => patch(editing.id, { duration: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-muted-foreground">{tr("Tags (comma separated)")}
              <input className={field} value={editing.meta.tags.join(", ")} onChange={(e) => patch(editing.id, { meta: { ...editing.meta, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }, status: "ready" })} />
            </label>
            <Button onClick={() => { if (editing.status === "imported" || editing.status === "error") patch(editing.id, { status: "ready" }); setEditId(null); }} className="h-11 w-full">{tr("Save details")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
