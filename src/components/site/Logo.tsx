import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo-skull.png.asset.json";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const img = size === "lg" ? "h-16 w-16" : "h-10 w-10 md:h-11 md:w-11";
  const txt = size === "lg" ? "text-3xl" : "text-xl md:text-2xl";
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="PUREXDARK home">
      <img src={logo.url} alt="" width={816} height={816} className={`${img} object-contain`} />
      <span dir="ltr" className={`font-display font-bold tracking-wide ${txt}`}>
        PURE<span className="text-primary">X</span>DARK
      </span>
    </Link>
  );
}
