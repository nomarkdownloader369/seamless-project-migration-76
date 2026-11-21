import { describe, expect, it } from "vitest";
import { reportSchema, conversationSchema, guestTokenSchema, adminActionSchema, guestMessageSchema } from "../lib/support-contract";
const token = "a".repeat(64);
describe("visitor support rules", () => {
  it("rejects empty report reasons", () => { expect(reportSchema.safeParse({ token, videoId: "real-video", reason: "  " }).success).toBe(false); });
  it("binds reports to a video ID", () => { expect(reportSchema.safeParse({ token, videoId: "", reason: "Broken playback" }).success).toBe(false); });
  it("requires confirmation before deleting a video", () => { expect(adminActionSchema.safeParse({ id: "123e4567-e89b-12d3-a456-426614174000", action: "delete", confirmed: false }).success).toBe(false); expect(adminActionSchema.safeParse({ id: "123e4567-e89b-12d3-a456-426614174000", action: "delete", confirmed: true }).success).toBe(true); });
  it("rejects guessable guest references", () => { expect(guestTokenSchema.safeParse("guest123").success).toBe(false); expect(guestTokenSchema.safeParse(token).success).toBe(true); });
  it("rejects empty contact messages", () => { expect(conversationSchema.safeParse({ token, name: "Visitor", subject: "Second part", kind: "part", text: " " }).success).toBe(false); });
  it("rejects empty follow-up messages", () => { expect(guestMessageSchema.safeParse({ token, id: "123e4567-e89b-12d3-a456-426614174000", text: " " }).success).toBe(false); });
  it("rejects honeypot submissions", () => { expect(reportSchema.safeParse({ token, videoId: "video", reason: "Broken", website: "spam" }).success).toBe(false); });
});