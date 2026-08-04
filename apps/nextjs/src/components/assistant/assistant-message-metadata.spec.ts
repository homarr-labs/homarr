import { describe, expect, test } from "vitest";

import {
  getAssistantTelemetry,
  getAssistantUsage,
  resolveAssistantContextWindowTelemetry,
} from "./assistant-message-metadata";

describe("getAssistantTelemetry", () => {
  test("extracts persisted request telemetry", () => {
    expect(
      getAssistantTelemetry({
        custom: {
          telemetry: {
            requestId: "request-1",
            provider: "openrouter",
            modelId: "example/model",
            startedAt: "2026-07-30T12:00:00.000Z",
            completedAt: "2026-07-30T12:00:01.000Z",
            durationMs: 1000,
            contextLength: 128_000,
            contextUsed: 2000,
            contextUtilization: 0.015625,
            cost: 0.001,
            costType: "reported",
            providerOutputTokensPerSecond: 37.9,
            generationTimeMs: 1451,
            cacheDiscount: 0.00003,
            fallbackCount: 1,
            webSearchRequests: 2,
            webSearchSources: [
              { url: "https://example.com/research", title: "Research source" },
              { url: "javascript:alert(1)", title: "Unsafe source" },
            ],
            steps: [
              {
                index: 1,
                durationMs: 900,
                modelDurationMs: 800,
                toolDurationMs: 100,
                providerLatencyMs: 964,
                generationTimeMs: 1451,
                providerOutputTokensPerSecond: 37.9,
                inputTokens: 12_777,
                outputTokens: 55,
                normalizedInputTokens: 12_799,
                normalizedOutputTokens: 62,
                cachedInputTokens: 2048,
                reasoningTokens: 7,
                cacheDiscount: 0.00003,
                fallbackCount: 1,
                webSearchRequests: 2,
                webSearchSources: [{ url: "https://example.com/research", title: "Research source" }],
                routedProvider: "Alibaba",
                serviceTier: "default",
                dataRegion: "US",
                isByok: false,
                streamed: true,
                cancelled: false,
              },
            ],
          },
        },
      }),
    ).toMatchObject({
      requestId: "request-1",
      provider: "openrouter",
      durationMs: 1000,
      contextLength: 128_000,
      costType: "reported",
      providerOutputTokensPerSecond: 37.9,
      generationTimeMs: 1451,
      cacheDiscount: 0.00003,
      fallbackCount: 1,
      webSearchRequests: 2,
      webSearchSources: [{ url: "https://example.com/research", title: "Research source" }],
      steps: [
        expect.objectContaining({
          providerLatencyMs: 964,
          inputTokens: 12_777,
          cachedInputTokens: 2048,
          routedProvider: "Alibaba",
          serviceTier: "default",
          webSearchRequests: 2,
          webSearchSources: [{ url: "https://example.com/research", title: "Research source" }],
        }),
      ],
    });
  });

  test("rejects malformed metadata without throwing", () => {
    expect(getAssistantTelemetry(null)).toBeNull();
    expect(getAssistantTelemetry({ custom: { telemetry: { requestId: 42 } } })).toBeNull();
    expect(
      getAssistantTelemetry({
        custom: {
          telemetry: {
            requestId: "request-1",
            provider: "openrouter",
            modelId: "example/model",
            startedAt: "invalid-but-display-safe",
            durationMs: Number.NaN,
            contextUtilization: 4,
            steps: [{ index: 1, durationMs: "fast" }],
          },
        },
      }),
    ).toMatchObject({ contextUtilization: 1, steps: [] });
  });

  test("only returns finite usage values", () => {
    expect(
      getAssistantUsage({
        usage: {
          inputTokens: 120,
          outputTokens: Number.POSITIVE_INFINITY,
          totalTokens: "120",
          cachedInputTokens: 24,
        },
      }),
    ).toEqual({ inputTokens: 120, cachedInputTokens: 24 });
  });
});

describe("resolveAssistantContextWindowTelemetry", () => {
  const current = {
    requestId: "current",
    provider: "openrouter",
    modelId: "example/model",
    startedAt: "2026-08-04T10:00:00.000Z",
    contextLength: 128_000,
    steps: [],
  };
  const previousMetadata = {
    custom: {
      telemetry: {
        ...current,
        requestId: "previous",
        completedAt: "2026-08-04T09:59:00.000Z",
        contextUsed: 12_500,
      },
    },
  };

  test("keeps the previous completed reading while a matching request streams", () => {
    expect(resolveAssistantContextWindowTelemetry(current, [previousMetadata])).toMatchObject({
      source: "previous",
      telemetry: { contextUsed: 12_500 },
    });
  });

  test("prefers a current completed reading", () => {
    expect(
      resolveAssistantContextWindowTelemetry({ ...current, contextUsed: 13_000 }, [previousMetadata]),
    ).toMatchObject({ source: "current", telemetry: { contextUsed: 13_000 } });
  });

  test("does not mix readings from a model with another context capacity", () => {
    expect(
      resolveAssistantContextWindowTelemetry(current, [
        {
          custom: {
            telemetry: {
              ...previousMetadata.custom.telemetry,
              modelId: "another/model",
              contextLength: 1_000_000,
            },
          },
        },
      ]),
    ).toBeNull();
  });
});
