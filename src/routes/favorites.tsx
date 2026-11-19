import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { VideoCard } from "@/components/site/VideoCard";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [
    { title: "Favorites — PUREXDARK" }, { name: "description", content: "Your saved PUREXDARK videos." },
    { property: "og:title", content: "Favorites — PUREXDARK" }, { property: "og:description", content: "Your saved PUREXDARK videos." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Favorites,
});

function Favorites() {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const { videos, favorites } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", search: { redirect: "/favorites", reason: "favorites" }, replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user) return null;
  const favs = videos.filter((v) => favorites.includes(v.id));

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 md:px-6">
      <h1 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold uppercase">
        <Heart className="h-6 w-6 text-primary" />{t("favorites")}
        <span className="text-sm font-normal text-muted-foreground">{favs.length}</span>
      </h1>
      {favs.length ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4 xl:grid-cols-5">{favs.map((v) => <VideoCard key={v.id} v={v} />)}</div>
      ) : (
        <div className="rounded-xl bg-surface p-10 text-center">
          <p className="text-sm text-muted-foreground">{t("favEmpty")}</p>
          <Link to="/" search={{ q: undefined, cat: undefined }} className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">{t("browse")}</Link>
        </div>
      )}
    </div>
  );
}
