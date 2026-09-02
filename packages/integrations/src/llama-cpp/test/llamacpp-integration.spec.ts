// @vitest-environment node
import { ParseError } from "@homarr/common/server";
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../base/types";
import { LlamacppIntegration } from "../llamacpp-integration";
import {
  avgTokensPerSecond,
  mapContextUsage,
  mapLlamacppModel,
  parsePrometheusMetrics,
} from "../llamacpp-types";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "http://llamacpp.example.com";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const sampleModel = {
  id: "/root/models/unsloth/Qwen3.8-27B-UD-Q4_K_XL.gguf",
  meta: {
    n_ctx: 131072,
    n_params: 27320697856,
    size: 17912397824,
    ftype: "Q4_K - Small",
  },
};

const sampleModelsResponse = {
  data: [sampleModel],
};

const sampleMetricsText = [
  "# HELP llamacpp:prompt_tokens_total Total number of tokens processed",
  "# TYPE llamacpp:prompt_tokens_total counter",
  "llamacpp:prompt_tokens_total 69834",
  "llamacpp:prompt_seconds_total 23278",
  "llamacpp:prompt_tokens_cached_total 12000",
  "llamacpp:tokens_predicted_total 12161",
  "llamacpp:tokens_predicted_seconds_total 380.03125",
  "llamacpp:requests_processing 1",
  "llamacpp:requests_deferred 0",
  "llamacpp:predicted_tokens_seconds 32.8472",
  "llamacpp:prompt_tokens_seconds 1500.5",
].join("\n");

const sampleSlotsResponse = [
  {
    id: 0,
    n_ctx: 131072,
    n_prompt_tokens: 101076,
    is_processing: false,
  },
];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;

const textResponse = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;

const createIntegration = (decryptedSecrets: IntegrationSecret[] = []) =>
  new LlamacppIntegration({
    id: "test-llamacpp",
    name: "Test llama.cpp",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets,
  });

const mockAllEndpoints = () => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((async (input) => {
    const url = String(input);
    if (url.includes("/health")) {
      return jsonResponse({ status: "ok" });
    }
    if (url.includes("/v1/models")) {
      return jsonResponse(sampleModelsResponse);
    }
    if (url.includes("/metrics")) {
      return textResponse(sampleMetricsText);
    }
    if (url.includes("/slots")) {
      return jsonResponse(sampleSlotsResponse);
    }
    return textResponse("not found", 404);
  }) as typeof fetchWithTrustedCertificatesAsync);
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe("parsePrometheusMetrics", () => {
  test("parses metric lines and skips comments and HELP/TYPE lines", () => {
    const metrics = parsePrometheusMetrics(sampleMetricsText);

    expect(metrics).toStrictEqual([
      { name: "llamacpp:prompt_tokens_total", value: 69834 },
      { name: "llamacpp:prompt_seconds_total", value: 23278 },
      { name: "llamacpp:prompt_tokens_cached_total", value: 12000 },
      { name: "llamacpp:tokens_predicted_total", value: 12161 },
      { name: "llamacpp:tokens_predicted_seconds_total", value: 380.03125 },
      { name: "llamacpp:requests_processing", value: 1 },
      { name: "llamacpp:requests_deferred", value: 0 },
      { name: "llamacpp:predicted_tokens_seconds", value: 32.8472 },
      { name: "llamacpp:prompt_tokens_seconds", value: 1500.5 },
    ]);
  });

  test("parses metric lines with labels and skips non-numeric values", () => {
    const metrics = parsePrometheusMetrics(
      [
        'llamacpp:requests_by_status{status="ok"} 5',
        "llamacpp:uptime_seconds +Inf",
        "llamacpp:nan_metric NaN",
        "",
      ].join("\n"),
    );

    expect(metrics).toStrictEqual([{ name: "llamacpp:requests_by_status", value: 5 }]);
  });

  test("returns an empty array for empty input", () => {
    expect(parsePrometheusMetrics("")).toStrictEqual([]);
  });
});

describe("mapLlamacppModel", () => {
  test("extracts a short display name and metadata fields", () => {
    const model = mapLlamacppModel(sampleModel);

    expect(model).toStrictEqual({
      id: "/root/models/unsloth/Qwen3.8-27B-UD-Q4_K_XL.gguf",
      name: "Qwen3.8-27B-UD-Q4_K_XL",
      contextSize: 131072,
      parameterCount: 27320697856,
      fileSizeBytes: 17912397824,
      quantization: "Q4_K - Small",
    });
  });

  test("returns null metadata when meta is missing", () => {
    const model = mapLlamacppModel({ id: "models/foo.gguf" });

    expect(model).toStrictEqual({
      id: "models/foo.gguf",
      name: "foo",
      contextSize: null,
      parameterCount: null,
      fileSizeBytes: null,
      quantization: null,
    });
  });
});

describe("mapContextUsage", () => {
  test("computes percent from the first slot with valid n_ctx and n_prompt_tokens", () => {
    expect(mapContextUsage(sampleSlotsResponse)).toStrictEqual({
      usedTokens: 101076,
      contextSize: 131072,
      percent: 77.1,
    });
  });

  test("returns null for missing, non-array, or malformed slots", () => {
    expect(mapContextUsage(null)).toBeNull();
    expect(mapContextUsage([{ n_ctx: 0, n_prompt_tokens: 10 }])).toBeNull();
    expect(mapContextUsage([{ n_prompt_tokens: 10 }])).toBeNull();
    expect(mapContextUsage(["not-an-object", null])).toBeNull();
  });

  test("clamps the percentage to 100", () => {
    expect(mapContextUsage([{ n_ctx: 10, n_prompt_tokens: 50 }])).toStrictEqual({
      usedTokens: 50,
      contextSize: 10,
      percent: 100,
    });
  });
});

describe("avgTokensPerSecond", () => {
  test("divides cumulative counters", () => {
    expect(avgTokensPerSecond(12161, 380.03125)).toBe(32);
  });

  test("returns null when either counter is missing or seconds are zero", () => {
    expect(avgTokensPerSecond(null, 5)).toBeNull();
    expect(avgTokensPerSecond(10, null)).toBeNull();
    expect(avgTokensPerSecond(10, 0)).toBeNull();
  });
});

describe("LlamacppIntegration getStatsAsync", () => {
  test("fetches health, models, metrics and slots and maps them into stats", async () => {
    mockAllEndpoints();

    const stats = await createIntegration().getStatsAsync();

    expect(stats).toStrictEqual({
      health: "ok",
      model: {
        id: "/root/models/unsloth/Qwen3.8-27B-UD-Q4_K_XL.gguf",
        name: "Qwen3.8-27B-UD-Q4_K_XL",
        contextSize: 131072,
        parameterCount: 27320697856,
        fileSizeBytes: 17912397824,
        quantization: "Q4_K - Small",
      },
      contextUsage: {
        usedTokens: 101076,
        contextSize: 131072,
        percent: 77.1,
      },
      metrics: {
        generationSpeedTps: 32.8472,
        promptSpeedTps: 1500.5,
        avgGenerationSpeedTps: 32,
        avgPromptSpeedTps: 3,
        requestsProcessing: 1,
        requestsDeferred: 0,
        tokensProcessed: 69834,
        tokensGenerated: 12161,
        promptCacheHitRate: 15,
      },
    });

    const requestedUrls = mockFetch.mock.calls.map((call) => String(call[0])).toSorted();
    expect(requestedUrls).toStrictEqual(
      [`${TEST_URL}/health`, `${TEST_URL}/metrics`, `${TEST_URL}/slots`, `${TEST_URL}/v1/models`].toSorted(),
    );
  });

  test("returns null model when the server has no models loaded", async () => {
    mockAllEndpoints();
    mockFetch.mockImplementation((async (input) => {
      const url = String(input);
      if (url.includes("/v1/models")) {
        return jsonResponse({ data: [] });
      }
      if (url.includes("/health")) {
        return jsonResponse({ status: "ok" });
      }
      if (url.includes("/slots")) {
        return jsonResponse([]);
      }
      return textResponse(sampleMetricsText);
    }) as typeof fetchWithTrustedCertificatesAsync);

    const stats = await createIntegration().getStatsAsync();

    expect(stats.model).toBeNull();
    expect(stats.metrics.generationSpeedTps).toBe(32.8472);
  });

  test("returns null for metrics that are absent from /metrics", async () => {
    mockAllEndpoints();
    mockFetch.mockImplementation((async (input) => {
      const url = String(input);
      if (url.includes("/health")) {
        return jsonResponse({ status: "ok" });
      }
      if (url.includes("/v1/models")) {
        return jsonResponse({ data: [] });
      }
      if (url.includes("/slots")) {
        return jsonResponse([]);
      }
      return textResponse("");
    }) as typeof fetchWithTrustedCertificatesAsync);

    const stats = await createIntegration().getStatsAsync();

    expect(stats.metrics).toStrictEqual({
      generationSpeedTps: null,
      promptSpeedTps: null,
      avgGenerationSpeedTps: null,
      avgPromptSpeedTps: null,
      requestsProcessing: null,
      requestsDeferred: null,
      tokensProcessed: null,
      tokensGenerated: null,
      promptCacheHitRate: null,
    });
  });

  test("throws when the /health endpoint returns an error status", async () => {
    mockAllEndpoints();
    mockFetch.mockImplementation((async (input) => {
      const url = String(input);
      if (url.includes("/health")) {
        return textResponse("Service Unavailable", 503);
      }
      return jsonResponse({ status: "ok" });
    }) as typeof fetchWithTrustedCertificatesAsync);

    await expect(createIntegration().getStatsAsync()).rejects.toThrow();
  });

  test("throws a parse error when /v1/models is not valid JSON", async () => {
    mockAllEndpoints();
    mockFetch.mockImplementation((async (input) => {
      const url = String(input);
      if (url.includes("/v1/models")) {
        return textResponse("not-json");
      }
      if (url.includes("/health")) {
        return jsonResponse({ status: "ok" });
      }
      if (url.includes("/slots")) {
        return jsonResponse([]);
      }
      return textResponse(sampleMetricsText);
    }) as typeof fetchWithTrustedCertificatesAsync);

    await expect(createIntegration().getStatsAsync()).rejects.toSatisfy((error) => {
      if (!(error instanceof Error)) return false;
      const cause = error.cause;
      return cause instanceof ParseError && cause.message.includes("Invalid llama.cpp /v1/models response");
    });
  });
});
