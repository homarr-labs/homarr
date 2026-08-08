// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { ChatModelAdapter, ThreadMessageLike } from "@assistant-ui/react";
import { defineToolkit, MessagePrimitive, ThreadPrimitive, useLocalRuntime } from "@assistant-ui/react";
import { afterEach, describe, expect, test } from "vitest";
import { z } from "zod/v4";

import { AssistantRuntimeProviderWithTools } from "./assistant-runtime-provider";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noOpAdapter: ChatModelAdapter = { async *run() {} };
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
});
