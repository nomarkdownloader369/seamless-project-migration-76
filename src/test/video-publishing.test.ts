import { describe, expect, it } from "vitest";
import { confirmedInsert, publicationDescription, reviewError, publicationAllowed } from "@/lib/video-publishing";
const meta = { titleEn: "My video", titleAr: "", descriptionEn: "My caption", descriptionAr: "", category: "music", tags: ["live", "music show"] };
describe("publisher review and persistence", () => {
  it("requires individual approval for every video even in bulk publication", () => {
    expect(publicationAllowed([{ status: "approved", meta }, { status: "ready", meta }])).toBe(false);
    expect(publicationAllowed([{ status: "approved", meta }, { status: "approved", meta }])).toBe(true);
    expect(publicationAllowed([{ status: "ready", meta }])).toBe(false);
    expect(publicationAllowed([])).toBe(false);
  });
  it("invalidates approval when metadata becomes incomplete", () => { expect(publicationAllowed([{ status: "approved", meta: { ...meta, titleEn: "" } }])).toBe(false); });
  it("saves the caption and tags in the description", () => { expect(publicationDescription(meta)).toBe("My caption\n\n#live #music_show"); });
  it("requires a title for approval and publication", () => { expect(reviewError({ ...meta, titleEn: " " })).toBe("Add a title before publishing."); });
  it("requires a real category for approval and publication", () => { expect(reviewError({ ...meta, category: "all" })).toBe("Choose a category before publishing."); });
  it("never confirms publishing without returned records", () => { expect(confirmedInsert(["one"], null)).toBe(false); expect(confirmedInsert(["one"], [])).toBe(false); expect(confirmedInsert(["one"], [{ id: "other" }])).toBe(false); expect(confirmedInsert(["one"], [{ id: "one" }])).toBe(true); });
});
