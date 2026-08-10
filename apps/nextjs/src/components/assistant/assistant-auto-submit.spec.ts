import { describe, expect, test } from "vitest";
import type { UIMessage } from "ai";

import { shouldAutomaticallyContinueAssistant } from "./assistant-auto-submit";

const messagesWithToolPart = (part: UIMessage["parts"][number]): UIMessage[] => [
  {
    id: "assistant-message",
    role: "assistant",
    parts: [{ type: "step-start" }, part],
  },
];

describe("shouldAutomaticallyContinueAssistant", () => {
  test("continues after a human or frontend tool supplies its result", () => {
    expect(
      shouldAutomaticallyContinueAssistant({
        messages: messagesWithToolPart({
          type: "dynamic-tool",
          toolName: "ask_user",
          toolCallId: "ask-1",
          input: { question: "Continue?" },
          state: "output-available",
          output: { answer: "Yes" },
        }),
      }),
    ).toBe(true);
  });

  test("continues after a mutation approval response", () => {
    expect(
      shouldAutomaticallyContinueAssistant({
        messages: messagesWithToolPart({
          type: "dynamic-tool",
          toolName: "app_create",
          toolCallId: "create-1",
          input: { name: "YouTube" },
          state: "approval-responded",
          approval: { id: "approval-1", approved: true },
        }),
      }),
    ).toBe(true);
  });

  test("waits while a human tool has no result", () => {
    expect(
      shouldAutomaticallyContinueAssistant({
        messages: messagesWithToolPart({
          type: "dynamic-tool",
          toolName: "ask_user",
          toolCallId: "ask-1",
          input: { question: "Continue?" },
          state: "input-available",
        }),
      }),
    ).toBe(false);
  });

  test("continues a completed browser-tool step without treating an earlier agent step as user input", () => {
    expect(
      shouldAutomaticallyContinueAssistant({
        messages: [
          {
            id: "assistant-message",
            role: "assistant",
            parts: [
              { type: "step-start" },
              {
                type: "dynamic-tool",
                toolName: "icon_findIcons",
                toolCallId: "icon-1",
                input: { searchText: "homarr" },
                state: "input-available",
              },
              { type: "step-start" },
              {
                type: "dynamic-tool",
                toolName: "refresh_current_view",
                toolCallId: "refresh-1",
                input: {},
                state: "output-available",
                output: { success: true },
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });
});
