// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { AssistantClient, ChatModelAdapter, ThreadMessageLike } from "@assistant-ui/react";
import {
  AssistantRuntimeProvider,
  ChainOfThoughtByIndicesProvider,
  ChainOfThoughtPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useLocalRuntime,
} from "@assistant-ui/react";
import { afterEach, describe, expect, test } from "vitest";

import { assistantMessageGroupBy } from "./assistant-message-grouping";
import { useAssistantReasoningState } from "./assistant-reasoning-state";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const flushEffects = () => new Promise((resolve) => setTimeout(resolve, 0));
const containers: HTMLDivElement[] = [];

afterEach(() => {
  for (const container of containers.splice(0)) container.remove();
});

const ReasoningPart = ({ text }: { text: string }) => <span data-testid="reasoning-part">{text}</span>;
const ToolPart = ({ toolName }: { toolName: string }) => <span data-testid="tool-part">{toolName}</span>;

const TestChainOfThought = ({
  preferredCollapsed = true,
  children,
}: {
  preferredCollapsed?: boolean;
  children?: ReactNode;
}) => {
  const { chainStatus, collapsed } = useAssistantReasoningState(preferredCollapsed);

  return (
    <ChainOfThoughtPrimitive.Root
      data-testid="chain-of-thought"
      data-status={chainStatus.type}
      data-collapsed={String(collapsed)}
    >
      {children}
    </ChainOfThoughtPrimitive.Root>
  );
};

const TestMessage = () => (
  <MessagePrimitive.Root>
    <MessagePrimitive.GroupedParts groupBy={assistantMessageGroupBy} indicator="never">
      {({ part, children }) => {
        switch (part.type) {
          case "group-agent-trace": {
            const startIndex = part.indices[0];
            const endIndex = part.indices.at(-1);
            if (startIndex === undefined || endIndex === undefined) return null;
            return (
              <ChainOfThoughtByIndicesProvider startIndex={startIndex} endIndex={endIndex}>
                <TestChainOfThought>{children}</TestChainOfThought>
              </ChainOfThoughtByIndicesProvider>
            );
          }
          case "group-reasoning":
          case "group-tool":
            return <>{children}</>;
          case "reasoning":
            return <ReasoningPart text={part.text} />;
          case "tool-call":
            return <ToolPart toolName={part.toolName} />;
          default:
            return null;
        }
      }}
    </MessagePrimitive.GroupedParts>
  </MessagePrimitive.Root>
);

const RuntimeProbe = ({ onReady }: { onReady: (aui: AssistantClient) => void }) => {
  const aui = useAui();

  useEffect(() => {
    onReady(aui);
  }, [aui, onReady]);
  return null;
};

const renderAssistant = async (adapter: ChatModelAdapter, initialMessages: ThreadMessageLike[] = []) => {
  const container = document.createElement("div");
  containers.push(container);
  document.body.append(container);
  const root = createRoot(container);
  let client: AssistantClient | undefined;

  const TestAssistant = () => {
    const runtime = useLocalRuntime(adapter, { initialMessages });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <RuntimeProbe
          onReady={(aui) => {
            client = aui;
          }}
        />
        <ThreadPrimitive.Messages components={{ Message: TestMessage }} />
      </AssistantRuntimeProvider>
    );
  };

  await act(async () => {
    root.render(createElement(TestAssistant));
    await flushEffects();
  });

  if (!client) throw new Error("The assistant runtime was not registered");
  return { client, container, root };
};

describe("useAssistantReasoningState", () => {
  test("mounts and renders streamed reasoning without updating the chain resource before mount", async () => {
    const adapter: ChatModelAdapter = {
      async *run() {
        yield { content: [{ type: "reasoning", text: "Inspecting the dashboard" }] };
        await flushEffects();
        yield {
          content: [
            { type: "reasoning", text: "Inspecting the dashboard" },
            { type: "text", text: "Done" },
          ],
        };
      },
    };
    const { client, container, root } = await renderAssistant(adapter);

    await act(async () => {
      client.composer().setText("Inspect my dashboard");
      client.composer().send();
      await flushEffects();
      await flushEffects();
    });

    expect(container.querySelector('[data-testid="reasoning-part"]')?.textContent).toBe("Inspecting the dashboard");
    expect(container.querySelector('[data-testid="chain-of-thought"]')?.getAttribute("data-status")).toBe("complete");

    await act(async () => root.unmount());
  });

  test("opens a pending tool call even when completed reasoning is normally collapsed", async () => {
    const pendingToolMessage: ThreadMessageLike = {
      role: "assistant",
      content: [
        { type: "reasoning", text: "I need approval" },
        {
          type: "tool-call",
          toolCallId: "approval-1",
          toolName: "app_create",
          args: { name: "Wikipedia" },
          argsText: JSON.stringify({ name: "Wikipedia" }),
        },
      ],
      status: { type: "requires-action", reason: "tool-calls" },
    };
    const { container, root } = await renderAssistant({ async *run() {} }, [pendingToolMessage]);
    await act(async () => flushEffects());

    expect(container.querySelector('[data-testid="tool-part"]')?.textContent).toBe("app_create");
    expect(container.querySelector('[data-testid="chain-of-thought"]')?.getAttribute("data-status")).toBe(
      "requires-action",
    );
    expect(container.querySelector('[data-testid="chain-of-thought"]')?.getAttribute("data-collapsed")).toBe("false");

    await act(async () => root.unmount());
  });
});
