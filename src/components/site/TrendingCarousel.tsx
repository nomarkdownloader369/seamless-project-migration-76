import { Button } from "@/components/ui/button";
import { Thumb } from "./Thumb";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Eye, Flame } from "lucide-react";
import { formatViews, type Video } from "@/lib/videos";
import { useI18n } from "@/lib/i18n";

export function TrendingCarousel({ videos }: { videos: Video[] }) {
  const { t, lang } = useI18n();
  const [ref, api] = useEmblaCarousel({ loop: true, align: "start", direction: lang === "ar" ? "rtl" : "ltr" });
  const prev = useCallback(() => api?.scrollPrev(), [api]);
  const next = useCallback(() => api?.scrollNext(), [api]);
  useEffect(() => {
    if (!api) return;
    const id = setInterval(() => api.scrollNext(), 4500);
    return () => clearInterval(id);
  }, [api]);
  return (
    <section className="pt-1">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide">{t("trending")}<Flame aria-hidden className="h-5 w-5 text-primary" /></h2>
        <div className="flex gap-1.5">
          <Button variant="secondary" size="icon" onClick={lang === "ar" ? next : prev} aria-label={t("prev")} className="rounded-full bg-surface-2 p-2 hover:bg-primary"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="secondary" size="icon" onClick={lang === "ar" ? prev : next} aria-label={t("next")} className="rounded-full bg-surface-2 p-2 hover:bg-primary"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div ref={ref} className="overflow-hidden" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="-ms-3 flex">
          {videos.map((v, i) => (
            <div key={v.id} className="min-w-0 shrink-0 basis-[82%] ps-3 sm:basis-1/2 lg:basis-1/3">
              <Link to="/watch/$id" params={{ id: v.id }} className="group relative block aspect-video overflow-hidden bg-surface-2 rounded-lg">
                <Thumb src={v.thumbnail.replace("640/360", "960/540")} embed={v.embedUrl} alt={v.title} />
                <div className="thumb-fade absolute inset-0" />
                <span className="absolute top-2 start-2 rounded bg-primary px-2 py-0.5 font-display text-xs leading-5 font-bold text-primary-foreground">#{i + 1}</span>
                <span className="absolute top-2 end-2 flex size-7 items-center justify-center rounded bg-overlay text-primary" aria-label={t("trending")}><Flame className="size-4" /></span>
                <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
                  <h3 className="line-clamp-1 text-base font-bold">{lang === "ar" ? v.titleAr : v.title}</h3>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3 w-3" />{formatViews(v.views)} {t("views")}{v.duration && v.duration !== "0:00" && <><span aria-hidden>·</span><span dir="ltr">{v.duration}</span></>}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
