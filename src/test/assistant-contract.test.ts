import { describe, it, expect } from "vitest";
import { assistantCapabilities, assistantClearInput, assistantThreadAction, assistantTaskInput, assistantAutomationInput, canExecuteTask, taskStatuses } from "../lib/assistant-contract";
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
  it("requires confirmation to rename or delete a saved conversation", () => {
    for (const action of ["rename", "delete"]) expect(assistantThreadAction.safeParse({ threadId: "8ed103d8-b420-4f2b-9d13-04bf4434e700", action, title: "History", confirmed: false }).success).toBe(false);
    expect(assistantThreadAction.safeParse({ threadId: "8ed103d8-b420-4f2b-9d13-04bf4434e700", action: "rename", title: " ", confirmed: true }).success).toBe(false);
  });
  it("records task plans only after confirmation", () => {
    const task = { id: "8ed103d8-b420-4f2b-9d13-04bf4434e700", command: "Discover videos", kind: "plan" };
    expect(assistantTaskInput.safeParse(task).success).toBe(false);
    expect(assistantTaskInput.safeParse({ ...task, confirmed: true }).success).toBe(true);
  });
  it("cannot execute a plan as a real action", () => { expect(canExecuteTask("plan")).toBe(false); expect(canExecuteTask("catalog_audit")).toBe(true); });
  it("provides the four required task statuses", () => { expect(taskStatuses).toEqual(["pending", "running", "completed", "failed"]); });
  it("refuses active automation without an executor", () => {
    const schedule = { id: "8ed103d8-b420-4f2b-9d13-04bf4434e700", name: "Discovery", command: "Discover videos", scheduledAt: "2027-01-01T12:00:00Z", recurrence: "daily", confirmed: true };
    expect(assistantAutomationInput.safeParse({ ...schedule, enabled: true }).success).toBe(false);
    expect(assistantAutomationInput.safeParse({ ...schedule, enabled: false }).success).toBe(true);
  });
});