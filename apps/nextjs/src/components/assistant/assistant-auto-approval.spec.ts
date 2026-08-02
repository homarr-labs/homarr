// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";

import {
  AssistantAutoApprovalProvider,
  createAssistantAutoApprovalTracker,
  useAssistantAutoApproval,
} from "./assistant-auto-approval";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type AutoApproval = ReturnType<typeof useAssistantAutoApproval>;
let currentAutoApproval: AutoApproval | null = null;
const containers: HTMLDivElement[] = [];

const AutoApprovalProbe = () => {
  currentAutoApproval = useAssistantAutoApproval();
  return null;
};

afterEach(() => {
  currentAutoApproval = null;
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

    expect(currentAutoApproval?.requestApproval("app-create-1", () => undefined)).toBe(true);
    expect(currentAutoApproval?.requestApproval("app-create-1", () => undefined)).toBe(false);

    act(() => currentAutoApproval?.setEnabled(false));
    act(() => currentAutoApproval?.setEnabled(true));
    expect(currentAutoApproval?.requestApproval("app-create-1", () => undefined)).toBe(true);

    await act(async () => root.unmount());
  });
});
