/** Reads real duration and frame size from an MP4 "moov" box. Pure, so it can be unit-tested. */
export interface Mp4Info { durationSeconds: number | null; width: number | null; height: number | null }

interface Box { type: string; start: number; size: number; header: number }

export function readBox(view: DataView, offset: number): Box | null {
  if (offset + 8 > view.byteLength) return null;
  let size = view.getUint32(offset);
  const type = String.fromCharCode(view.getUint8(offset + 4), view.getUint8(offset + 5), view.getUint8(offset + 6), view.getUint8(offset + 7));
  let header = 8;
  if (size === 1) {
    if (offset + 16 > view.byteLength) return null;
    size = Number(view.getBigUint64(offset + 8));
    header = 16;
  }
  if (size < header) return null;
  return { type, start: offset, size, header };
}

function children(view: DataView, start: number, end: number): Box[] {
  const out: Box[] = [];
  let o = start;
  while (o < end) {
    const b = readBox(view, o);
    if (!b || b.start + b.size > end) break;
    out.push(b);
    o += b.size;
  }
  return out;
}

/** `view` must contain the whole moov box starting at byte 0. */
export function parseMoov(view: DataView): Mp4Info {
  const moov = readBox(view, 0);
  const info: Mp4Info = { durationSeconds: null, width: null, height: null };
  if (!moov || moov.type !== "moov") return info;
  for (const b of children(view, moov.header, Math.min(moov.size, view.byteLength))) {
    const p = b.start + b.header;
    if (b.type === "mvhd") {
      const v = view.getUint8(p);
      const scale = view.getUint32(p + (v === 1 ? 20 : 12));
      const dur = v === 1 ? Number(view.getBigUint64(p + 24)) : view.getUint32(p + 16);
      if (scale > 0 && dur > 0) info.durationSeconds = dur / scale;
    }
    if (b.type === "trak") {
      for (const t of children(view, p, b.start + b.size)) {
        if (t.type !== "tkhd") continue;
        const q = t.start + t.header;
        const v = view.getUint8(q);
        const wOff = q + (v === 1 ? 88 : 76);
        if (wOff + 8 > view.byteLength) continue;
        const w = view.getUint32(wOff) / 65536, h = view.getUint32(wOff + 4) / 65536;
        if (w > 0 && h > 0 && (!info.width || w * h > info.width * (info.height ?? 0))) { info.width = Math.round(w); info.height = Math.round(h); }
      }
    }
  }
  return info;
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

type RangeFetch = (start: number, end: number) => Promise<ArrayBuffer | null>;

/** Walks top-level boxes with HTTP range reads until it finds moov (front or end of file). */
export async function probeMp4(fetchRange: RangeFetch, maxMoov = 8_000_000): Promise<Mp4Info | null> {
  let offset = 0;
  for (let hop = 0; hop < 12; hop++) {
    const head = await fetchRange(offset, offset + 15);
    if (!head || head.byteLength < 8) return null;
    const box = readBox(new DataView(head), 0);
    if (!box) return null;
    if (box.type === "moov") {
      if (box.size > maxMoov) return null;
      const buf = await fetchRange(offset, offset + box.size - 1);
      return buf ? parseMoov(new DataView(buf)) : null;
    }
    offset += box.size;
  }
  return null;
}
