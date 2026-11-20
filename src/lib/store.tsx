/** Video + favorites store. Videos live in the shared database; favorites stay in this browser. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { createRequestGate } from "./video-request-gate";
import { confirmedInsert } from "./video-publishing";
import { cloudfamEmbedId } from "./video-import";
import { getCloudfamThumbnail } from "./video-import.functions";
import { qualityFromHeight } from "./video-quality";
import { type CategoryId, type QualitySource, type Video, type VideoQuality } from "./videos";

interface StoreCtx {
  videos: Video[];
  published: Video[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
  updateVideo: (id: string, patch: Partial<Video>) => void;
  deleteVideo: (id: string) => void;
  addVideos: (v: Video[]) => Promise<boolean>;
}
const Ctx = createContext<StoreCtx | null>(null);

type Row = {
  id: string; title: string; title_ar: string; description: string; category: string; thumbnail: string; embed_url: string;
  views: number; likes: number; duration: string; status: string; quality: string | null; quality_source: string; created_at: string;
};
const fromRow = (r: Row): Video => ({
  id: r.id, title: r.title, titleAr: r.title_ar, description: r.description, category: r.category as CategoryId,
  thumbnail: r.thumbnail, embedUrl: r.embed_url, views: r.views, likes: r.likes, duration: r.duration,
  status: r.status === "pending" ? "pending" : "published", createdAt: r.created_at,
  quality: (r.quality as VideoQuality | null) ?? null, qualitySource: r.quality_source as QualitySource,
});
function toRow(p: Partial<Video>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: Record<string, any> = {};
  if (p.id !== undefined) r["id"] = p.id;
  if (p.title !== undefined) r["title"] = p.title;
  if (p.titleAr !== undefined) r["title_ar"] = p.titleAr;
  if (p.description !== undefined) r["description"] = p.description;
  if (p.category !== undefined) r["category"] = p.category;
  if (p.thumbnail !== undefined) r["thumbnail"] = p.thumbnail;
  if (p.embedUrl !== undefined) r["embed_url"] = p.embedUrl;
  if (p.views !== undefined) r["views"] = p.views;
  if (p.likes !== undefined) r["likes"] = p.likes;
  if (p.duration !== undefined) r["duration"] = p.duration;
  if (p.status !== undefined) r["status"] = p.status;
  if (p.quality !== undefined) r["quality"] = p.quality;
  if (p.qualitySource !== undefined) r["quality_source"] = p.qualitySource;
  if (p.createdAt !== undefined) r["created_at"] = p.createdAt;
  return r;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const gate = useRef(createRequestGate());
  const metadata = useRef(new Map<string, ReturnType<typeof getCloudfamThumbnail>>());
  const [dbVideos, setDbVideos] = useState<Video[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);

  const load = useCallback(async () => {
    if (gate.current.isWriting()) return;
    const request = gate.current.begin();
    const rows: Row[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from("videos").select("*").order("created_at", { ascending: false }).order("id").range(offset, offset + 999);
      if (!gate.current.isCurrent(request)) return;
      if (error || !data) { setDbLoaded(true); return; }
      rows.push(...data);
      if (data.length < 1000) break;
    }
    if (!gate.current.isCurrent(request)) return;
    const catalog = rows.map(fromRow);
    setDbVideos(catalog); setDbLoaded(true);
    // Refresh existing unknown records too; only real file measurements produce badges.
    const noDuration = (d: string) => !d || d === "0:00";
    const unresolved = catalog.filter((v) => (!v.quality || noDuration(v.duration)) && cloudfamEmbedId(v.embedUrl));
    for (let offset = 0; offset < unresolved.length; offset += 3) {
      if (!gate.current.isCurrent(request)) return;
      await Promise.all(unresolved.slice(offset, offset + 3).map(async (v) => {
        const embedId = cloudfamEmbedId(v.embedUrl);
        if (!embedId) return;
        try {
          let pending = metadata.current.get(embedId);
          if (!pending) {
            pending = getCloudfamThumbnail({ data: { embedId } });
            metadata.current.set(embedId, pending);
          }
          const details = await pending;
          const quality = qualityFromHeight(details.height);
          const duration = details.duration;
          if (!quality && !duration) { metadata.current.delete(embedId); return; }
          if (!gate.current.isCurrent(request)) return;
          // Only measured CloudFam file values are applied; nothing is estimated.
          setDbVideos((current) => current.map((item) => {
            if (item.id !== v.id || item.embedUrl !== v.embedUrl) return item;
            const next = { ...item };
            if (quality && !item.quality) { next.quality = quality; next.qualitySource = "file-metadata"; }
            if (duration && noDuration(item.duration)) next.duration = duration;
            return next;
          }));
        } catch { metadata.current.delete(embedId); }
      }));
    }
  }, []);

  useEffect(() => {
    const refresh = () => { gate.current.invalidate(); void load(); };
    window.addEventListener("taboobox-catalog-refresh", refresh);
    return () => window.removeEventListener("taboobox-catalog-refresh", refresh);
  }, [load]);
  useEffect(() => {
    const f = localStorage.getItem("pxd-favs");
    if (f) { try { const saved: unknown = JSON.parse(f); if (Array.isArray(saved)) setFavorites(saved.filter((x): x is string => typeof x === "string")); } catch { localStorage.removeItem("pxd-favs"); } }
    setLoaded(true);
  }, []);
  useEffect(() => {
    gate.current.invalidate();
    if (ready) void load();
    return () => gate.current.invalidate();
  }, [ready, user?.id, user?.isAdmin, load]);
  useEffect(() => { if (loaded) localStorage.setItem("pxd-favs", JSON.stringify(favorites)); }, [favorites, loaded]);

  const isDb = (id: string) => dbVideos.some((v) => v.id === id);
  // Only real published records from the archive are shown; demo samples are never mixed in.
  const videos = dbLoaded ? dbVideos : [];

  return (
    <Ctx.Provider value={{
      videos,
      published: videos.filter((v) => v.status === "published"),
      favorites,
      toggleFavorite: (id) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
      updateVideo: (id, patch) => {
        if (!isDb(id)) return;
        gate.current.invalidate();
        setDbVideos((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
        gate.current.startWrite();
        void supabase.from("videos").update(toRow(patch) as never).eq("id", id).select("id").then(({ data, error }) => {
          gate.current.finishWrite();
          if (error || !data?.length) toast.error(error ? `Not saved: ${error.message}` : "Not saved: you may not have permission.");
          else toast.success("Saved");
          void load();
        });
      },
      deleteVideo: (id) => {
        if (!isDb(id)) return;
        gate.current.invalidate();
        setDbVideos((vs) => vs.filter((v) => v.id !== id));
        gate.current.startWrite();
        void supabase.from("videos").delete().eq("id", id).select("id").then(({ data, error }) => {
          gate.current.finishWrite();
          if (error || !data?.length) toast.error(error ? `Not deleted: ${error.message}` : "Not deleted: you may not have permission.");
          else toast.success("Deleted");
          void load();
        });
      },
      addVideos: async (n) => {
        if (!n.length) return false;
        gate.current.startWrite();
        try {
        const { data, error } = await supabase.from("videos").insert(n.map((v) => toRow(v)) as never).select("*");
        if (error) { toast.error(`Could not publish: ${error.message}`); return false; }
        if (!confirmedInsert(n.map((v) => v.id), data)) { toast.error("Publication could not be confirmed. Your review videos have been kept."); return false; }
        if (data) setDbVideos((current) => {
          const saved = (data as Row[]).map(fromRow);
          const ids = new Set(saved.map((v) => v.id));
          return [...saved, ...current.filter((v) => !ids.has(v.id))];
        });
        return true;
        } catch { toast.error("Could not reach the archive. Your review videos have been kept."); return false; }
        finally { gate.current.finishWrite(); void load(); }
      },
    }}>{children}</Ctx.Provider>
  );
}
export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
