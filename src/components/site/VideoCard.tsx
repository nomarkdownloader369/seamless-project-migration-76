import { Link } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { CATEGORIES, formatViews, qualityLabel, type Video } from "@/lib/videos";
import { Thumb } from "./Thumb";
import { useI18n } from "@/lib/i18n";

export function VideoCard({ v }: { v: Video }) {
  const { lang, t } = useI18n();
  const cat = CATEGORIES.find((c) => c.id === v.category) ?? CATEGORIES[0];
  const q = qualityLabel(v.quality);
  return (
    <Link to="/watch/$id" params={{ id: v.id }} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-md bg-surface-2">
        <Thumb src={v.thumbnail} embed={v.embedUrl} alt={v.title} />
        {v.duration && v.duration !== "0:00" && <span className="absolute bottom-1.5 end-1.5 rounded bg-overlay px-1.5 py-0.5 text-[11px] font-bold">{v.duration}</span>}
        {q && <span className="absolute top-1.5 start-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">{q}</span>}
      </div>
      <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">{lang === "ar" ? v.titleAr : v.title}</h3>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><span className="font-semibold text-primary">{cat[lang]}</span><span aria-hidden="true">·</span><Eye className="h-3 w-3" />{formatViews(v.views)} {t("views")}</p>
    </Link>
  );
}
