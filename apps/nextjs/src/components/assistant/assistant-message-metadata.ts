import type { UIMessage } from "ai";

export type AssistantUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
};

export type AssistantRequestStep = {
  index: number;
  durationMs: number;
  modelDurationMs: number;
  toolDurationMs: number;
  timeToFirstOutputMs?: number;
  outputTokensPerSecond?: number;
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
  generationId?: string;
  generationAccessToken?: string;
  routedProvider?: string;
  finishReason?: string;
  nativeFinishReason?: string;
  serviceTier?: string;
  dataRegion?: string;
  routerStrategy?: string;
  routerRegion?: string;
  fallbackCount?: number;
  fallbackLatencyMs?: number;
  webSearchRequests?: number;
  isByok?: boolean;
  streamed?: boolean;
  cancelled?: boolean;
};

export type AssistantRequestTelemetry = {
  requestId: string;
  provider: string;
  modelId: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  timeToFirstOutputMs?: number;
  outputTokensPerSecond?: number;
  providerOutputTokensPerSecond?: number;
  generationTimeMs?: number;
  contextLength?: number;
  contextUsed?: number;
  contextUtilization?: number;
  cost?: number;
  upstreamCost?: number;
  cacheDiscount?: number;
  fallbackCount?: number;
  fallbackLatencyMs?: number;
  webSearchRequests?: number;
  costType?: "reported" | "estimated";
  finishReason?: string;
  steps: AssistantRequestStep[];
};

export type AssistantMessageMetadata = {
  usage?: AssistantUsage;
  custom: {
    telemetry: AssistantRequestTelemetry;
  };
};

export type AssistantUIMessage = UIMessage<AssistantMessageMetadata>;

const getFiniteNonNegativeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

export const getAssistantUsage = (metadata: unknown): AssistantUsage | null => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || !("usage" in metadata)) return null;
  const usage = metadata.usage;
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return null;
  const value = usage as Record<string, unknown>;
  return {
    ...(getFiniteNonNegativeNumber(value.inputTokens) !== undefined
      ? { inputTokens: getFiniteNonNegativeNumber(value.inputTokens) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.outputTokens) !== undefined
      ? { outputTokens: getFiniteNonNegativeNumber(value.outputTokens) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.totalTokens) !== undefined
      ? { totalTokens: getFiniteNonNegativeNumber(value.totalTokens) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.reasoningTokens) !== undefined
      ? { reasoningTokens: getFiniteNonNegativeNumber(value.reasoningTokens) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.cachedInputTokens) !== undefined
      ? { cachedInputTokens: getFiniteNonNegativeNumber(value.cachedInputTokens) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.cacheWriteTokens) !== undefined
      ? { cacheWriteTokens: getFiniteNonNegativeNumber(value.cacheWriteTokens) }
      : {}),
  };
};

export const getAssistantTelemetry = (metadata: unknown): AssistantRequestTelemetry | null => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const custom = (metadata as { custom?: unknown }).custom;
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) return null;
  const telemetry = (custom as { telemetry?: unknown }).telemetry;
  if (!telemetry || typeof telemetry !== "object" || Array.isArray(telemetry)) return null;
  const value = telemetry as Partial<AssistantRequestTelemetry>;
  if (
    typeof value.requestId !== "string" ||
    typeof value.provider !== "string" ||
    typeof value.modelId !== "string" ||
    typeof value.startedAt !== "string"
  ) {
    return null;
  }
  const steps = Array.isArray(value.steps)
    ? value.steps.flatMap((step): AssistantRequestStep[] => {
        if (!step || typeof step !== "object" || Array.isArray(step)) return [];
        const candidate = step as Record<string, unknown>;
        const index = getFiniteNonNegativeNumber(candidate.index);
        const durationMs = getFiniteNonNegativeNumber(candidate.durationMs);
        const modelDurationMs = getFiniteNonNegativeNumber(candidate.modelDurationMs);
        const toolDurationMs = getFiniteNonNegativeNumber(candidate.toolDurationMs);
        if (
          index === undefined ||
          durationMs === undefined ||
          modelDurationMs === undefined ||
          toolDurationMs === undefined
        )
          return [];
        return [
          {
            index,
            durationMs,
            modelDurationMs,
            toolDurationMs,
            ...(getFiniteNonNegativeNumber(candidate.timeToFirstOutputMs) !== undefined
              ? { timeToFirstOutputMs: getFiniteNonNegativeNumber(candidate.timeToFirstOutputMs) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.outputTokensPerSecond) !== undefined
              ? { outputTokensPerSecond: getFiniteNonNegativeNumber(candidate.outputTokensPerSecond) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.providerLatencyMs) !== undefined
              ? { providerLatencyMs: getFiniteNonNegativeNumber(candidate.providerLatencyMs) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.generationTimeMs) !== undefined
              ? { generationTimeMs: getFiniteNonNegativeNumber(candidate.generationTimeMs) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.moderationLatencyMs) !== undefined
              ? { moderationLatencyMs: getFiniteNonNegativeNumber(candidate.moderationLatencyMs) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.providerOutputTokensPerSecond) !== undefined
              ? { providerOutputTokensPerSecond: getFiniteNonNegativeNumber(candidate.providerOutputTokensPerSecond) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.inputTokens) !== undefined
              ? { inputTokens: getFiniteNonNegativeNumber(candidate.inputTokens) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.outputTokens) !== undefined
              ? { outputTokens: getFiniteNonNegativeNumber(candidate.outputTokens) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.normalizedInputTokens) !== undefined
              ? { normalizedInputTokens: getFiniteNonNegativeNumber(candidate.normalizedInputTokens) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.normalizedOutputTokens) !== undefined
              ? { normalizedOutputTokens: getFiniteNonNegativeNumber(candidate.normalizedOutputTokens) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.cachedInputTokens) !== undefined
              ? { cachedInputTokens: getFiniteNonNegativeNumber(candidate.cachedInputTokens) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.reasoningTokens) !== undefined
              ? { reasoningTokens: getFiniteNonNegativeNumber(candidate.reasoningTokens) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.cost) !== undefined
              ? { cost: getFiniteNonNegativeNumber(candidate.cost) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.upstreamCost) !== undefined
              ? { upstreamCost: getFiniteNonNegativeNumber(candidate.upstreamCost) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.cacheDiscount) !== undefined
              ? { cacheDiscount: getFiniteNonNegativeNumber(candidate.cacheDiscount) }
              : {}),
            ...(typeof candidate.generationId === "string" ? { generationId: candidate.generationId } : {}),
            ...(typeof candidate.generationAccessToken === "string"
              ? { generationAccessToken: candidate.generationAccessToken }
              : {}),
            ...(typeof candidate.routedProvider === "string" ? { routedProvider: candidate.routedProvider } : {}),
            ...(typeof candidate.finishReason === "string" ? { finishReason: candidate.finishReason } : {}),
            ...(typeof candidate.nativeFinishReason === "string"
              ? { nativeFinishReason: candidate.nativeFinishReason }
              : {}),
            ...(typeof candidate.serviceTier === "string" ? { serviceTier: candidate.serviceTier } : {}),
            ...(typeof candidate.dataRegion === "string" ? { dataRegion: candidate.dataRegion } : {}),
            ...(typeof candidate.routerStrategy === "string" ? { routerStrategy: candidate.routerStrategy } : {}),
            ...(typeof candidate.routerRegion === "string" ? { routerRegion: candidate.routerRegion } : {}),
            ...(getFiniteNonNegativeNumber(candidate.fallbackCount) !== undefined
              ? { fallbackCount: getFiniteNonNegativeNumber(candidate.fallbackCount) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.fallbackLatencyMs) !== undefined
              ? { fallbackLatencyMs: getFiniteNonNegativeNumber(candidate.fallbackLatencyMs) }
              : {}),
            ...(getFiniteNonNegativeNumber(candidate.webSearchRequests) !== undefined
              ? { webSearchRequests: getFiniteNonNegativeNumber(candidate.webSearchRequests) }
              : {}),
            ...(typeof candidate.isByok === "boolean" ? { isByok: candidate.isByok } : {}),
            ...(typeof candidate.streamed === "boolean" ? { streamed: candidate.streamed } : {}),
            ...(typeof candidate.cancelled === "boolean" ? { cancelled: candidate.cancelled } : {}),
          },
        ];
      })
    : [];
  return {
    requestId: value.requestId,
    provider: value.provider,
    modelId: value.modelId,
    startedAt: value.startedAt,
    steps,
    ...(typeof value.completedAt === "string" ? { completedAt: value.completedAt } : {}),
    ...(getFiniteNonNegativeNumber(value.durationMs) !== undefined
      ? { durationMs: getFiniteNonNegativeNumber(value.durationMs) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.timeToFirstOutputMs) !== undefined
      ? { timeToFirstOutputMs: getFiniteNonNegativeNumber(value.timeToFirstOutputMs) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.outputTokensPerSecond) !== undefined
      ? { outputTokensPerSecond: getFiniteNonNegativeNumber(value.outputTokensPerSecond) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.providerOutputTokensPerSecond) !== undefined
      ? { providerOutputTokensPerSecond: getFiniteNonNegativeNumber(value.providerOutputTokensPerSecond) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.generationTimeMs) !== undefined
      ? { generationTimeMs: getFiniteNonNegativeNumber(value.generationTimeMs) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.contextLength) !== undefined
      ? { contextLength: getFiniteNonNegativeNumber(value.contextLength) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.contextUsed) !== undefined
      ? { contextUsed: getFiniteNonNegativeNumber(value.contextUsed) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.contextUtilization) !== undefined
      ? { contextUtilization: Math.min(getFiniteNonNegativeNumber(value.contextUtilization) ?? 0, 1) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.cost) !== undefined ? { cost: getFiniteNonNegativeNumber(value.cost) } : {}),
    ...(getFiniteNonNegativeNumber(value.upstreamCost) !== undefined
      ? { upstreamCost: getFiniteNonNegativeNumber(value.upstreamCost) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.cacheDiscount) !== undefined
      ? { cacheDiscount: getFiniteNonNegativeNumber(value.cacheDiscount) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.fallbackCount) !== undefined
      ? { fallbackCount: getFiniteNonNegativeNumber(value.fallbackCount) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.fallbackLatencyMs) !== undefined
      ? { fallbackLatencyMs: getFiniteNonNegativeNumber(value.fallbackLatencyMs) }
      : {}),
    ...(getFiniteNonNegativeNumber(value.webSearchRequests) !== undefined
      ? { webSearchRequests: getFiniteNonNegativeNumber(value.webSearchRequests) }
      : {}),
    ...(value.costType === "reported" || value.costType === "estimated" ? { costType: value.costType } : {}),
    ...(typeof value.finishReason === "string" ? { finishReason: value.finishReason } : {}),
  };
};
