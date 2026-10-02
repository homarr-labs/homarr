import { describe, expect, test } from "vitest";
import type { ThreadMessage } from "@assistant-ui/react";

import {
  getSuccessfulApprovedAssistantMutationIds,
  updateAssistantMutationRefreshState,
} from "./assistant-mutation-refresh";

const assistantMessage = (...content: ThreadMessage["content"]): ThreadMessage =>
  ({
    id: "assistant-message",
    role: "assistant",
    content,
    status: { type: "complete", reason: "stop" },
    createdAt: new Date(),
    metadata: { custom: {} },
  }) as ThreadMessage;

describe("assistant mutation refresh", () => {
  test("returns only completed, approved mutation calls", () => {
    expect(
      getSuccessfulApprovedAssistantMutationIds([
        assistantMessage(
          {
            type: "tool-call",
            toolCallId: "approved-1",
            toolName: "app_create",
            args: { name: "Wikipedia" },
            argsText: "{}",
            approval: { id: "approval-1", approved: true },
            result: { id: "app-1" },
          },
          {
            type: "tool-call",
            toolCallId: "read-1",
            toolName: "app_getAll",
            args: {},
            argsText: "{}",
            result: [],
          },
          {
            type: "tool-call",
            toolCallId: "pending-1",
            toolName: "board_savePartialBoardSettings",
            args: { id: "board-1" },
            argsText: "{}",
            approval: { id: "approval-2", approved: true },
          },
        ),
      ]),
    ).toEqual(["approved-1"]);
  });

  test("ignores denied and failed mutations", () => {
    expect(
      getSuccessfulApprovedAssistantMutationIds([
        assistantMessage(
          {
            type: "tool-call",
            toolCallId: "denied-1",
            toolName: "app_create",
            args: {},
            argsText: "{}",
            approval: { id: "approval-1", approved: false },
            result: null,
          },
          {
            type: "tool-call",
            toolCallId: "failed-1",
            toolName: "app_create",
            args: {},
            argsText: "{}",
            approval: { id: "approval-2", approved: true },
            result: { error: "Creation failed" },
          },
        ),
      ]),
    ).toEqual([]);
  });

  test("baselines loaded history, refreshes once for new calls, and baselines a switched conversation", () => {
    const initial = updateAssistantMutationRefreshState({ conversationId: null, toolCallIds: new Set() }, "thread-1", [
      "historical-1",
    ]);
    expect(initial.shouldRefresh).toBe(false);

    const mutation = updateAssistantMutationRefreshState(initial.state, "thread-1", ["historical-1", "new-1", "new-2"]);
    expect(mutation.shouldRefresh).toBe(true);
    expect(updateAssistantMutationRefreshState(mutation.state, "thread-1", ["new-1", "new-2"]).shouldRefresh).toBe(
      false,
    );
    expect(updateAssistantMutationRefreshState(mutation.state, "thread-2", ["historical-2"]).shouldRefresh).toBe(false);
  });
});
