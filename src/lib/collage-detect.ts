/**
 * Detects multi-frame contact-sheet / grid thumbnails from pixel data.
 * A collage has straight seams (hard edges or uniform gutters) running the full
 * height or width at regular fractions (1/2, 1/3, 1/4...). Pure, for unit tests.
 */
export function detectGridSeams(px: Uint8ClampedArray, w: number, h: number): { cols: number; rows: number } {
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = 0.299 * px[i * 4]! + 0.587 * px[i * 4 + 1]! + 0.114 * px[i * 4 + 2]!;
  const at = (x: number, y: number) => lum[y * w + x]!;
  const seamAt = (pos: number, len: number, vertical: boolean) => {
    // Edge seam: big difference across the line for most of its length.
    let edge = 0, flat = 0;
    for (let t = 0; t < len; t++) {
      const a = vertical ? at(pos - 1, t) : at(t, pos - 1);
      const b = vertical ? at(pos, t) : at(t, pos);
      const c = vertical ? at(Math.min(pos + 1, w - 1), t) : at(t, Math.min(pos + 1, h - 1));
      if (Math.abs(a - b) > 24 || Math.abs(b - c) > 24) edge++;
      flat += b;
    }
    // Gutter seam: a near-uniform line (low variance along it) that differs from neighbours.
    const mean = flat / len;
    let varSum = 0;
    for (let t = 0; t < len; t++) { const b = vertical ? at(pos, t) : at(t, pos); varSum += (b - mean) ** 2; }
    const uniform = Math.sqrt(varSum / len) < 6;
    return edge / len > 0.72 || (uniform && edge / len > 0.3);
  };
  const count = (size: number, len: number, vertical: boolean) => {
    for (const n of [4, 3, 2]) {
      let hits = 0;
      for (let k = 1; k < n; k++) {
        const c = Math.round((size * k) / n);
        let ok = false;
        for (let d = -2; d <= 2 && !ok; d++) { const p = c + d; if (p > 1 && p < size - 1) ok = seamAt(p, len, vertical); }
        if (ok) hits++;
      }
      if (hits === n - 1) return n;
    }
    return 1;
  };
  return { cols: count(w, h, true), rows: count(h, w, false) };
}

export function isCollage(px: Uint8ClampedArray, w: number, h: number) {
  const { cols, rows } = detectGridSeams(px, w, h);
  // Require a real grid (both axes split) or a 3+ strip; a single split is too easy to fake.
  return (cols > 1 && rows > 1) || cols >= 3 || rows >= 3;
}

const cache = new Map<string, boolean>();

function analyse(url: string, cross: boolean): Promise<boolean | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (cross) img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      try {
        const w = 160, h = Math.max(16, Math.round((160 * img.naturalHeight) / img.naturalWidth));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(isCollage(ctx.getImageData(0, 0, w, h).data, w, h));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Browser-only. Reads pixels directly, or through the same-origin relay when the host blocks CORS. */
export async function detectCollage(src: string): Promise<boolean> {
  const hit = cache.get(src);
  if (hit !== undefined) return hit;
  let r = await analyse(src, true);
  if (r === null && /^https:\/\//.test(src)) r = await analyse(`/api/public/thumb-pixels?url=${encodeURIComponent(src)}`, false);
  cache.set(src, r ?? false);
  return r ?? false;
}
