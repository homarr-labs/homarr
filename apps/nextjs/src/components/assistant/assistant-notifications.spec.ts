import { describe, expect, test } from "vitest";

import { initialAssistantNotificationState, updateAssistantNotificationState } from "./assistant-notifications";

describe("updateAssistantNotificationState", () => {
  test("baselines the current response when notifications initialize", () => {
    const update = updateAssistantNotificationState(initialAssistantNotificationState, {
      conversationId: "conversation-a",
      notificationKey: "response-a:complete",
    });

    expect(update.shouldNotify).toBe(false);
    expect(update.state).toEqual({
      initialized: true,
      conversationId: "conversation-a",
      notificationKey: "response-a:complete",
    });
  });

  test("notifies when a response completes in the active conversation", () => {
    const update = updateAssistantNotificationState(
      {
        initialized: true,
        conversationId: "conversation-a",
        notificationKey: null,
      },
      {
        conversationId: "conversation-a",
        notificationKey: "response-a:complete",
      },
    );

    expect(update.shouldNotify).toBe(true);
  });

  test("does not count existing history when the selected conversation changes", () => {
    const update = updateAssistantNotificationState(
      {
        initialized: true,
        conversationId: "conversation-a",
        notificationKey: "response-a:complete",
      },
      {
        conversationId: "conversation-b",
        notificationKey: "response-b:complete",
      },
    );

    expect(update.shouldNotify).toBe(false);
    expect(update.state.notificationKey).toBe("response-b:complete");
  });

  test("notifies for the next completion after switching conversations", () => {
    const switched = updateAssistantNotificationState(
      {
        initialized: true,
        conversationId: "conversation-a",
        notificationKey: "response-a:complete",
      },
      {
        conversationId: "conversation-b",
        notificationKey: "response-b:complete",
      },
    );
    const completed = updateAssistantNotificationState(switched.state, {
      conversationId: "conversation-b",
      notificationKey: "response-c:complete",
    });

    expect(completed.shouldNotify).toBe(true);
  });

  test("ignores running and repeated response states", () => {
    const previous = {
      initialized: true,
      conversationId: "conversation-a",
      notificationKey: "response-a:complete",
    };

    expect(
      updateAssistantNotificationState(previous, {
        conversationId: "conversation-a",
        notificationKey: null,
      }).shouldNotify,
    ).toBe(false);
    expect(
      updateAssistantNotificationState(previous, {
        conversationId: "conversation-a",
        notificationKey: "response-a:complete",
      }).shouldNotify,
    ).toBe(false);
  });
});
