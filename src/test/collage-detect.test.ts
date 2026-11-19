import { describe, it, expect } from "vitest";
import { isCollage } from "@/lib/collage-detect";

function img(w: number, h: number, f: (x: number, y: number) => number) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y), i = (y * w + x) * 4; px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255; }
  return px;
}
describe("collage detection", () => {
  it("detects a 3x3 contact sheet", () => {
    const w = 90, h = 160;
    const px = img(w, h, (x, y) => ((Math.floor(x / 30) + Math.floor(y / 53.4) * 3) % 2 ? 40 : 200) + ((x * 7 + y * 3) % 10));
    expect(isCollage(px, w, h)).toBe(true);
  });
  it("does not flag a normal portrait photo", () => {
    const w = 90, h = 160;
    const px = img(w, h, (x, y) => Math.round(80 + 60 * Math.sin(x / 9) + y / 3));
    expect(isCollage(px, w, h)).toBe(false);
  });
});
