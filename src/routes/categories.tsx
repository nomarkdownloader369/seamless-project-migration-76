import { createFileRoute, Link } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/videos";
import { Thumb } from "@/components/site/Thumb";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [
    { title: "Categories — PUREXDARK" }, { name: "description", content: "Browse PUREXDARK videos by category." },
    { property: "og:title", content: "Categories — PUREXDARK" }, { property: "og:description", content: "Browse PUREXDARK videos by category." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Cats,
});

function Cats() {
  const { published } = useStore();
  const { lang, t } = useI18n();
  return (
    <div className="mx-auto max-w-7xl px-3 py-4 md:px-6">
      <h1 className="mb-4 font-display text-2xl font-bold uppercase">{t("categories")}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CATEGORIES.slice(1).map((c) => {
          const vs = published.filter((v) => v.category === c.id);
          return (
            <Link key={c.id} to="/" search={{ cat: c.id, q: undefined }} className="group relative aspect-video overflow-hidden rounded-lg">
              {vs[0] && <Thumb src={vs[0].thumbnail} embed={vs[0].embedUrl} alt="" className="opacity-60" />}
              <div className="thumb-fade absolute inset-0" />
              <div className="absolute bottom-2 start-3"><p className="font-display text-lg font-bold uppercase">{c[lang]}</p><p className="text-xs text-muted-foreground">{vs.length}</p></div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
