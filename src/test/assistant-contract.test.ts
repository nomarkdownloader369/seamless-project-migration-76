import { describe, it, expect } from "vitest";
import { assistantCapabilities, assistantClearInput } from "../lib/assistant-contract";
describe("assistant operation safety", () => {
  it("requires explicit confirmation to clear a conversation", () => {
    const threadId = "8ed103d8-b420-4f2b-9d13-04bf4434e700";
    expect(assistantClearInput.safeParse({ threadId }).success).toBe(false);
    expect(assistantClearInput.safeParse({ threadId, confirmed: false }).success).toBe(false);
    expect(assistantClearInput.safeParse({ threadId, confirmed: true }).success).toBe(true);
  });
  it("requires confirmation for publishing", () => {
    expect(assistantCapabilities.find((c) => c.id === "publish")?.permission).toBe("confirm");
  });
  it("requires confirmation for homepage and category changes", () => {
    expect(assistantCapabilities.find((c) => c.id === "content")?.permission).toBe("confirm");
  });
});