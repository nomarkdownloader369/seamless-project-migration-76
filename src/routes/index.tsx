import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrendingCarousel } from "@/components/site/TrendingCarousel";
import { CategoryBar } from "@/components/site/CategoryBar";
import { VideoCard } from "@/components/site/VideoCard";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/videos";

const PER_PAGE = 15;

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined; cat?: string | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    cat: typeof s["cat"] === "string" ? s["cat"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "TABOOBOX — Trending & Latest Videos" },
      { name: "description", content: "Browse trending and latest videos in the TABOOBOX archive." },
      { property: "og:title", content: "TABOOBOX — Trending & Latest Videos" },
      { property: "og:description", content: "Browse trending and latest videos in the TABOOBOX archive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { q, cat } = Route.useSearch();
  const { published } = useStore();
  const { t, lang } = useI18n();
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q, cat]);

  const trending = useMemo(() => [...published].sort((a, b) => b.views - a.views).slice(0, 8), [published]);
  const list = useMemo(() => {
    const term = q?.toLowerCase();
    return published.filter((v) => (!cat || v.category === cat) && (!term || v.title.toLowerCase().includes(term) || v.titleAr.includes(term)));
  }, [published, q, cat]);
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const go = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const catLabel = CATEGORIES.find((c) => c.id === cat)?.[lang];

  return (
    <div className="mx-auto max-w-7xl px-3 pb-8 md:px-6">
      <CategoryBar active={cat} />
      {!q && !cat && trending.length > 0 && <TrendingCarousel videos={trending} />}
      <h2 className="mb-2.5 mt-6 font-display md:mt-7 text-xl font-bold uppercase tracking-wide">
        {q ? `“${q}”` : catLabel ?? t("latest")}
        <span className="ms-2 text-sm font-normal text-muted-foreground">{list.length}</span>
      </h2>
      {shown.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">{t("noResults")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-4 md:gap-x-3.5 md:gap-y-5 xl:grid-cols-5">
          {shown.map((v) => <VideoCard key={v.id} v={v} />)}
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-1.5" aria-label="Pagination">
          <Button variant="secondary" disabled={page === 1} onClick={() => go(page - 1)} className="flex h-10 items-center gap-1 rounded-md bg-surface-2 px-3 text-sm font-semibold disabled:opacity-40">
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />{t("prev")}
          </Button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Button variant="secondary" key={p} onClick={() => go(p)} aria-current={p === page ? "page" : undefined}
              className={`h-10 min-w-10 rounded-md text-sm font-bold ${p === page ? "bg-primary text-primary-foreground" : "bg-surface-2 hover:bg-accent"}`}>{p}</Button>
          ))}
          <Button variant="secondary" disabled={page === pages} onClick={() => go(page + 1)} className="flex h-10 items-center gap-1 rounded-md bg-surface-2 px-3 text-sm font-semibold disabled:opacity-40">
            {t("next")}<ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </nav>
      )}
    </div>
  );
}
