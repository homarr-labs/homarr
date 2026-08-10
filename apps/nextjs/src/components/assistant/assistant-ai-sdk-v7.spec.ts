// @vitest-environment node

import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { jsonSchema, readUIMessageStream, simulateReadableStream, stepCountIs, streamText, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, test, vi } from "vitest";

const usage = {
  inputTokens: { total: 8, noCache: 8, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 4, text: 4, reasoning: 0 },
};

const finish = (unified: "stop" | "tool-calls") => ({
  type: "finish" as const,
  finishReason: { unified, raw: unified },
  usage,
});

describe("assistant-ui AI SDK v7 transport", () => {
  test("round-trips a multi-step server tool response into one UI message", async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              {
                type: "tool-call" as const,
                toolCallId: "lookup-call",
                toolName: "test_lookup",
                input: '{"query":"homarr"}',
              },
              finish("tool-calls"),
            ],
            chunkDelayInMs: null,
          }),
        },
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              { type: "text-start" as const, id: "answer" },
              { type: "text-delta" as const, id: "answer", delta: "Migration stream complete." },
              { type: "text-end" as const, id: "answer" },
              finish("stop"),
            ],
            chunkDelayInMs: null,
          }),
        },
      ],
    });
    const result = streamText({
      model,
      prompt: "Verify the migrated assistant stream.",
      tools: {
        test_lookup: tool({
          inputSchema: jsonSchema({
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
            additionalProperties: false,
          }),
          execute: ({ query }) => ({ query, value: "ok" }),
        }),
      },
      stopWhen: stepCountIs(2),
    });
    const fetchMock = vi.fn(async () =>
      result.toUIMessageStreamResponse({
        sendReasoning: true,
        messageMetadata: ({ part }) => (part.type === "finish" ? { runtime: "ai-sdk-v7" } : undefined),
      }),
    );
    const transport = new AssistantChatTransport({
      api: "https://homarr.test/api/assistant/chat",
      fetch: fetchMock,
    });

    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "thread-1",
      messageId: undefined,
      messages: [{ id: "user-1", role: "user", parts: [{ type: "text", text: "Run migration test" }] }],
      abortSignal: undefined,
    });
    let finalMessage: unknown;
    for await (const message of readUIMessageStream({ stream })) finalMessage = message;

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(finalMessage).toMatchObject({
      role: "assistant",
      metadata: { runtime: "ai-sdk-v7" },
    });
    expect(JSON.stringify(finalMessage)).toContain('"type":"tool-test_lookup"');
    expect(JSON.stringify(finalMessage)).toContain('"state":"output-available"');
    expect(JSON.stringify(finalMessage)).toContain('"value":"ok"');
    expect(JSON.stringify(finalMessage)).toContain("Migration stream complete.");
  });
});
