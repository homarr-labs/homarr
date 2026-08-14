import { describe, expect, test } from "vitest";
import type { UIMessage } from "ai";

import { convertAssistantMessagesToModelMessages } from "./assistant-message-conversion";

describe("convertAssistantMessagesToModelMessages", () => {
  test("drops an interrupted tool call while preserving completed tool results", async () => {
    const messages: UIMessage[] = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Find Homarr icons." }],
      },
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "tool-icon_findIcons",
            toolCallId: "cancelled-call",
            state: "input-available",
            input: { searchText: "homarr" },
          },
          {
            type: "tool-board_getBoardSettings",
            toolCallId: "completed-call",
            state: "output-available",
            input: { id: "board-1" },
            output: { id: "board-1", name: "Home" },
          },
        ],
      },
      {
        id: "user-2",
        role: "user",
        parts: [{ type: "text", text: "Continue." }],
      },
    ];

    const result = await convertAssistantMessagesToModelMessages(messages);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("cancelled-call");
    expect(serialized).toContain("completed-call");
    expect(serialized).toContain('"name":"Home"');
    expect(result.at(-1)).toEqual({ role: "user", content: [{ type: "text", text: "Continue." }] });
  });

  test("compacts oversized custom widget preview query results from conversation history", async () => {
    const oversizedData = Array.from({ length: 1_000 }, (_, index) => ({
      id: index,
      title: `Result ${index}`,
      description: "x".repeat(100),
    }));
    const messages: UIMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_previewQuery",
            toolCallId: "preview-query-1",
            state: "output-available",
            input: { sessionId: "preview-1", requestId: "results", params: {} },
            output: { ok: true, status: 200, data: oversizedData },
          },
        ],
      },
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Continue building the widget." }],
      },
    ];

    const result = await convertAssistantMessagesToModelMessages(messages);
    const serialized = JSON.stringify(result);

    expect(serialized).toContain('"truncated":true');
    expect(serialized).toContain('"status":200');
    expect(serialized).toContain("Continue building the widget.");
    expect(serialized.length).toBeLessThan(10_000);
  });
});
