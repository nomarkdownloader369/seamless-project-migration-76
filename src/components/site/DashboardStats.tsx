import { Film, CheckCircle2, Clock, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { formatViews } from "@/lib/videos";

export function DashboardStats() {
  const { lang } = useI18n(); const ar = lang === "ar";
  const { videos } = useStore();
  const stats = [
    { label: ar ? "إجمالي الفيديوهات" : "Total videos", value: videos.length, icon: Film },
    { label: ar ? "منشور" : "Published", value: videos.filter((v) => v.status === "published").length, icon: CheckCircle2 },
    { label: ar ? "قيد الانتظار" : "Pending", value: videos.filter((v) => v.status === "pending").length, icon: Clock },
    { label: ar ? "إجمالي المشاهدات" : "Total views", value: formatViews(videos.reduce((s, v) => s + v.views, 0)), icon: Eye },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ label, value, icon: I }) => (
        <div key={label} className="panel p-4">
          <div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><span className="rounded-lg bg-primary/15 p-1.5"><I className="h-4 w-4 text-primary" /></span></div>
          <p className="mt-2 font-display text-3xl font-bold">{value}</p>
        </div>
      ))}
    </div>
  );
}
