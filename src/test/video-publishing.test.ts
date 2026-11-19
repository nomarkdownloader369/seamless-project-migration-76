import { describe, expect, it } from "vitest";
import { confirmedInsert, publicationDescription, reviewError } from "@/lib/video-publishing";
const meta = { titleEn: "My video", titleAr: "", descriptionEn: "My caption", descriptionAr: "", category: "music", tags: ["live", "music show"] };
describe("publisher review and persistence", () => {
  it("saves the caption and tags in the description", () => { expect(publicationDescription(meta)).toBe("My caption\n\n#live #music_show"); });
  it("requires a title for approval and publication", () => { expect(reviewError({ ...meta, titleEn: " " })).toBe("Add a title before publishing."); });
  it("requires a real category for approval and publication", () => { expect(reviewError({ ...meta, category: "all" })).toBe("Choose a category before publishing."); });
  it("never confirms publishing without returned records", () => { expect(confirmedInsert(["one"], null)).toBe(false); expect(confirmedInsert(["one"], [])).toBe(false); expect(confirmedInsert(["one"], [{ id: "other" }])).toBe(false); expect(confirmedInsert(["one"], [{ id: "one" }])).toBe(true); });
});
