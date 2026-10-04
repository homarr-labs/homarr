// @vitest-environment jsdom

import { act, createElement, Fragment } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  AssistantAutoApprovalProvider,
  createAssistantAutoApprovalTracker,
  useAssistantAutoApproval,
  useAssistantAutomaticAction,
} from "./assistant-auto-approval";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type AutoApproval = ReturnType<typeof useAssistantAutoApproval>;
let currentAutoApproval: AutoApproval | null = null;
let automaticActionInProgress = false;
const containers: HTMLDivElement[] = [];

const AutoApprovalProbe = () => {
  currentAutoApproval = useAssistantAutoApproval();
  return null;
};

const AutomaticActionProbe = ({
  ready,
  completed,
  confirm,
}: {
  ready: boolean;
  completed: boolean;
  confirm: () => void;
}) => {
  automaticActionInProgress = useAssistantAutomaticAction({
    toolCallId: "configure-app-1",
    ready,
    completed,
    confirm,
  });
  return null;
};

afterEach(() => {
  currentAutoApproval = null;
  automaticActionInProgress = false;
  for (const container of containers.splice(0)) container.remove();
});

describe("assistant automatic approval tracker", () => {
  test("claims a tool call only once across duplicate conversation renderers", () => {
    const tracker = createAssistantAutoApprovalTracker();

    expect(tracker.claim("app-create-1")).toBe(true);
    expect(tracker.claim("app-create-1")).toBe(false);
    expect(tracker.claim("board-save-1")).toBe(true);
  });

  test("can retry a failed response and clears claims for another conversation", () => {
    const tracker = createAssistantAutoApprovalTracker();

    expect(tracker.claim("app-create-1")).toBe(true);
    tracker.release("app-create-1");
    expect(tracker.claim("app-create-1")).toBe(true);

    tracker.clear();
    expect(tracker.claim("app-create-1")).toBe(true);
  });

  test("bounds automatic retries and permits a fresh claim after completion", () => {
    const tracker = createAssistantAutoApprovalTracker(2);

    expect(tracker.claim("custom-widget-create-1")).toBe(true);
    tracker.release("custom-widget-create-1");
    expect(tracker.claim("custom-widget-create-1")).toBe(true);
    tracker.release("custom-widget-create-1");
    expect(tracker.claim("custom-widget-create-1")).toBe(false);

    tracker.complete("custom-widget-create-1");
    expect(tracker.claim("custom-widget-create-1")).toBe(true);
  });

  test("keeps the setting for the same local conversation and resets it on a real switch", async () => {
    const container = document.createElement("div");
    containers.push(container);
    document.body.append(container);
    const root = createRoot(container);
    const renderConversation = async (conversationId: string) => {
      await act(async () => {
        root.render(createElement(AssistantAutoApprovalProvider, { conversationId }, createElement(AutoApprovalProbe)));
      });
    };

    await renderConversation("local-thread-1");
    act(() => currentAutoApproval?.setEnabled(true));
    expect(currentAutoApproval?.enabled).toBe(true);

    await renderConversation("local-thread-1");
    expect(currentAutoApproval?.enabled).toBe(true);

    await renderConversation("local-thread-2");
    expect(currentAutoApproval?.enabled).toBe(false);

    await act(async () => root.unmount());
  });

  test("does not approve a ready action while switching conversations", async () => {
    const container = document.createElement("div");
    containers.push(container);
    document.body.append(container);
    const root = createRoot(container);
    let confirmationCount = 0;
    const renderConversation = async (conversationId: string, ready: boolean) => {
      await act(async () => {
        root.render(
          createElement(
            AssistantAutoApprovalProvider,
            { conversationId },
            createElement(
              Fragment,
              null,
              createElement(AutoApprovalProbe),
              createElement(AutomaticActionProbe, {
                ready,
                completed: false,
                confirm: () => {
                  confirmationCount += 1;
                },
              }),
            ),
          ),
        );
      });
    };

    await renderConversation("local-thread-1", false);
    act(() => currentAutoApproval?.setEnabled(true));
    await renderConversation("local-thread-2", true);

    expect(confirmationCount).toBe(0);
    expect(currentAutoApproval?.enabled).toBe(false);
    expect(automaticActionInProgress).toBe(false);

    await act(async () => root.unmount());
  });

  test("clears claimed calls when automatic approvals are turned off", async () => {
    const container = document.createElement("div");
    containers.push(container);
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(
          AssistantAutoApprovalProvider,
          { conversationId: "local-thread-1" },
          createElement(AutoApprovalProbe),
        ),
      );
    });
    act(() => currentAutoApproval?.setEnabled(true));

    expect(currentAutoApproval?.requestAction("app-create-1", () => undefined)).toBe(true);
    expect(currentAutoApproval?.requestAction("app-create-1", () => undefined)).toBe(false);

    act(() => currentAutoApproval?.setEnabled(false));
    act(() => currentAutoApproval?.setEnabled(true));
    expect(currentAutoApproval?.requestAction("app-create-1", () => undefined)).toBe(true);

    await act(async () => root.unmount());
  });

  test("returns a failed approval to the caller and releases its claim", async () => {
    const container = document.createElement("div");
    containers.push(container);
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(
          AssistantAutoApprovalProvider,
          { conversationId: "local-thread-1" },
          createElement(AutoApprovalProbe),
        ),
      );
    });
    act(() => currentAutoApproval?.setEnabled(true));

    expect(
      currentAutoApproval?.requestAction("app-create-1", () => {
        throw new Error("Approval transport failed");
      }),
    ).toBe(false);
    expect(currentAutoApproval?.requestAction("app-create-1", () => undefined)).toBe(true);

    await act(async () => root.unmount());
  });

  test("confirms a ready human-tool action exactly once and clears progress on completion", async () => {
    const container = document.createElement("div");
    containers.push(container);
    document.body.append(container);
    const root = createRoot(container);
    let confirmationCount = 0;
    const confirm = () => {
      confirmationCount += 1;
    };
    const renderAction = async (ready: boolean, completed: boolean) => {
      await act(async () => {
        root.render(
          createElement(
            AssistantAutoApprovalProvider,
            { conversationId: "local-thread-1" },
            createElement(
              Fragment,
              null,
              createElement(AutoApprovalProbe),
              createElement(AutomaticActionProbe, { ready, completed, confirm }),
            ),
          ),
        );
      });
    };

    await renderAction(false, false);
    act(() => currentAutoApproval?.setEnabled(true));
    await renderAction(true, false);
    expect(confirmationCount).toBe(1);
    expect(automaticActionInProgress).toBe(true);

    await renderAction(true, false);
    expect(confirmationCount).toBe(1);

    await renderAction(false, true);
    expect(automaticActionInProgress).toBe(false);

    await act(async () => root.unmount());
  });

  test("retries an approval response that never settles and restores manual controls after two attempts", async () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    containers.push(container);
    document.body.append(container);
    const root = createRoot(container);
    let confirmationCount = 0;

    await act(async () => {
      root.render(
        createElement(
          AssistantAutoApprovalProvider,
          { conversationId: "local-thread-1" },
          createElement(
            Fragment,
            null,
            createElement(AutoApprovalProbe),
            createElement(AutomaticActionProbe, {
              ready: true,
              completed: false,
              confirm: () => {
                confirmationCount += 1;
              },
            }),
          ),
        ),
      );
    });
    act(() => currentAutoApproval?.setEnabled(true));
    expect(confirmationCount).toBe(1);
    expect(automaticActionInProgress).toBe(true);

    await act(async () => vi.advanceTimersByTime(5_000));
    expect(confirmationCount).toBe(2);
    expect(automaticActionInProgress).toBe(true);

    await act(async () => vi.advanceTimersByTime(5_000));
    expect(confirmationCount).toBe(2);
    expect(automaticActionInProgress).toBe(false);

    await act(async () => root.unmount());
    vi.useRealTimers();
  });
});
