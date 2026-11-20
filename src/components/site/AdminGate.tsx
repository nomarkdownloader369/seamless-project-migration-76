import { useState } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShieldAlert, LayoutDashboard, Sparkles, Film, ArrowLeft, Loader2, MessageSquare, Menu, Flag, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/** UI gate only. Real enforcement happens in database rules and server functions. */
export function AdminShell() {
  const { user, ready } = useAuth();
  const { t, lang } = useI18n();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  if (!ready) return <div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user?.isAdmin)
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="panel p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 font-display text-xl font-bold uppercase">{lang === "ar" ? "للمسؤولين فقط" : "Admins only"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "ar" ? "سجل الدخول بحساب مسؤول لفتح لوحة التحكم." : "Sign in with an administrator account to open the control panel."}</p>
          <Button asChild className="mt-5"><Link to={user ? "/profile" : "/login"}>{user ? t("profile") : t("login")}</Link></Button>
        </div>
      </div>
    );
  const tabs = [
    { to: "/admin/reports", label: lang === "ar" ? "البلاغات" : "Reports", icon: Flag },
    { to: "/admin/messages", label: lang === "ar" ? "الرسائل والطلبات" : "Messages & Requests", icon: Mail },
    { to: "/admin", label: t("dashboard"), icon: LayoutDashboard },
    { to: "/admin/videos", label: t("manage"), icon: Film },
    { to: "/admin/publish", label: t("publish"), icon: Sparkles },
    { to: "/admin/assistant", label: lang === "ar" ? "المساعد الذكي" : "AI Assistant", icon: MessageSquare },
  ] as const;
  const here = loc.pathname.replace(/\/$/, "") || "/admin";
  const isActive = (to: string) => here === to || (to === "/admin/assistant" && here.startsWith(`${to}/`));
  const current = tabs.find((x) => isActive(x.to)) ?? tabs[2];
  const CurrentIcon = current.icon;
  return (
    <div className="mx-auto max-w-7xl px-3 pt-4 pb-24 md:px-6 md:pb-8">
      <div className="md:grid md:grid-cols-[220px_1fr] md:gap-6">
        <div className="mb-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2"><Menu className="h-4 w-4" /><CurrentIcon className="h-4 w-4" /><span className="truncate">{current.label}</span></Button>
            </SheetTrigger>
            <SheetContent side={lang === "ar" ? "right" : "left"} className="w-72 p-4">
              <SheetHeader className="p-0 pb-3"><SheetTitle className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">TABOOBOX · {lang === "ar" ? "لوحة التحكم" : "Control panel"}</SheetTitle></SheetHeader>
              <nav aria-label="Control panel" className="grid gap-1">
                {tabs.map(({ to, label, icon: I }) => (
                  <Button key={to} asChild variant={isActive(to) ? "default" : "ghost"} className="min-h-11 justify-start">
                    <Link to={to} onClick={() => setOpen(false)} aria-current={isActive(to) ? "page" : undefined}><I className="h-4 w-4" />{label}</Link>
                  </Button>
                ))}
              </nav>
              <Button asChild variant="ghost" size="sm" className="mt-3 w-full justify-start text-muted-foreground"><Link to="/profile" onClick={() => setOpen(false)}><ArrowLeft className="rtl:rotate-180" />{t("profile")}</Link></Button>
            </SheetContent>
          </Sheet>
        </div>
        <aside className="hidden md:block">
          <div className="panel sticky top-20 p-3">
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">TABOOBOX · {lang === "ar" ? "لوحة التحكم" : "Control panel"}</p>
            </div>
            <nav aria-label="Control panel" className="grid grid-cols-1 gap-1">
              {tabs.map(({ to, label, icon: I }) => (
                <Button key={to} asChild variant={isActive(to) ? "default" : "ghost"} className="h-auto min-h-11 justify-start gap-1 px-3 py-2 text-sm">
                  <Link to={to} aria-current={isActive(to) ? "page" : undefined}><I className="h-4 w-4" />{label}</Link>
                </Button>
              ))}
            </nav>
            <Button asChild variant="ghost" size="sm" className="mt-3 w-full justify-start text-muted-foreground"><Link to="/profile"><ArrowLeft className="rtl:rotate-180" />{t("profile")}</Link></Button>
          </div>
        </aside>
        <main className="min-w-0"><Outlet /></main>
      </div>
    </div>
  );
}
