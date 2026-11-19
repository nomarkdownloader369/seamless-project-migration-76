import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudfamEmbedId, parseEmbeds, parseBulkEmbeds } from "@/lib/video-import";
import { extractCloudfamThumbnail, fetchCloudfamThumbnail } from "@/lib/cloudfam-thumbnail.server";

const id = "0a9a7339636a";
const thumbnail = "https://files.cloudfam.io/thumbnails/0a9a7339636a_thumb_1794889529.jpg";
afterEach(() => vi.unstubAllGlobals());

describe("Cloudfam imports", () => {
  it("extracts the supplied Cloudfam embed ID including multiline iframe codes", () => {
    const result = parseEmbeds(`<!-- "VID_20260723_003847_843.mp4" -->\n<iframe\n src="https://cloudfam.io/embed/${id}" title="video"\n allowfullscreen></iframe>`);
    expect(result).toEqual([{ embed: `https://cloudfam.io/embed/${id}`, thumbnail: "" }]);
    expect(cloudfamEmbedId(result[0]?.embed ?? "")).toBe(id);
  });
  it("fetches the real thumbnail from the embed ID instead of guessing the filename", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(`<meta content="${thumbnail}" property="og:image">`, { headers: { "content-type": "text/html" } }));
    vi.stubGlobal("fetch", fetcher);
    expect(await fetchCloudfamThumbnail(id)).toBe(thumbnail);
    expect(fetcher).toHaveBeenCalledWith(`https://cloudfam.io/embed/${id}`, expect.objectContaining({ redirect: "manual" }));
  });
  it("falls back to the player poster when social metadata is absent", () => {
    expect(extractCloudfamThumbnail(`<video poster='${thumbnail}'></video>`)).toBe(thumbnail);
  });
  it("retains YouTube thumbnails in mixed imports", () => {
    expect(parseEmbeds(`https://cloudfam.io/embed/${id}\nhttps://youtu.be/aqz-KE-bpKQ`)[1]?.thumbnail).toBe("https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg");
  });
  it("does not fetch arbitrary hosts or paths", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(cloudfamEmbedId(`https://cloudfam.io.evil.test/embed/${id}`)).toBeNull();
    expect(await fetchCloudfamThumbnail("../../private")).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("leaves missing thumbnails blank when the provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unavailable")));
    expect(await fetchCloudfamThumbnail(id)).toBeNull();
    expect(extractCloudfamThumbnail('<meta property="og:image" content="http://localhost/private">')).toBeNull();
  });
});
describe("mixed bulk embeds", () => {
  it("creates one separate entry per multiline iframe and direct URL", () => {
    expect(parseEmbeds(`<iframe\n src="https://cloudfam.io/embed/first"\n></iframe><iframe src='https://player.vimeo.com/video/123'></iframe> https://archive.org/embed/movie`)).toEqual([
      { embed: "https://cloudfam.io/embed/first", thumbnail: "" }, { embed: "https://player.vimeo.com/video/123", thumbnail: "" }, { embed: "https://archive.org/embed/movie", thumbnail: "" },
    ]);
  });
  it("rejects duplicates within the paste and existing archive", () => {
    const result = parseBulkEmbeds(`https://youtu.be/aqz-KE-bpKQ\n<iframe src="https://www.youtube.com/embed/aqz-KE-bpKQ"></iframe>\nhttps://cloudfam.io/embed/first`, ["https://cloudfam.io/embed/first"]);
    expect(result.entries).toHaveLength(1); expect(result.errors.map((e) => e.reason)).toEqual(["Duplicate video", "Duplicate video"]);
  });
  it("rejects unsafe iframe sources and incomplete iframe HTML", () => {
    const result = parseBulkEmbeds(`<iframe src="javascript:alert(1)"></iframe><iframe src="https://cloudfam.io/embed/first">`);
    expect(result.entries).toEqual([]); expect(result.errors).toHaveLength(2);
  });
  it("extracts only src and decodes HTML entities without executing content", () => {
    expect(parseEmbeds(`<iframe title="https://wrong.example/video" src="https://player.example/embed/1?a=1&amp;b=2" onclick="evil()"></iframe>`)).toEqual([{ embed: "https://player.example/embed/1?a=1&b=2", thumbnail: "" }]);
  });
  it("keeps independent URLs separated even on one line", () => { expect(parseEmbeds("https://cloudfam.io/embed/first https://cloudfam.io/embed/second")).toHaveLength(2); });
});
