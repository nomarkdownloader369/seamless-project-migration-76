import { Link, useNavigate } from "@tanstack/react-router";
import { Search, User, Menu, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { useI18n } from "@/lib/i18n";

export function Header() {
  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/", search: { q: q || undefined, cat: undefined } });
    setSearchOpen(false);
  };
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-1.5 px-3 md:gap-3 md:h-16 md:px-6">
        <Button variant="ghost" className="md:hidden p-1.5" onClick={() => setMenuOpen((o) => !o)} aria-label={lang === "ar" ? "القائمة" : "Menu"}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <Logo />
        <nav className="ms-6 hidden items-center gap-5 text-sm font-semibold uppercase tracking-wide md:flex">
          <Link to="/" search={{ q: undefined, cat: undefined }} className="hover:text-primary" activeOptions={{ exact: true }}>{t("home")}</Link>
          <Link to="/categories" className="text-muted-foreground hover:text-primary" activeProps={{ className: "text-primary" }}>{t("categories")}</Link>
          <Link to="/favorites" className="text-muted-foreground hover:text-primary" activeProps={{ className: "text-primary" }}>{t("favorites")}</Link>
        </nav>
        <form onSubmit={submit} className="ms-auto hidden w-64 items-center rounded-full bg-surface-2 px-3 lg:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-9 w-full bg-transparent px-2 text-sm outline-none" />
        </form>
        <div className="ms-auto flex items-center gap-0 lg:ms-2">
          <Button asChild variant="ghost" size="icon" title={lang === "ar" ? "تواصل / طلب فيديو" : "Contact / Requests"}><Link to="/contact" aria-label={lang === "ar" ? "تواصل / طلب فيديو" : "Contact / Requests"}><MessageSquare /></Link></Button>
          <Button variant="ghost" className="p-2 lg:hidden" onClick={() => setSearchOpen((o) => !o)} aria-label={t("search")}><Search className="h-5 w-5" /></Button>
          <Button variant="ghost" onClick={() => setLang(lang === "en" ? "ar" : "en")} className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-bold hover:bg-surface-2" aria-label={t("language")}>
            <Globe className="h-4 w-4" />{lang === "en" ? "عربي" : "EN"}
          </Button>
          <Link to={user ? "/profile" : "/login"} className="rounded-full p-2 hover:bg-surface-2" aria-label={user ? t("profile") : t("login")}><User className="h-5 w-5" /></Link>
        </div>
      </div>
      {searchOpen && (
        <form onSubmit={submit} className="flex items-center gap-2 border-t px-3 py-2 lg:hidden">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-9 w-full bg-transparent text-sm outline-none" />
        </form>
      )}
      {menuOpen && (
        <nav className="grid grid-cols-2 gap-1 border-t p-3 md:hidden">
          {([["/", t("home")], ["/categories", t("categories")], ["/favorites", t("favorites")], [user ? "/profile" : "/login", user ? t("profile") : t("login")], ["/contact", lang === "ar" ? "تواصل / طلب فيديو" : "Contact / Requests"]] as const).map(([to, label]) => (
            <Link key={to} onClick={() => setMenuOpen(false)} to={to} className="rounded-md bg-surface px-3 py-3 text-sm font-semibold">{label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
