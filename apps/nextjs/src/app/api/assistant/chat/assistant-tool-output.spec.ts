import { describe, expect, test } from "vitest";

import {
  assistantToolOutputMaxCharacters,
  customWidgetPreviewQueryOutputMaxCharacters,
  getAssistantToolOutputOptions,
  toAssistantToolOutput,
} from "./assistant-tool-output";

describe("assistant tool output", () => {
  test("preserves tool output within the configured context budget", () => {
    expect(toAssistantToolOutput({ ok: true, data: [{ id: 1 }] }, { maxCharacters: 8_000 })).toEqual({
      ok: true,
      data: [{ id: 1 }],
    });
  });

  test("keeps a complete persisted Custom Widget available for a follow-up edit", () => {
    expect(getAssistantToolOutputOptions("customWidget_get").maxCharacters).toBeGreaterThan(
      assistantToolOutputMaxCharacters,
    );
  });

  test("returns a bounded preview for oversized tool output", () => {
    const output = toAssistantToolOutput(
      {
        sessionId: "preview-1",
        requestId: "status",
        sourceId: "default",
        ok: true,
        status: 200,
        data: Array.from({ length: 1_000 }, (_, index) => ({ index, value: "x".repeat(100) })),
      },
      { maxCharacters: customWidgetPreviewQueryOutputMaxCharacters },
    );
    const serialized = JSON.stringify(output);

    expect(output).toEqual(
      expect.objectContaining({
        truncated: true,
        originalCharacters: expect.any(Number),
        sessionId: "preview-1",
        requestId: "status",
        sourceId: "default",
        preview: expect.stringContaining('"status":200'),
      }),
    );
    expect(serialized.length).toBeLessThanOrEqual(customWidgetPreviewQueryOutputMaxCharacters);
  });

  test("compacts oversized board discovery to the id and name metadata needed for placement", () => {
    const boards = Array.from({ length: 100 }, (_, index) => ({
      id: `board-${index}`,
      name: `Board ${index}`,
      logoImageUrl: `https://example.test/${"x".repeat(300)}`,
      creator: { id: `user-${index}`, email: `${"x".repeat(200)}@example.test` },
      userPermissions: Array.from({ length: 20 }, () => ({ permission: "modify" })),
    }));

    const output = toAssistantToolOutput(boards, getAssistantToolOutputOptions("board_getAllBoards"));
    const compactBoards = output as Array<{ id: string; name: string }>;

    expect(compactBoards).toHaveLength(boards.length);
    expect(compactBoards[0]).toEqual({ id: "board-0", name: "Board 0" });
    expect(JSON.stringify(output).length).toBeLessThanOrEqual(assistantToolOutputMaxCharacters);
  });

  test("returns a bounded board collection when compact id and name metadata still exceeds the limit", () => {
    const boards = Array.from({ length: 2_000 }, (_, index) => ({
      id: `board-${index}`,
      name: `Board ${index} ${"x".repeat(40)}`,
      logoImageUrl: null,
    }));

    const output = toAssistantToolOutput(boards, getAssistantToolOutputOptions("board_getAllBoards"));

    expect(output).toEqual(
      expect.objectContaining({
        truncated: true,
        totalItems: boards.length,
        boards: expect.arrayContaining([{ id: "board-0", name: expect.stringContaining("Board 0") }]),
      }),
    );
    expect((output as { boards: unknown[] }).boards.length).toBeLessThan(boards.length);
    expect(JSON.stringify(output).length).toBeLessThanOrEqual(assistantToolOutputMaxCharacters);
  });
});
