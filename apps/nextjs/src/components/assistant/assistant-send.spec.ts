import { describe, expect, test, vi } from "vitest";

import { sendAssistantPrompt } from "./assistant-send";

describe("sendAssistantPrompt", () => {
  test("uses the composer lifecycle so programmatic prompts start a run", () => {
    const calls: string[] = [];
    const composer = {
      setText: vi.fn((text: string) => calls.push(`set:${text}`)),
      send: vi.fn(() => calls.push("send")),
    };

    expect(sendAssistantPrompt(composer, "  Check my services  ")).toBe(true);
    expect(calls).toEqual(["set:Check my services", "send"]);
  });

  test("ignores empty prompts", () => {
    const composer = { setText: vi.fn(), send: vi.fn() };

    expect(sendAssistantPrompt(composer, "   ")).toBe(false);
    expect(composer.setText).not.toHaveBeenCalled();
    expect(composer.send).not.toHaveBeenCalled();
  });
});
