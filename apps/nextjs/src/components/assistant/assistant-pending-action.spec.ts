import { describe, expect, test } from "vitest";
import type { ThreadMessage } from "@assistant-ui/react";

import { getPendingAssistantAction } from "./assistant-pending-action";

const assistantMessage = (...content: ThreadMessage["content"]): ThreadMessage =>
  ({
    id: "assistant-message",
    role: "assistant",
    content,
    status: { type: "requires-action", reason: "tool-calls" },
    createdAt: new Date(),
    metadata: { custom: {} },
  }) as ThreadMessage;

describe("getPendingAssistantAction", () => {
  test("exposes an unanswered structured question", () => {
    expect(
      getPendingAssistantAction(
        assistantMessage({
          type: "tool-call",
          toolCallId: "ask-1",
          toolName: "ask_user",
          args: { question: "Which board should receive the widget?" },
          argsText: "{}",
        }),
      ),
    ).toEqual({
      kind: "question",
      toolName: "ask_user",
      detail: "Which board should receive the widget?",
    });
  });

  test("clears a human action after its result is supplied", () => {
    expect(
      getPendingAssistantAction(
        assistantMessage({
          type: "tool-call",
          toolCallId: "ask-1",
          toolName: "ask_user",
          args: { question: "Continue?" },
          argsText: "{}",
          result: { answer: "Yes" },
        }),
      ),
    ).toBeUndefined();
  });

  test("exposes the app form while its details still need review", () => {
    expect(
      getPendingAssistantAction(
        assistantMessage({
          type: "tool-call",
          toolCallId: "configure-1",
          toolName: "configure_app",
          args: { name: "Wikipedia" },
          argsText: "{}",
        }),
      ),
    ).toEqual({ kind: "form", toolName: "configure_app", detail: "Wikipedia" });
  });

  test("exposes an unresolved mutation approval", () => {
    expect(
      getPendingAssistantAction(
        assistantMessage({
          type: "tool-call",
          toolCallId: "create-1",
          toolName: "app_create",
          args: { name: "Wikipedia" },
          argsText: "{}",
          approval: { id: "approval-1" },
        }),
      ),
    ).toEqual({ kind: "approval", toolName: "app_create", detail: "Wikipedia" });
  });

  test("clears an approval after the user responds", () => {
    expect(
      getPendingAssistantAction(
        assistantMessage({
          type: "tool-call",
          toolCallId: "create-1",
          toolName: "app_create",
          args: { name: "Wikipedia" },
          argsText: "{}",
          approval: { id: "approval-1", approved: true },
        }),
      ),
    ).toBeUndefined();
  });
});
