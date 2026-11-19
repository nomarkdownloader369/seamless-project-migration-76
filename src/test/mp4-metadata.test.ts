import { describe, expect, it } from "vitest";
import { formatDuration, parseMoov, probeMp4 } from "@/lib/mp4-metadata";

function box(type: string, body: Uint8Array) {
  const b = new Uint8Array(8 + body.length); const v = new DataView(b.buffer);
  v.setUint32(0, b.length); for (let i = 0; i < 4; i++) b[4 + i] = type.charCodeAt(i); b.set(body, 8); return b;
}
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };
function moov(seconds: number, w: number, h: number) {
  const mvhd = new Uint8Array(100); const mv = new DataView(mvhd.buffer); mv.setUint32(12, 1000); mv.setUint32(16, seconds * 1000);
  const tkhd = new Uint8Array(84); const tk = new DataView(tkhd.buffer); tk.setUint32(76, w * 65536); tk.setUint32(80, h * 65536);
  return box("moov", cat(box("mvhd", mvhd), box("trak", box("tkhd", tkhd))));
}

describe("MP4 metadata", () => {
  it("reads the real duration and frame size", () => {
    const m = moov(754, 1920, 1080);
    expect(parseMoov(new DataView(m.buffer))).toEqual({ durationSeconds: 754, width: 1920, height: 1080 });
  });
  it("finds moov at the end of the file via range reads", async () => {
    const file = cat(box("ftyp", new Uint8Array(8)), box("mdat", new Uint8Array(5000)), moov(3725, 1280, 720));
    const info = await probeMp4(async (s, e) => file.slice(s, e + 1).buffer);
    expect(formatDuration(info?.durationSeconds)).toBe("1:02:05");
    expect(info?.height).toBe(720);
  });
  it("formats short durations as m:ss", () => expect(formatDuration(65)).toBe("1:05"));
});
