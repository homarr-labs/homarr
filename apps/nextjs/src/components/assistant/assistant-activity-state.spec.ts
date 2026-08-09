import { describe, expect, test } from "vitest";

import { getAssistantActivityState, getRunningAssistantPartType } from "./assistant-activity-state";

describe("getAssistantActivityState", () => {
  test("does not treat output from the previous completed response as current streaming", () => {
    expect(getRunningAssistantPartType("complete", "text")).toBeUndefined();
    expect(getRunningAssistantPartType("running", "text")).toBe("text");
  });

  test("distinguishes thinking from a response that is already streaming", () => {
    expect(
      getAssistantActivityState({ isRunning: true, latestPartType: undefined, needsApproval: false, failed: false }),
    ).toBe("thinking");
    expect(
      getAssistantActivityState({ isRunning: true, latestPartType: "reasoning", needsApproval: false, failed: false }),
    ).toBe("thinking");
    expect(
      getAssistantActivityState({ isRunning: true, latestPartType: "text", needsApproval: false, failed: false }),
    ).toBe("streaming");
  });

  test("shows a waiting pattern while a tool is running", () => {
    expect(
      getAssistantActivityState({ isRunning: true, latestPartType: "tool-call", needsApproval: false, failed: false }),
    ).toBe("waiting");
  });

  test("maps settled states to waiting, failure, and success glyphs", () => {
    expect(
      getAssistantActivityState({ isRunning: false, latestPartType: "text", needsApproval: true, failed: false }),
    ).toBe("waiting");
    expect(
      getAssistantActivityState({ isRunning: false, latestPartType: "text", needsApproval: false, failed: true }),
    ).toBe("error");
    expect(
      getAssistantActivityState({ isRunning: false, latestPartType: "text", needsApproval: false, failed: false }),
    ).toBe("success");
  });

  test("keeps a required action visible even if the last run also failed", () => {
    expect(
      getAssistantActivityState({ isRunning: false, latestPartType: "text", needsApproval: true, failed: true }),
    ).toBe("waiting");
  });
});
