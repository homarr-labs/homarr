import { describe, expect, test } from "vitest";

import { createAssistantAutoApprovalTracker } from "./assistant-auto-approval";

describe("assistant automatic approval tracker", () => {
  test("claims a tool call only once across duplicate conversation renderers", () => {
    const tracker = createAssistantAutoApprovalTracker();

    expect(tracker.claim("app-create-1")).toBe(true);
    expect(tracker.claim("app-create-1")).toBe(false);
    expect(tracker.claim("board-save-1")).toBe(true);
  });

  test("can retry a failed response and clears claims for another conversation", () => {
    const tracker = createAssistantAutoApprovalTracker();

    expect(tracker.claim("app-create-1")).toBe(true);
    tracker.release("app-create-1");
    expect(tracker.claim("app-create-1")).toBe(true);

    tracker.clear();
    expect(tracker.claim("app-create-1")).toBe(true);
  });
});
