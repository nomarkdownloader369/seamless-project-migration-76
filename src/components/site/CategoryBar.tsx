import { Link } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/videos";
import { useI18n } from "@/lib/i18n";

/** "All" stays pinned at the starting edge; only the remaining chips auto-scroll (pauses on hover/touch). */
export function CategoryBar({ active }: { active?: string | undefined }) {
  const { lang } = useI18n();
  const all = CATEGORIES.find((c) => c.id === "all");
  const rest = CATEGORIES.filter((c) => c.id !== "all");
  const items = [...rest, ...rest];
  const chip = (on: boolean) =>
    `shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground hover:bg-accent"}`;
  const current = active ?? "all";
  return (
    <nav aria-label="Categories" className="-mx-3 flex items-center gap-2 py-2 ps-3 md:-mx-6 md:ps-6">
      {all && (
        <Link to="/" search={{ cat: undefined, q: undefined }} className={`relative z-10 ${chip(current === "all")}`}>
          {all[lang]}
        </Link>
      )}
      <div className="marquee-mask min-w-0 flex-1 overflow-hidden">
        <div className="animate-marquee flex w-max gap-2 px-2 hover:[animation-play-state:paused] active:[animation-play-state:paused]">
          {items.map((c, i) => (
            <Link key={`${c.id}-${i}`} to="/" search={{ cat: c.id, q: undefined }}
              aria-hidden={i >= rest.length ? true : undefined} tabIndex={i >= rest.length ? -1 : undefined}
              className={chip(current === c.id)}>
              {c[lang]}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
