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
});
