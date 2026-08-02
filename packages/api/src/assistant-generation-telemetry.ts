import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

export type OpenRouterGenerationTelemetry = {
  generationId?: string;
  routedProvider?: string;
  providerLatencyMs?: number;
  generationTimeMs?: number;
  moderationLatencyMs?: number;
  providerOutputTokensPerSecond?: number;
  inputTokens?: number;
  outputTokens?: number;
  normalizedInputTokens?: number;
  normalizedOutputTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  cost?: number;
  upstreamCost?: number;
  cacheDiscount?: number;
  finishReason?: string;
  nativeFinishReason?: string;
  serviceTier?: string;
  dataRegion?: string;
  fallbackCount?: number;
  fallbackLatencyMs?: number;
  isByok?: boolean;
  streamed?: boolean;
  cancelled?: boolean;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asFiniteNonNegativeNumber = (value: unknown) => {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

const asString = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : undefined);
const asBoolean = (value: unknown) => (typeof value === "boolean" ? value : undefined);

export const parseOpenRouterGenerationTelemetry = (value: unknown): OpenRouterGenerationTelemetry | null => {
  const root = asRecord(value);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;

  const normalizedInputTokens = asFiniteNonNegativeNumber(data.tokens_prompt);
  const normalizedOutputTokens = asFiniteNonNegativeNumber(data.tokens_completion);
  const inputTokens = asFiniteNonNegativeNumber(data.native_tokens_prompt) ?? normalizedInputTokens;
  const outputTokens = asFiniteNonNegativeNumber(data.native_tokens_completion) ?? normalizedOutputTokens;
  const generationTimeMs = asFiniteNonNegativeNumber(data.generation_time);
  const providerResponses = Array.isArray(data.provider_responses) ? data.provider_responses : undefined;
  const parsedProviderResponses = providerResponses?.map(asRecord).filter((response) => response !== null);
  const failedProviderResponses = parsedProviderResponses?.filter((response) => {
    const status = asFiniteNonNegativeNumber(response.status);
    return status !== undefined && (status < 200 || status >= 300);
  });
  const fallbackCount = providerResponses
    ? failedProviderResponses && failedProviderResponses.length > 0
      ? failedProviderResponses.length
      : Math.max(providerResponses.length - 1, 0)
    : undefined;
  const fallbackLatencies = failedProviderResponses?.map((response) => asFiniteNonNegativeNumber(response.latency));
  const fallbackLatencyMs =
    fallbackLatencies && fallbackLatencies.length > 0 && fallbackLatencies.every((latency) => latency !== undefined)
      ? (fallbackLatencies as number[]).reduce((sum, latency) => sum + latency, 0)
      : undefined;
  const providerOutputTokensPerSecond =
    outputTokens !== undefined && generationTimeMs !== undefined && generationTimeMs > 0
      ? outputTokens / (generationTimeMs / 1000)
      : undefined;
  const generationId = asString(data.id);
  const routedProvider = asString(data.provider_name);
  const finishReason = asString(data.finish_reason);
  const nativeFinishReason = asString(data.native_finish_reason);
  const serviceTier = asString(data.service_tier);
  const dataRegion = asString(data.data_region);

  const telemetry: OpenRouterGenerationTelemetry = {
    ...(generationId ? { generationId } : {}),
    ...(routedProvider ? { routedProvider } : {}),
    ...(asFiniteNonNegativeNumber(data.latency) !== undefined
      ? { providerLatencyMs: asFiniteNonNegativeNumber(data.latency) }
      : {}),
    ...(generationTimeMs !== undefined ? { generationTimeMs } : {}),
    ...(asFiniteNonNegativeNumber(data.moderation_latency) !== undefined
      ? { moderationLatencyMs: asFiniteNonNegativeNumber(data.moderation_latency) }
      : {}),
    ...(providerOutputTokensPerSecond !== undefined ? { providerOutputTokensPerSecond } : {}),
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(normalizedInputTokens !== undefined ? { normalizedInputTokens } : {}),
    ...(normalizedOutputTokens !== undefined ? { normalizedOutputTokens } : {}),
    ...(asFiniteNonNegativeNumber(data.native_tokens_cached) !== undefined
      ? { cachedInputTokens: asFiniteNonNegativeNumber(data.native_tokens_cached) }
      : {}),
    ...(asFiniteNonNegativeNumber(data.native_tokens_reasoning) !== undefined
      ? { reasoningTokens: asFiniteNonNegativeNumber(data.native_tokens_reasoning) }
      : {}),
    ...(asFiniteNonNegativeNumber(data.total_cost) !== undefined
      ? { cost: asFiniteNonNegativeNumber(data.total_cost) }
      : {}),
    ...(asFiniteNonNegativeNumber(data.upstream_inference_cost) !== undefined
      ? { upstreamCost: asFiniteNonNegativeNumber(data.upstream_inference_cost) }
      : {}),
    ...(asFiniteNonNegativeNumber(data.cache_discount) !== undefined
      ? { cacheDiscount: asFiniteNonNegativeNumber(data.cache_discount) }
      : {}),
    ...(finishReason ? { finishReason } : {}),
    ...(nativeFinishReason ? { nativeFinishReason } : {}),
    ...(serviceTier ? { serviceTier } : {}),
    ...(dataRegion ? { dataRegion } : {}),
    ...(fallbackCount !== undefined ? { fallbackCount } : {}),
    ...(fallbackLatencyMs !== undefined ? { fallbackLatencyMs } : {}),
    ...(asBoolean(data.is_byok) !== undefined ? { isByok: asBoolean(data.is_byok) } : {}),
    ...(asBoolean(data.streamed) !== undefined ? { streamed: asBoolean(data.streamed) } : {}),
    ...(asBoolean(data.cancelled) !== undefined ? { cancelled: asBoolean(data.cancelled) } : {}),
  };

  return Object.keys(telemetry).length > 0 ? telemetry : null;
};

export const fetchOpenRouterGenerationTelemetryAsync = async ({
  baseUrl,
  generationId,
  headers,
}: {
  baseUrl: string;
  generationId: string;
  headers: Record<string, string>;
}): Promise<OpenRouterGenerationTelemetry | null> => {
  try {
    const endpoint = new URL(`${baseUrl.replace(/\/$/, "")}/generation`);
    endpoint.searchParams.set("id", generationId);
    const response = await fetchWithTrustedCertificatesAsync(endpoint, { headers, timeout: 3000 });
    if (!response.ok) return null;
    return parseOpenRouterGenerationTelemetry(await response.json());
  } catch {
    return null;
  }
};
