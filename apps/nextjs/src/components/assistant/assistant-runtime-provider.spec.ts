// @vitest-environment jsdom

import type { ComponentProps } from "react";
import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type {
  AssistantClient,
  AssistantRuntime,
  AttachmentAdapter,
  ChatModelAdapter,
  ThreadMessageLike,
} from "@assistant-ui/react";
import {
  defineToolkit,
  INTERNAL,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiEvent,
  useLocalRuntime,
} from "@assistant-ui/react";
import { LexicalComposerInput } from "@assistant-ui/react-lexical";
import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod/v4";

import { showErrorNotification } from "@homarr/notifications";

import {
  AssistantComposerRuntimeProvider,
  AssistantComposerSurfaceBoundary,
  AssistantRunFocusPreserver,
  AssistantRuntimeProviderWithTools,
  assistantSurfaceComposerCacheLimit,
} from "./assistant-runtime-provider";

vi.mock("@homarr/notifications", () => ({ showErrorNotification: vi.fn() }));
vi.mock("@homarr/translation/client", () => ({ useI18n: () => (key: string) => key }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noOpAdapter: ChatModelAdapter = { async *run() {} };
const createAttachmentAdapter = (accept: string): AttachmentAdapter => ({
  accept,
  async add({ file }) {
    return {
      id: `${file.name}-${file.size}`,
      type: file.type.startsWith("image/") ? "image" : "document",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  },
  async send(attachment) {
    return {
      ...attachment,
      status: { type: "complete" },
      content: [{ type: "text", text: attachment.name }],
    };
  },
  async remove() {},
});
const toolkit = defineToolkit({
  ask_user: {
    type: "human",
    display: "standalone",
    parameters: z.object({ question: z.string() }),
    render: ({ args }) => createElement("div", { "data-testid": "ask-user-ui" }, `Question: ${args.question}`),
  },
});
const messages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: "ask-1",
        toolName: "ask_user",
        args: { question: "Which board?" },
        argsText: JSON.stringify({ question: "Which board?" }),
      },
    ],
    status: { type: "requires-action", reason: "tool-calls" },
  },
];

const Message = () =>
  createElement(MessagePrimitive.Parts, {
    components: {
      tools: {
        Fallback: () => createElement("div", { "data-testid": "fallback-tool-ui" }, "Fallback"),
      },
    },
  });

const TestAssistant = () => {
  const runtime = useLocalRuntime(noOpAdapter, { initialMessages: messages });
  return createElement(
    AssistantRuntimeProviderWithTools,
    { runtime, toolkit },
    createElement(ThreadPrimitive.Messages, { components: { Message } }),
  );
};

interface SurfaceProbeProps {
  id: string;
  onReady: (id: string, aui: AssistantClient) => void;
}

const SurfaceProbe = ({ id, onReady }: SurfaceProbeProps) => {
  const aui = useAui();

  useEffect(() => {
    onReady(id, aui);
  }, [aui, id, onReady]);

  return createElement(LexicalComposerInput, {
    "data-assistant-composer-input": true,
    "data-testid": `input-${id}`,
  } as ComponentProps<typeof LexicalComposerInput>);
};

const LexicalRunFocusProbe = () => {
  useAuiEvent("thread.runStart", () => {
    queueMicrotask(() => {
      document.querySelector<HTMLElement>('[data-testid="input-b"] [contenteditable="true"]')?.focus();
    });
  });
  return null;
};

const SurfaceTestAssistant = ({
  onReady,
  onRuntimeReady,
  allowImages = true,
  simulateRunFocus = false,
}: {
  onReady: SurfaceProbeProps["onReady"];
  onRuntimeReady: (runtime: AssistantRuntime) => void;
  allowImages?: boolean;
  simulateRunFocus?: boolean;
}) => {
  const runtime = useLocalRuntime(noOpAdapter, {
    adapters: { attachments: createAttachmentAdapter(allowImages ? "image/png,text/plain" : "text/plain") },
  });
  useEffect(() => onRuntimeReady(runtime), [onRuntimeReady, runtime]);
  return createElement(
    AssistantRuntimeProviderWithTools,
    { runtime, toolkit },
    createElement(AssistantRunFocusPreserver),
    createElement(
      AssistantComposerRuntimeProvider,
      null,
      createElement(
        AssistantComposerSurfaceBoundary,
        { surfaceId: "surface-a" },
        createElement(SurfaceProbe, { id: "a", onReady }),
      ),
    ),
    createElement(
      AssistantComposerRuntimeProvider,
      null,
      createElement(
        AssistantComposerSurfaceBoundary,
        { surfaceId: "surface-b" },
        createElement(SurfaceProbe, { id: "b", onReady }),
      ),
    ),
    simulateRunFocus ? createElement(LexicalRunFocusProbe) : null,
  );
};

const renderSurfaceTestAssistant = async ({
  allowImages = true,
  simulateRunFocus = false,
}: { allowImages?: boolean; simulateRunFocus?: boolean } = {}) => {
  const container = document.createElement("div");
  containers.push(container);
  document.body.append(container);
  const root = createRoot(container);
  const clients = new Map<string, AssistantClient>();
  let sharedRuntime: AssistantRuntime | undefined;

  await act(async () => {
    root.render(
      createElement(SurfaceTestAssistant, {
        allowImages,
        simulateRunFocus,
        onReady: (id, aui) => clients.set(id, aui),
        onRuntimeReady: (runtime) => {
          sharedRuntime = runtime;
        },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const a = clients.get("a");
  const b = clients.get("b");
  if (!a || !b || !sharedRuntime) throw new Error("The assistant runtime and both surfaces must be registered");

  return {
    container,
    root,
    a,
    b,
    sharedRuntime,
  };
};

const getRequiredComposerInput = (container: HTMLElement, testId: string) => {
  const wrapper = container.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const target = wrapper?.querySelector<HTMLElement>('[contenteditable="true"]');
  if (!target) throw new Error(`Missing composer input ${testId}`);
  return target;
};

const getUserMessageText = (aui: AssistantClient) =>
  aui
    .thread()
    .getState()
    .messages.filter((message) => message.role === "user")
    .flatMap((message) => message.content)
    .filter((part) => part.type === "text")
    .map((part) => part.text);

const containers: HTMLDivElement[] = [];

afterEach(() => {
  for (const container of containers.splice(0)) container.remove();
});

describe("AssistantRuntimeProviderWithTools", () => {
  test("makes the registered human-tool renderer available to message parts", async () => {
    const container = document.createElement("div");
    containers.push(container);
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(TestAssistant));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('[data-testid="ask-user-ui"]')?.textContent).toBe("Question: Which board?");
    expect(container.querySelector('[data-testid="fallback-tool-ui"]')).toBeNull();

    await act(async () => root.unmount());
  });

  test("keeps drafts and attachments independent while both surfaces share one thread", async () => {
    const { container, root, a, b } = await renderSurfaceTestAssistant();

    act(() => {
      a.composer().setText("Draft in the board widget");
      b.composer().setText("Draft in the floating panel");
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    await act(async () => {
      await a.composer().addAttachment({
        id: "board-file",
        name: "board.txt",
        contentType: "text/plain",
        content: [{ type: "text", text: "board attachment" }],
      });
    });

    expect(a.composer().getState().text).toBe("Draft in the board widget");
    expect(b.composer().getState().text).toBe("Draft in the floating panel");
    expect(
      a
        .composer()
        .getState()
        .attachments.map((attachment) => attachment.name),
    ).toEqual(["board.txt"]);
    expect(b.composer().getState().attachments).toHaveLength(0);
    expect(a.thread().getState().messages).toEqual(b.thread().getState().messages);
    expect(getRequiredComposerInput(container, "input-a").textContent).toBe("Draft in the board widget");
    expect(getRequiredComposerInput(container, "input-b").textContent).toBe("Draft in the floating panel");

    await act(async () => root.unmount());
  });

  test("sends either local composer into the same shared conversation without clearing the other draft", async () => {
    const { root, a, b } = await renderSurfaceTestAssistant();

    act(() => {
      a.composer().setText("Message from the widget");
      b.composer().setText("Message from the panel");
      a.composer().send();
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(getUserMessageText(a)).toContain("Message from the widget");
    expect(getUserMessageText(b)).toContain("Message from the widget");
    expect(a.composer().getState().text).toBe("");
    expect(b.composer().getState().text).toBe("Message from the panel");

    act(() => b.composer().send());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(getUserMessageText(a)).toContain("Message from the panel");
    expect(getUserMessageText(b)).toContain("Message from the panel");

    await act(async () => root.unmount());
  });

  test("keeps each surface draft scoped to the selected conversation", async () => {
    const { root, a, b } = await renderSurfaceTestAssistant();
    act(() => {
      a.composer().setText("Initialize the first conversation");
      a.composer().send();
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    const firstThreadId = a.threads().getState().mainThreadId;

    act(() => {
      a.composer().setText("First thread / widget");
      b.composer().setText("First thread / panel");
    });
    await act(async () => a.threads().switchToNewThread());

    expect(a.threads().getState().mainThreadId).not.toBe(firstThreadId);
    expect(a.composer().getState().text).toBe("");
    expect(b.composer().getState().text).toBe("");
    act(() => a.composer().setText("Second thread / widget"));

    await act(async () => a.threads().switchToThread(firstThreadId));
    expect(a.composer().getState().text).toBe("First thread / widget");
    expect(b.composer().getState().text).toBe("First thread / panel");

    await act(async () => root.unmount());
  });

  test("forwards main-thread reloads through the surface runtime", async () => {
    const { root, a, sharedRuntime } = await renderSurfaceTestAssistant();
    const reloadMainThread = vi.spyOn(sharedRuntime.threads, "reloadMainThread").mockResolvedValue();

    await act(async () => a.threads().reloadMainThread());

    expect(reloadMainThread).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });

  test("restores focus after the Lexical run-start behavior tries to focus every surface", async () => {
    const outsideInput = document.createElement("input");
    document.body.append(outsideInput);
    const { root, a } = await renderSurfaceTestAssistant();
    outsideInput.focus();

    act(() => {
      a.composer().setText("Run without stealing focus");
      a.composer().send();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.activeElement).toBe(outsideInput);
    outsideInput.remove();
    await act(async () => root.unmount());
  });

  test("keeps focus and dashboard scroll on the surface that started the run", async () => {
    const { container, root, a } = await renderSurfaceTestAssistant({ simulateRunFocus: true });
    const panelInput = getRequiredComposerInput(container, "input-a");
    const widgetInput = getRequiredComposerInput(container, "input-b");
    const scrollContainer = container;
    scrollContainer.scrollTop = 120;
    const focusWidget = widgetInput.focus.bind(widgetInput);
    const widgetFocus = vi.spyOn(widgetInput, "focus").mockImplementation((options) => {
      // jsdom does not implement native focus scrolling, so reproduce the dashboard jump that a
      // browser performs when the off-screen widget composer receives programmatic focus.
      scrollContainer.scrollTop = 640;
      focusWidget(options);
    });
    panelInput.focus();

    act(() => {
      a.composer().setText("Send from the floating panel");
      a.composer().send();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(widgetFocus).toHaveBeenCalled();
    expect(document.activeElement).toBe(panelInput);
    expect(scrollContainer.scrollTop).toBe(120);
    await act(async () => root.unmount());
  });

  test("adds pasted images only to the active surface composer", async () => {
    const { container, root, a, b } = await renderSurfaceTestAssistant();
    const target = getRequiredComposerInput(container, "input-a");
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", {
      value: { files: [new File(["image"], "dashboard.png", { type: "image/png" })] },
    });

    await act(async () => {
      target.dispatchEvent(paste);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(paste.defaultPrevented).toBe(true);
    expect(
      a
        .composer()
        .getState()
        .attachments.map((attachment) => attachment.name),
    ).toEqual(["dashboard.png"]);
    expect(b.composer().getState().attachments).toHaveLength(0);
    await act(async () => root.unmount());
  });

  test("rejects a pasted image with an actionable message when the selected model is text-only", async () => {
    vi.mocked(showErrorNotification).mockClear();
    const { container, root, a } = await renderSurfaceTestAssistant({ allowImages: false });
    const target = getRequiredComposerInput(container, "input-a");
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", {
      value: { files: [new File(["image"], "dashboard.png", { type: "image/png" })] },
    });

    await act(async () => target.dispatchEvent(paste));

    expect(a.composer().getState().attachments).toHaveLength(0);
    expect(showErrorNotification).toHaveBeenCalledWith({
      title: "attachments.errorTitle",
      message: "attachments.imageUnsupported",
    });
    await act(async () => root.unmount());
  });

  test("does not capture file paste from a non-composer textarea", async () => {
    const { container, root, a } = await renderSurfaceTestAssistant();
    const textarea = document.createElement("textarea");
    container.querySelector('[data-testid="input-a"]')?.parentElement?.append(textarea);
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", {
      value: { files: [new File(["image"], "dashboard.png", { type: "image/png" })] },
    });

    await act(async () => textarea.dispatchEvent(paste));

    expect(paste.defaultPrevented).toBe(false);
    expect(a.composer().getState().attachments).toHaveLength(0);
    await act(async () => root.unmount());
  });

  test("enforces the attachment limit independently for each surface", async () => {
    vi.mocked(showErrorNotification).mockClear();
    const { root, a, b } = await renderSurfaceTestAssistant();

    await act(async () => {
      await Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          a.composer().addAttachment(new File([`a-${index}`], `a-${index}.txt`, { type: "text/plain" })),
        ),
      );
      await Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          b.composer().addAttachment(new File([`b-${index}`], `b-${index}.txt`, { type: "text/plain" })),
        ),
      );
    });

    expect(a.composer().getState().attachments).toHaveLength(5);
    expect(b.composer().getState().attachments).toHaveLength(5);
    await expect(a.composer().addAttachment(new File(["six"], "a-six.txt", { type: "text/plain" }))).rejects.toThrow(
      "A message can include up to 5 attachments.",
    );
    expect(b.composer().getState().attachments).toHaveLength(5);

    await act(async () => root.unmount());
  });

  test("disposes scoped composer subscriptions when its surfaces unmount", async () => {
    const originalConnect = INTERNAL.DefaultThreadComposerRuntimeCore.prototype.connect;
    let activeConnections = 0;
    const connectSpy = vi
      .spyOn(INTERNAL.DefaultThreadComposerRuntimeCore.prototype, "connect")
      .mockImplementation(function (this: InstanceType<typeof INTERNAL.DefaultThreadComposerRuntimeCore>) {
        const unsubscribe = originalConnect.call(this);
        activeConnections += 1;
        let connected = true;
        return () => {
          if (!connected) return;
          connected = false;
          activeConnections -= 1;
          unsubscribe();
        };
      });
    const { root } = await renderSurfaceTestAssistant();
    const mountedConnections = activeConnections;
    expect(mountedConnections).toBeGreaterThanOrEqual(3);

    await act(async () => root.unmount());

    expect(activeConnections).toBeLessThan(mountedConnections);
    expect(mountedConnections - activeConnections).toBe(2);
    connectSpy.mockRestore();
  });

  test("recreates scoped composers when the shared conversation core is replaced", async () => {
    const originalConnect = INTERNAL.DefaultThreadComposerRuntimeCore.prototype.connect;
    let connectCalls = 0;
    let disconnectCalls = 0;
    const connectSpy = vi
      .spyOn(INTERNAL.DefaultThreadComposerRuntimeCore.prototype, "connect")
      .mockImplementation(function (this: InstanceType<typeof INTERNAL.DefaultThreadComposerRuntimeCore>) {
        connectCalls += 1;
        const unsubscribe = originalConnect.call(this);
        let connected = true;
        return () => {
          if (!connected) return;
          connected = false;
          disconnectCalls += 1;
          unsubscribe();
        };
      });
    const { root, a, b, sharedRuntime } = await renderSurfaceTestAssistant();
    const mountedConnectCalls = connectCalls;
    act(() => {
      a.composer().setText("Draft on the first board core");
      b.composer().setText("Draft on the first panel core");
    });

    const sharedThread = sharedRuntime.thread as InstanceType<typeof INTERNAL.ThreadRuntimeImpl>;
    // oxlint-disable-next-line no-underscore-dangle -- replacing the bound core reproduces assistant-ui's outer runtime swap.
    const binding = sharedThread.__internal_threadBinding;
    const originalGetState = binding.getState;
    const originalCore = originalGetState();
    const replacementCore = new Proxy(originalCore, {
      get(target, property) {
        const value = Reflect.get(target, property, target) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    binding.getState = () => replacementCore;

    act(() => originalCore.reset());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(connectCalls - mountedConnectCalls).toBeGreaterThanOrEqual(2);
    expect(disconnectCalls).toBeGreaterThanOrEqual(2);
    expect(a.composer().getState().text).toBe("Draft on the first board core");
    expect(b.composer().getState().text).toBe("Draft on the first panel core");

    await act(async () => root.unmount());
    binding.getState = originalGetState;
    connectSpy.mockRestore();
  });

  test("evicts the least recently used inactive conversation draft", async () => {
    const { root, a } = await renderSurfaceTestAssistant();
    act(() => {
      a.composer().setText("Initialize the oldest conversation");
      a.composer().send();
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    const oldestThreadId = a.threads().getState().mainThreadId;
    act(() => a.composer().setText("Draft that should eventually be evicted"));

    for (let index = 0; index < assistantSurfaceComposerCacheLimit; index += 1) {
      await act(async () => a.threads().switchToNewThread());
      act(() => {
        a.composer().setText(`Initialize conversation ${index}`);
        a.composer().send();
      });
      await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    }

    await act(async () => a.threads().switchToThread(oldestThreadId));
    expect(a.composer().getState().text).toBe("");
    await act(async () => root.unmount());
  });
});
