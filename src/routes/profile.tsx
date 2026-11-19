import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Sparkles, Film, LogOut, Heart, ShieldCheck, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { DashboardStats } from "@/components/site/DashboardStats";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "Profile — PUREXDARK" }, { name: "description", content: "Your PUREXDARK profile, favorites and settings." },
    { property: "og:title", content: "Profile — PUREXDARK" }, { property: "og:description", content: "Your PUREXDARK profile, favorites and settings." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Profile,
});

function Profile() {
  const { user, ready, signOut } = useAuth();
  const { t } = useI18n();
  const { videos, favorites } = useStore();
  const navigate = useNavigate();
  const favs = videos.filter((v) => favorites.includes(v.id));
  if (!ready) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-4 md:px-6">
      <section className="flex items-center gap-4 rounded-xl border bg-surface p-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground">
          {(user?.name ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-lg font-bold"><span className="truncate">{user?.name ?? t("guest")}</span>
            {user?.isAdmin && <span className="flex shrink-0 items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground"><ShieldCheck className="h-3 w-3" />Admin</span>}
          </h1>
          <p className="truncate text-sm text-muted-foreground" dir="ltr">{user?.email ?? t("notSignedIn")}</p>
        </div>
        {user ? (
          <button onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-sm font-semibold hover:bg-accent">
            <LogOut className="h-4 w-4 rtl:rotate-180" /><span className="hidden sm:inline">{t("logout")}</span>
          </button>
        ) : (
          <Link to="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{t("login")}</Link>
        )}
      </section>

      {user?.isAdmin && (
        <section className="space-y-3 rounded-xl border border-primary/40 bg-surface p-4">
          <h2 className="font-display text-lg font-bold uppercase">{t("adminTools")}</h2>
          <DashboardStats />
          <div className="grid gap-2 sm:grid-cols-3">
            {([["/admin", t("dashboard"), LayoutDashboard], ["/admin/publish", t("publish"), Sparkles], ["/admin/videos", t("manage"), Film]] as const).map(([to, label, I]) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-lg bg-surface-2 p-3 font-semibold hover:bg-accent">
                <I className="h-5 w-5 text-primary" /><span className="flex-1 text-sm">{label}</span><ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {user && (
        <Link to="/favorites" className="flex items-center gap-3 rounded-xl border bg-surface p-4 font-semibold hover:bg-accent">
          <Heart className="h-5 w-5 text-primary" /><span className="flex-1">{t("favorites")}</span><span className="text-sm text-muted-foreground">{favs.length}</span><ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      )}

    </div>
  );
}
