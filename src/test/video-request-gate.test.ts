import { describe, expect, it } from "vitest";
import { createRequestGate } from "@/lib/video-request-gate";

describe("catalog response ordering", () => {
  it("rejects reads started during an upload until it is permanently saved", () => {
    const gate = createRequestGate();
    gate.startWrite();
    const read = gate.begin();
    expect(gate.isCurrent(read)).toBe(false);
    gate.finishWrite();
    expect(gate.isCurrent(read)).toBe(false);
    expect(gate.isCurrent(gate.begin())).toBe(true);
  });
  it("rejects an old homepage response after an upload is saved", () => {
    const gate = createRequestGate();
    const oldRead = gate.begin();
    gate.invalidate();
    expect(gate.isCurrent(oldRead)).toBe(false);
  });
  it("accepts only the most recent overlapping catalog read", () => {
    const gate = createRequestGate();
    const first = gate.begin();
    const second = gate.begin();
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });
});