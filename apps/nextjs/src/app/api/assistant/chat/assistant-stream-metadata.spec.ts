// @vitest-environment node

import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, test } from "vitest";

import { shouldEmitAssistantMessageMetadata } from "./assistant-stream-metadata";

const usage = {
  inputTokens: { total: 4, noCache: 4, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 4, text: 2, reasoning: 2 },
};

type StreamPayload = { type: string; messageMetadata?: unknown; delta?: unknown };
type DeltaPayload = StreamPayload & { delta: string };

const isDeltaPayload = (payload: StreamPayload, type: string): payload is DeltaPayload =>
  payload.type === type && typeof payload.delta === "string";

describe("assistant stream metadata boundaries", () => {
  test("forwards source parts into the UI stream at their emitted position", async () => {
    const model = new MockLanguageModelV4({
      doStream: {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "text" },
            { type: "text-delta", id: "text", delta: "Grounded answer." },
            {
              type: "source",
              sourceType: "url",
              id: "source-1",
              url: "https://docs.example.com/api",
              title: "API documentation",
            },
            { type: "text-end", id: "text" },
            { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage },
          ],
          chunkDelayInMs: null,
        }),
      },
    });
    const response = streamText({ model, prompt: "Return a grounded answer." }).toUIMessageStreamResponse({
      sendSources: true,
    });
    const payloads = (await response.text())
      .split(/\r?\n/u)
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice("data: ".length))
      .filter((payload) => payload !== "[DONE]")
      .map((payload) => JSON.parse(payload) as StreamPayload);

    expect(payloads.map(({ type }) => type)).toEqual(expect.arrayContaining(["text-delta", "source-url", "finish"]));
    expect(payloads.find(({ type }) => type === "source-url")).toMatchObject({
      sourceId: "source-1",
      url: "https://docs.example.com/api",
      title: "API documentation",
    });
  });

  test("suppresses repeated chunk metadata while preserving step and final boundaries", async () => {
    const model = new MockLanguageModelV4({
      doStream: {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "reasoning-start", id: "reasoning" },
            { type: "reasoning-delta", id: "reasoning", delta: "Thinking " },
            { type: "reasoning-delta", id: "reasoning", delta: "through." },
            { type: "reasoning-end", id: "reasoning" },
            { type: "text-start", id: "text" },
            { type: "text-delta", id: "text", delta: "ok " },
            { type: "text-delta", id: "text", delta: "done" },
            { type: "text-end", id: "text" },
            { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage },
          ],
          chunkDelayInMs: null,
        }),
      },
    });
    const emittedParts: string[] = [];
    const response = streamText({ model, prompt: "Return a short answer." }).toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (!shouldEmitAssistantMessageMetadata(part)) return undefined;
        emittedParts.push(part.type);
        return { boundary: part.type };
      },
    });

    const payloads = (await response.text())
      .split(/\r?\n/u)
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice("data: ".length))
      .filter((payload) => payload !== "[DONE]")
      .map((payload) => JSON.parse(payload) as StreamPayload);
    const metadataChunks = payloads.filter((payload) => payload.type === "message-metadata");
    const reasoningDeltas = payloads.filter((payload) => isDeltaPayload(payload, "reasoning-delta"));
    const textDeltas = payloads.filter((payload) => isDeltaPayload(payload, "text-delta"));

    expect(emittedParts).toEqual(["start", "start-step", "finish-step", "finish"]);
    expect(metadataChunks).toEqual([
      { type: "message-metadata", messageMetadata: { boundary: "start-step" } },
      { type: "message-metadata", messageMetadata: { boundary: "finish-step" } },
    ]);
    expect(reasoningDeltas.map((payload) => payload.delta)).toEqual(["Thinking ", "through."]);
    expect(textDeltas.map((payload) => payload.delta)).toEqual(["ok ", "done"]);
    expect([...reasoningDeltas, ...textDeltas].every((payload) => !("messageMetadata" in payload))).toBe(true);
    expect(payloads.find((payload) => payload.type === "start")).toMatchObject({
      messageMetadata: { boundary: "start" },
    });
    expect(payloads.find((payload) => payload.type === "finish")).toMatchObject({
      messageMetadata: { boundary: "finish" },
    });
  });
});
