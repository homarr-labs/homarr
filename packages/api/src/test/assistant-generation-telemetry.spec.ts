import { describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));

import {
  fetchOpenRouterGenerationTelemetryAsync,
  parseOpenRouterGenerationTelemetry,
} from "../assistant-generation-telemetry";

describe("parseOpenRouterGenerationTelemetry", () => {
  test("uses provider-native tokens for context and throughput", () => {
    expect(
      parseOpenRouterGenerationTelemetry({
        data: {
          id: "gen-1",
          provider_name: "Alibaba",
          latency: 964,
          generation_time: 1451,
          moderation_latency: 12,
          tokens_prompt: 13_343,
          tokens_completion: 62,
          native_tokens_prompt: 12_777,
          native_tokens_completion: 55,
          native_tokens_cached: 2048,
          native_tokens_reasoning: 7,
          total_cost: 0.00041,
          upstream_inference_cost: 0.00039,
          cache_discount: 0.00003,
          finish_reason: "stop",
          native_finish_reason: "stop",
          service_tier: "default",
          data_region: "US",
          provider_responses: [
            { status: 429, latency: 620 },
            { status: 200, latency: 964 },
          ],
          is_byok: false,
          streamed: true,
          cancelled: false,
        },
      }),
    ).toMatchObject({
      generationId: "gen-1",
      routedProvider: "Alibaba",
      providerLatencyMs: 964,
      generationTimeMs: 1451,
      providerOutputTokensPerSecond: 37.90489317711923,
      inputTokens: 12_777,
      outputTokens: 55,
      normalizedInputTokens: 13_343,
      normalizedOutputTokens: 62,
      cachedInputTokens: 2048,
      reasoningTokens: 7,
      cost: 0.00041,
      upstreamCost: 0.00039,
      cacheDiscount: 0.00003,
      fallbackCount: 1,
      fallbackLatencyMs: 620,
      serviceTier: "default",
      dataRegion: "US",
    });
  });

  test("returns null for malformed generation data", () => {
    expect(parseOpenRouterGenerationTelemetry(null)).toBeNull();
    expect(parseOpenRouterGenerationTelemetry({ data: [] })).toBeNull();
    expect(parseOpenRouterGenerationTelemetry({ data: { latency: -1, total_cost: "invalid" } })).toBeNull();
  });

  test("does not count additional successful provider responses as fallbacks", () => {
    expect(
      parseOpenRouterGenerationTelemetry({
        id: "gen-success",
        provider_responses: [
          { status: 200, latency: 100 },
          { status: 200, latency: 120 },
        ],
      }),
    ).toMatchObject({ fallbackCount: 0 });
  });

  test("caches completed generation records", async () => {
    const mockedFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
    mockedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: "gen-cached", native_tokens_completion: 4 } }),
    } as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>);
    const input = {
      baseUrl: "https://openrouter.ai/api/v1",
      generationId: "gen-cached",
      headers: { Authorization: "Bearer test" },
    };

    await expect(fetchOpenRouterGenerationTelemetryAsync(input)).resolves.toMatchObject({
      generationId: "gen-cached",
      outputTokens: 4,
    });
    await expect(fetchOpenRouterGenerationTelemetryAsync(input)).resolves.toMatchObject({
      generationId: "gen-cached",
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});
