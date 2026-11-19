import { useEffect, useState } from "react";
import logo from "@/assets/logo-skull.png.asset.json";
import { detectCollage } from "@/lib/collage-detect";

/**
 * Card previews never load third-party players.
 * Orientation is detected from the loaded image: landscape fills the card
 * (object-cover), portrait keeps its proportions centered on a pure black
 * background (object-contain). Multi-frame collages/contact sheets fill the
 * card width without any additional zoom so frames stay recognizable.
 */
export function Thumb({ src, alt, className = "" }: { src: string; embed: string; alt: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [collage, setCollage] = useState(false);
  const usable = Boolean(src) && failedSrc !== src;
  useEffect(() => {
    setCollage(false);
    if (!usable) return;
    let live = true;
    detectCollage(src).then((r) => { if (live) setCollage(r); });
    return () => { live = false; };
  }, [src, usable]);
  const fill = usable && (!portrait || collage);
  const fit = fill ? "object-cover" : "object-contain";
  const bg = fill ? "bg-surface-2" : "bg-black";
  return (
    <img
      src={usable ? src : logo.url}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onLoad={(e) => {
        const img = e.currentTarget;
        setPortrait(img.naturalHeight > img.naturalWidth);
      }}
      onError={() => { if (usable) setFailedSrc(src); }}
      className={`h-full w-full ${bg} ${fit} ${usable ? "" : "p-8"} ${className}`}
    />
  );
}
