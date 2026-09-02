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

export interface LlamacppStats {
  health: string;
  model: LlamacppModel | null;
  metrics: {
    generationSpeedTps: number | null;
    promptSpeedTps: number | null;
    requestsProcessing: number | null;
    requestsDeferred: number | null;
    tokensProcessed: number | null;
    tokensGenerated: number | null;
    promptCacheHitRate: number | null;
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

export const mapLlamacppStats = (
  health: z.infer<typeof llamacppHealthSchema>,
  model: LlamacppModel | null,
  metrics: readonly { name: string; value: number }[],
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
    metrics: {
      generationSpeedTps: getMetricValue(metrics, "llamacpp:predicted_tokens_seconds"),
      promptSpeedTps: getMetricValue(metrics, "llamacpp:prompt_tokens_seconds"),
      requestsProcessing: getMetricValue(metrics, "llamacpp:requests_processing"),
      requestsDeferred: getMetricValue(metrics, "llamacpp:requests_deferred"),
      tokensProcessed: getMetricValue(metrics, "llamacpp:prompt_tokens_total"),
      tokensGenerated: getMetricValue(metrics, "llamacpp:tokens_predicted_total"),
      promptCacheHitRate,
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
