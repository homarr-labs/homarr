import { ParseError } from "@homarr/common/server";
import { z } from "zod/v4";

export const LLMACPP_HEALTH_PARSE_ERROR_MESSAGE = "Invalid llama.cpp /health response";
export const LLMACPP_MODELS_PARSE_ERROR_MESSAGE = "Invalid llama.cpp /v1/models response";

export const parsePrometheusMetrics = (text: string): { name: string; value: number }[] => {
  const metrics: { name: string; value: number }[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const match = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{[^}]*\})?\s+(-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|NaN)$/.exec(
      line,
    );
    if (!match) {
      continue;
    }

    const name = match[1];
    const rawValue = match[2];
    if (!name || rawValue === undefined) {
      continue;
    }

    const value = Number.parseFloat(rawValue);
    if (!Number.isFinite(value)) {
      continue;
    }

    metrics.push({ name, value });
  }

  return metrics;
};

export const llamacppHealthSchema = z.object({
  status: z.string(),
});

const llamacppModelMetaSchema = z
  .object({
    n_ctx: z.number().optional(),
    n_params: z.number().optional(),
    size: z.number().optional(),
    ftype: z.string().optional(),
  })
  .optional();

const llamacppModelSchema = z.object({
  id: z.string(),
  meta: llamacppModelMetaSchema,
});

export const llamacppModelsSchema = z.object({
  data: z.array(llamacppModelSchema),
});

export interface LlamacppModel {
  id: string;
  name: string;
  contextSize: number | null;
  parameterCount: number | null;
  fileSizeBytes: number | null;
  quantization: string | null;
}

export interface LlamacppPerRequest {
  taskId: number | null;
  decodedTokens: number | null;
}

export interface LlamacppStats {
  health: string;
  model: LlamacppModel | null;
  contextUsage: LlamacppContextUsage | null;
  metrics: {
    generationSpeedTps: number | null;
    promptSpeedTps: number | null;
    avgGenerationSpeedTps: number | null;
    avgPromptSpeedTps: number | null;
    requestsProcessing: number | null;
    requestsDeferred: number | null;
    tokensProcessed: number | null;
    tokensGenerated: number | null;
    promptCacheHitRate: number | null;
    requestDecodedTokens: number | null;
    taskId: number | null;
  };
}

const shortModelName = (id: string): string =>
  id
    .split("/")
    .pop()
    ?.replace(/\.gguf$/i, "") ?? id;

export const mapLlamacppModel = (model: z.infer<typeof llamacppModelSchema>): LlamacppModel => ({
  id: model.id,
  name: shortModelName(model.id),
  contextSize: model.meta?.n_ctx ?? null,
  parameterCount: model.meta?.n_params ?? null,
  fileSizeBytes: model.meta?.size ?? null,
  quantization: model.meta?.ftype ?? null,
});

export const getMetricValue = (metrics: readonly { name: string; value: number }[], name: string): number | null =>
  metrics.find((metric) => metric.name === name)?.value ?? null;

/**
 * Averages cumulative counters (tokens ÷ seconds) so a stable number is available while
 * the server is idle, mirroring how llama-monitor derives its always-on speeds.
 */
export const avgTokensPerSecond = (tokens: number | null, seconds: number | null): number | null =>
  tokens !== null && seconds !== null && seconds > 0 ? tokens / seconds : null;

interface LlamacppSlot {
  n_ctx?: number;
  n_prompt_tokens?: number;
  id_task?: number;
  is_processing?: boolean;
  next_token?: { n_decoded?: number }[];
}

export interface LlamacppContextUsage {
  usedTokens: number;
  contextSize: number;
  percent: number;
}

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

/**
 * Computes context (KV) usage from the /slots endpoint. The /metrics endpoint has no
 * KV metrics, so the largest used prompt tokens over the slot context size is used.
 */
export const mapContextUsage = (slots: readonly unknown[] | null): LlamacppContextUsage | null => {
  if (!Array.isArray(slots)) {
    return null;
  }

  for (const slot of slots) {
    if (typeof slot !== "object" || slot === null) {
      continue;
    }

    const record = slot as Partial<LlamacppSlot>;
    const contextSize = record.n_ctx;
    const usedTokens = record.n_prompt_tokens;

    if (typeof contextSize === "number" && contextSize > 0 && typeof usedTokens === "number" && usedTokens >= 0) {
      return {
        usedTokens,
        contextSize,
        percent: clampPercent(Math.round((usedTokens / contextSize) * 1000) / 10),
      };
    }
  }

  return null;
};

/**
 * Extracts the active request's identity and generated-token count from /slots. `id_task`
 * identifies the in-flight request (llama.cpp task IDs are monotonically increasing and
 * never reused) and `next_token[0].n_decoded` is `stats.n_gen`, the tokens this request has
 * generated so far, which the server resets to 0 whenever a new generation starts. The widget
 * takes deltas between polls to derive the per-request average speed.
 */
export const mapLlamacppPerRequest = (slots: readonly unknown[] | null): LlamacppPerRequest => {
  if (!Array.isArray(slots)) {
    return { taskId: null, decodedTokens: null };
  }

  for (const slot of slots) {
    if (typeof slot !== "object" || slot === null) {
      continue;
    }

    const record = slot as LlamacppSlot;
    if (record.is_processing !== true) {
      continue;
    }

    const taskId = typeof record.id_task === "number" ? record.id_task : null;
    const nextToken = record.next_token?.[0];
    const decodedTokens = typeof nextToken?.n_decoded === "number" ? nextToken.n_decoded : null;

    return { taskId, decodedTokens };
  }

  return { taskId: null, decodedTokens: null };
};

export const requestSpeedTps = (tokens: number | null, elapsedSeconds: number | null): number | null => {
  if (tokens === null || elapsedSeconds === null || elapsedSeconds <= 0) {
    return null;
  }
  const speed = tokens / elapsedSeconds;
  return Number.isFinite(speed) && speed > 0 ? speed : null;
};

export const parseLlamacppSlotsAsync = async (response: {
  json: () => Promise<unknown>;
}): Promise<unknown[] | null> => {
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new ParseError("Invalid llama.cpp /slots response", {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }

  return Array.isArray(json) ? json : null;
};

export const mapLlamacppStats = (
  health: z.infer<typeof llamacppHealthSchema>,
  model: LlamacppModel | null,
  metrics: readonly { name: string; value: number }[],
  contextUsage: LlamacppContextUsage | null,
  perRequest: LlamacppPerRequest,
): LlamacppStats => {
  const promptTokens = getMetricValue(metrics, "llamacpp:prompt_tokens_total");
  const cachedTokens = getMetricValue(metrics, "llamacpp:prompt_tokens_cached_total");

  const promptCacheHitRate =
    promptTokens !== null && cachedTokens !== null && promptTokens + cachedTokens > 0
      ? Math.round((cachedTokens / (promptTokens + cachedTokens)) * 100)
      : null;

  return {
    health: health.status,
    model,
    contextUsage,
    metrics: {
      generationSpeedTps: getMetricValue(metrics, "llamacpp:predicted_tokens_seconds"),
      promptSpeedTps: getMetricValue(metrics, "llamacpp:prompt_tokens_seconds"),
      avgGenerationSpeedTps: avgTokensPerSecond(
        getMetricValue(metrics, "llamacpp:tokens_predicted_total"),
        getMetricValue(metrics, "llamacpp:tokens_predicted_seconds_total"),
      ),
      avgPromptSpeedTps: avgTokensPerSecond(
        getMetricValue(metrics, "llamacpp:prompt_tokens_total"),
        getMetricValue(metrics, "llamacpp:prompt_seconds_total"),
      ),
      requestsProcessing: getMetricValue(metrics, "llamacpp:requests_processing"),
      requestsDeferred: getMetricValue(metrics, "llamacpp:requests_deferred"),
      tokensProcessed: getMetricValue(metrics, "llamacpp:prompt_tokens_total"),
      tokensGenerated: getMetricValue(metrics, "llamacpp:tokens_predicted_total"),
      promptCacheHitRate,
      requestDecodedTokens: perRequest.decodedTokens,
      taskId: perRequest.taskId,
    },
  };
};

export const parseLlamacppHealthAsync = async (response: {
  json: () => Promise<unknown>;
}): Promise<z.infer<typeof llamacppHealthSchema>> => {
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new ParseError(LLMACPP_HEALTH_PARSE_ERROR_MESSAGE, {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }

  const result = await llamacppHealthSchema.safeParseAsync(json);
  if (!result.success) {
    throw new ParseError(LLMACPP_HEALTH_PARSE_ERROR_MESSAGE, { cause: result.error });
  }

  return result.data;
};

export const parseLlamacppModelsAsync = async (response: {
  json: () => Promise<unknown>;
}): Promise<z.infer<typeof llamacppModelsSchema>> => {
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new ParseError(LLMACPP_MODELS_PARSE_ERROR_MESSAGE, {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }

  const result = await llamacppModelsSchema.safeParseAsync(json);
  if (!result.success) {
    throw new ParseError(LLMACPP_MODELS_PARSE_ERROR_MESSAGE, { cause: result.error });
  }

  return result.data;
};

export const parseLlamacppMetricsAsync = async (response: {
  text: () => Promise<string>;
}): Promise<{ name: string; value: number }[]> => {
  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    throw new ParseError("Invalid llama.cpp /metrics response", {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }

  return parsePrometheusMetrics(text);
};
