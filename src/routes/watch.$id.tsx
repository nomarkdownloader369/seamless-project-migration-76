import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ThumbsUp, Heart, Share2, Eye, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, SAMPLE_VIDEOS, formatViews } from "@/lib/videos";
import { VideoCard } from "@/components/site/VideoCard";

export const Route = createFileRoute("/watch/$id")({
  head: ({ params }) => {
    const v = SAMPLE_VIDEOS.find((x) => x.id === params.id);
    const title = v ? `${v.title} — PUREXDARK` : "Video — PUREXDARK";
    const desc = v?.description ?? "Watch on PUREXDARK.";
    return { meta: [
      { title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc },
      { property: "og:type", content: "video.other" }, { name: "twitter:card", content: "summary_large_image" },
      ...(v ? [{ property: "og:image", content: v.thumbnail }, { name: "twitter:image", content: v.thumbnail }] : []),
    ] };
  },
  component: Watch,
});

interface Comment { name: string; text: string }

function Watch() {
  const { id } = Route.useParams();
  const { videos, published, favorites, toggleFavorite } = useStore();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const v = videos.find((x) => x.id === id);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([
    { name: "Karim", text: "Great quality, thanks for the upload!" },
    { name: "Sara", text: "تحفة بجد 🔥" },
  ]);
  const [text, setText] = useState("");

  if (!v) return <div className="p-10 text-center text-muted-foreground">{t("noResults")} <Link to="/" search={{ q: undefined, cat: undefined }} className="text-primary">{t("home")}</Link></div>;
  const fav = favorites.includes(v.id);
  const cat = CATEGORIES.find((c) => c.id === v.category) ?? CATEGORIES[0];
  const related = published.filter((x) => x.id !== v.id && x.category === v.category).slice(0, 8);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: v.title, url }); } catch { /* cancelled */ } }
    else { await navigator.clipboard.writeText(url); toast.success(t("copied")); }
  };
  const btn = "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors";

  return (
    <div className="mx-auto max-w-7xl px-0 md:px-6 md:py-4">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="aspect-video w-full overflow-hidden bg-surface md:rounded-lg">
            <iframe src={v.embedUrl} title={v.title} className="h-full w-full" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
          <div className="px-3 md:px-0">
            <h1 className="mt-3 text-lg font-bold md:text-xl">{lang === "ar" ? v.titleAr : v.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{formatViews(v.views)} {t("views")}</span>
              <span aria-hidden="true">·</span>
              <Link to="/" search={{ cat: v.category, q: undefined }} className="flex items-center gap-1 rounded-full border border-primary/50 px-2.5 py-0.5 text-xs font-bold uppercase text-primary hover:bg-primary hover:text-primary-foreground">
                <LayoutGrid className="h-3 w-3" />{cat[lang]}
              </Link>
            </div>
            <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
              <button onClick={() => setLiked((l) => !l)} className={`${btn} ${liked ? "bg-primary text-primary-foreground" : "bg-surface-2"}`}><ThumbsUp className="h-4 w-4" />{formatViews(v.likes + (liked ? 1 : 0))}</button>
              <button onClick={() => { if (!user) { navigate({ to: "/login", search: { redirect: `/watch/${v.id}`, reason: "favorites" } }); return; } toggleFavorite(v.id); if (!fav) toast.success(t("favAdded")); }} className={`${btn} bg-surface-2`} aria-pressed={fav}>
                <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />{t("favorites")}
              </button>
              <button onClick={share} className={`${btn} bg-surface-2`}><Share2 className="h-4 w-4" />{t("share")}</button>
            </div>
            <p className="mt-3 rounded-lg bg-surface p-3 text-sm leading-relaxed text-muted-foreground">{v.description}</p>

            <section className="mt-5">
              <h2 className="mb-3 font-display text-lg font-bold uppercase">{t("comments")} <span className="text-sm text-muted-foreground">{comments.length}</span></h2>
              <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; setComments((c) => [{ name: user?.name ?? t("guest"), text }, ...c]); setText(""); }} className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("addComment")} className="h-10 flex-1 rounded-full border bg-surface px-4 text-sm outline-none focus:border-primary" />
                <button className="rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground">{t("post")}</button>
              </form>
              <ul className="mt-3 space-y-3">
                {comments.map((c, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">{c.name[0]}</div>
                    <div><p className="text-xs font-bold">{c.name}</p><p className="text-sm">{c.text}</p></div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
        <aside className="px-3 md:px-0">
          <h2 className="mb-3 font-display text-lg font-bold uppercase">{t("related")}</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">{related.map((r) => <VideoCard key={r.id} v={r} />)}</div>
        </aside>
      </div>
    </div>
  );
}
