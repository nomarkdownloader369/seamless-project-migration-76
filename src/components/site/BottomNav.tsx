import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Heart, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BottomNav() {
  const { t } = useI18n();
  const cls = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold text-muted-foreground";
  const active = { className: "text-primary" };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t bg-background/95 backdrop-blur md:hidden">
      <Link to="/" search={{ q: undefined, cat: undefined }} activeOptions={{ exact: true, includeSearch: false }} activeProps={active} className={cls}><Home className="h-5 w-5" />{t("home")}</Link>
      <Link to="/categories" activeProps={active} className={cls}><LayoutGrid className="h-5 w-5" />{t("categories")}</Link>
      <Link to="/favorites" activeProps={active} className={cls}><Heart className="h-5 w-5" />{t("favorites")}</Link>
      <Link to="/profile" activeProps={active} className={cls}><User className="h-5 w-5" />{t("profile")}</Link>
    </nav>
  );
}
