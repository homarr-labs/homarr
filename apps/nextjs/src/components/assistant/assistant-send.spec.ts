import { describe, expect, test, vi } from "vitest";

import { sendAssistantPrompt } from "./assistant-send";

describe("sendAssistantPrompt", () => {
  test("appends a trimmed user prompt and explicitly starts a run", () => {
    const append = vi.fn();
    const runtime = {
      composer: () => ({ getState: () => ({ runConfig: { custom: { source: "spotlight" } } }) }),
      thread: () => ({ append }),
    };

    expect(sendAssistantPrompt(runtime, "  Check my services  ")).toBe(true);
    expect(append).toHaveBeenCalledWith({
      role: "user",
      content: [{ type: "text", text: "Check my services" }],
      runConfig: { custom: { source: "spotlight" } },
      startRun: true,
    });
  });

  test("ignores empty prompts without touching the runtime", () => {
    const runtime = {
      composer: vi.fn(),
      thread: vi.fn(),
    };

    expect(sendAssistantPrompt(runtime, "   ")).toBe(false);
    expect(runtime.composer).not.toHaveBeenCalled();
    expect(runtime.thread).not.toHaveBeenCalled();
  });
});
