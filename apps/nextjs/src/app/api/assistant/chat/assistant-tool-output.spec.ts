import { describe, expect, test } from "vitest";

import { customWidgetPreviewQueryOutputMaxCharacters, toAssistantToolOutput } from "./assistant-tool-output";

describe("assistant tool output", () => {
  test("preserves tool output within the configured context budget", () => {
    expect(toAssistantToolOutput({ ok: true, data: [{ id: 1 }] }, { maxCharacters: 8_000 })).toEqual({
      ok: true,
      data: [{ id: 1 }],
    });
  });

  test("returns a bounded preview for oversized tool output", () => {
    const output = toAssistantToolOutput(
      { ok: true, status: 200, data: Array.from({ length: 1_000 }, (_, index) => ({ index, value: "x".repeat(100) })) },
      { maxCharacters: customWidgetPreviewQueryOutputMaxCharacters },
    );
    const serialized = JSON.stringify(output);

    expect(output).toEqual(
      expect.objectContaining({
        truncated: true,
        originalCharacters: expect.any(Number),
        preview: expect.stringContaining('"status":200'),
      }),
    );
    expect(serialized.length).toBeLessThanOrEqual(customWidgetPreviewQueryOutputMaxCharacters);
  });
});
