import type { UIMessage } from "ai";

export type AssistantUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
};

export type AssistantWebSearchSource = {
  url: string;
  title?: string;
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
  webSearchSources?: AssistantWebSearchSource[];
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
  webSearchSources?: AssistantWebSearchSource[];
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

export type AssistantContextWindowTelemetry = {
  telemetry: AssistantRequestTelemetry;
  source: "current" | "previous";
};

export type AssistantConversationTurnUsage = {
  requestId: string;
  provider: string;
  modelId: string;
  startedAt: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  cost?: number;
  durationMs?: number;
  contextUsed?: number;
  contextLength?: number;
  usage: AssistantUsage;
  telemetry: AssistantRequestTelemetry;
};

export type AssistantConversationUsage = {
  turns: AssistantConversationTurnUsage[];
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  cost: number;
  contextUsed?: number;
  contextLength?: number;
};

const getFiniteNonNegativeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

const getWebSearchSources = (value: unknown): AssistantWebSearchSource[] => {
  if (!Array.isArray(value)) return [];
  const sources = new Map<string, AssistantWebSearchSource>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.url !== "string" || !URL.canParse(candidate.url)) continue;
    const url = new URL(candidate.url);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) continue;
    const title = typeof candidate.title === "string" ? candidate.title.trim().slice(0, 200) : "";
    if (!sources.has(url.href)) sources.set(url.href, { url: url.href, ...(title ? { title } : {}) });
    if (sources.size >= 12) break;
  }
  return [...sources.values()];
};

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
            ...(getWebSearchSources(candidate.webSearchSources).length > 0
              ? { webSearchSources: getWebSearchSources(candidate.webSearchSources) }
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
    ...(getWebSearchSources(value.webSearchSources).length > 0
      ? { webSearchSources: getWebSearchSources(value.webSearchSources) }
      : {}),
    ...(value.costType === "reported" || value.costType === "estimated" ? { costType: value.costType } : {}),
    ...(typeof value.finishReason === "string" ? { finishReason: value.finishReason } : {}),
  };
};

const sumReportedStepMetric = (
  steps: AssistantRequestStep[],
  getValue: (step: AssistantRequestStep) => number | undefined,
) => {
  const values = steps.flatMap((step) => {
    const value = getValue(step);
    return value === undefined ? [] : [value];
  });
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : undefined;
};

/**
 * Produces a stable conversation-level usage snapshot from persisted message metadata.
 *
 * A newly-created or streaming message can temporarily have no usage metadata. Keeping
 * the latest complete context reading from earlier turns avoids flashing the composer
 * meter back to zero while the next request starts or when its popover is reopened.
 */
export const getAssistantConversationUsage = (messageMetadata: unknown[]): AssistantConversationUsage => {
  const turnsByRequestId = new Map<string, AssistantConversationTurnUsage>();

  for (const metadata of messageMetadata) {
    const telemetry = getAssistantTelemetry(metadata);
    if (!telemetry) continue;

    const usage = getAssistantUsage(metadata);
    const inputTokens = usage?.inputTokens ?? sumReportedStepMetric(telemetry.steps, (step) => step.inputTokens);
    const outputTokens = usage?.outputTokens ?? sumReportedStepMetric(telemetry.steps, (step) => step.outputTokens);
    const totalTokens =
      usage?.totalTokens ??
      (inputTokens !== undefined || outputTokens !== undefined ? (inputTokens ?? 0) + (outputTokens ?? 0) : undefined);
    const cachedInputTokens =
      usage?.cachedInputTokens ?? sumReportedStepMetric(telemetry.steps, (step) => step.cachedInputTokens);
    const reasoningTokens =
      usage?.reasoningTokens ?? sumReportedStepMetric(telemetry.steps, (step) => step.reasoningTokens);
    const cost = telemetry.cost ?? sumReportedStepMetric(telemetry.steps, (step) => step.cost);

    turnsByRequestId.set(telemetry.requestId, {
      requestId: telemetry.requestId,
      provider: telemetry.provider,
      modelId: telemetry.modelId,
      startedAt: telemetry.startedAt,
      ...(inputTokens !== undefined ? { inputTokens } : {}),
      ...(outputTokens !== undefined ? { outputTokens } : {}),
      ...(totalTokens !== undefined ? { totalTokens } : {}),
      ...(cachedInputTokens !== undefined ? { cachedInputTokens } : {}),
      ...(reasoningTokens !== undefined ? { reasoningTokens } : {}),
      ...(cost !== undefined ? { cost } : {}),
      ...(telemetry.durationMs !== undefined ? { durationMs: telemetry.durationMs } : {}),
      ...(telemetry.contextUsed !== undefined ? { contextUsed: telemetry.contextUsed } : {}),
      ...(telemetry.contextLength !== undefined ? { contextLength: telemetry.contextLength } : {}),
      usage: usage ?? {},
      telemetry,
    });
  }

  const turns = [...turnsByRequestId.values()];
  const latestContextTurn = turns.findLast(
    (turn) => turn.contextUsed !== undefined && turn.contextLength !== undefined,
  );
  const sum = (getValue: (turn: AssistantConversationTurnUsage) => number | undefined) =>
    turns.reduce((total, turn) => total + (getValue(turn) ?? 0), 0);

  return {
    turns,
    inputTokens: sum((turn) => turn.inputTokens),
    outputTokens: sum((turn) => turn.outputTokens),
    totalTokens: sum((turn) => turn.totalTokens),
    cachedInputTokens: sum((turn) => turn.cachedInputTokens),
    reasoningTokens: sum((turn) => turn.reasoningTokens),
    cost: sum((turn) => turn.cost),
    ...(latestContextTurn?.contextUsed !== undefined ? { contextUsed: latestContextTurn.contextUsed } : {}),
    ...(latestContextTurn?.contextLength !== undefined ? { contextLength: latestContextTurn.contextLength } : {}),
  };
};

export const resolveAssistantContextWindowTelemetry = (
  current: AssistantRequestTelemetry,
  previousMetadata: unknown[],
): AssistantContextWindowTelemetry | null => {
  if (current.contextLength !== undefined && current.contextUsed !== undefined) {
    return { telemetry: current, source: "current" };
  }

  for (const metadata of previousMetadata.toReversed()) {
    const previous = getAssistantTelemetry(metadata);
    if (
      previous?.completedAt &&
      previous.requestId !== current.requestId &&
      previous.modelId === current.modelId &&
      previous.contextLength === current.contextLength &&
      previous.contextUsed !== undefined
    ) {
      return { telemetry: previous, source: "previous" };
    }
  }
  return null;
};
