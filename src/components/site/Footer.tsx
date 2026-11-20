import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t, lang } = useI18n();
  return (
    <footer className="mt-10 border-t bg-surface pb-20 md:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-6 md:flex-row md:justify-between">
        <Logo />
        <Link to="/contact" className="text-sm hover:text-primary">{lang === "ar" ? "تواصل مع الإدارة / طلب فيديو" : "Contact Admin / Video Requests"}</Link>
        <p className="text-xs text-muted-foreground">© 2026 TABOOBOX. {t("rights")}</p>
      </div>
    </footer>
  );
}
