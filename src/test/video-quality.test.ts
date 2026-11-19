import { describe, it, expect } from "vitest";
import { qualityFromHeight, detectVideoQuality } from "@/lib/video-quality";
import { qualityLabel, SAMPLE_VIDEOS } from "@/lib/videos";

describe("video quality", () => {
  it("maps verified heights to tiers", () => {
    expect(qualityFromHeight(1080)).toBe("1080p");
    expect(qualityFromHeight(2160)).toBe("2160p");
    expect(qualityFromHeight(800)).toBe("720p");
  });
  it("leaves unverifiable quality unknown", async () => {
    expect(qualityFromHeight(undefined)).toBeNull();
    expect(qualityFromHeight(360)).toBeNull();
    expect((await detectVideoQuality({ embedUrl: "https://www.youtube.com/embed/x" })).quality).toBeNull();
  });
  it("shows 4K for 2160p and no badge when unknown", () => {
    expect(qualityLabel("2160p")).toBe("4K");
    expect(qualityLabel(null)).toBeNull();
  });
  it("does not invent quality for sample videos", () => {
    expect(SAMPLE_VIDEOS.every((v) => v.quality == null)).toBe(true);
  });
});
