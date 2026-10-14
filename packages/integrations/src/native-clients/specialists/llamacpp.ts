import { isRecord } from "@homarr/common/object";
import { z } from "zod/v4";

import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type {
  LlamacppContextUsage,
  LlamacppModel,
  LlamacppPerRequest,
  LlamacppSlotsSummary,
  LlamacppStats,
} from "../../llama-cpp/llamacpp-types";
import {
  SpecialistBodyParseError,
  SpecialistNonDegradableError,
  SpecialistProtocol,
  settleSpecialistTasksAsync,
  specialistParseResult,
} from "./protocol";
import type { SpecialistHttp } from "./protocol";

const healthSchema = z.object({ status: z.string() });
const modelsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      meta: z
        .object({
          n_ctx: z.number().optional(),
          n_params: z.number().optional(),
          size: z.number().optional(),
          ftype: z.string().optional(),
        })
        .optional(),
    }),
  ),
});

export const parseSpecialistPrometheusMetrics = (text: string) => {
  const metrics: { name: string; value: number }[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const match = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{[^}]*\})?\s+(-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|NaN)$/.exec(
      line,
    );
    if (!match?.[1] || match[2] === undefined) continue;
    const value = Number.parseFloat(match[2]);
    if (Number.isFinite(value)) metrics.push({ name: match[1], value });
  }
  return metrics;
};

const slotSummaries = (slots: unknown[] | null) => {
  let contextUsage: LlamacppContextUsage | null = null;
  let total = 0;
  let processing = 0;
  let decoding = 0;
  let speculative: boolean | null = null;
  let perRequest: LlamacppPerRequest = { taskId: null, decodedTokens: null };
  let foundRequest = false;
  for (const slot of slots ?? []) {
    if (!isRecord(slot)) continue;
    total++;
    if (
      typeof slot.n_ctx === "number" &&
      slot.n_ctx > 0 &&
      typeof slot.n_prompt_tokens === "number" &&
      slot.n_prompt_tokens >= 0
    ) {
      const usage = {
        usedTokens: slot.n_prompt_tokens,
        contextSize: slot.n_ctx,
        percent: Math.min(100, Math.max(0, Math.round((slot.n_prompt_tokens / slot.n_ctx) * 1000) / 10)),
      };
      if (contextUsage === null || usage.usedTokens > contextUsage.usedTokens) contextUsage = usage;
    }
    if (slot.is_processing === true) {
      processing++;
      if (Array.isArray(slot.next_token) && slot.next_token.length > 0) decoding++;
      if (!foundRequest) {
        const nextToken: unknown = Array.isArray(slot.next_token) ? slot.next_token[0] : undefined;
        perRequest = {
          taskId: typeof slot.id_task === "number" ? slot.id_task : null,
          decodedTokens: isRecord(nextToken) && typeof nextToken.n_decoded === "number" ? nextToken.n_decoded : null,
        };
        foundRequest = true;
      }
    }
    if (slot.speculative === true) speculative = true;
    else if (typeof slot.speculative === "boolean" && speculative !== true) speculative = slot.speculative;
  }
  const summary: LlamacppSlotsSummary | null = total > 0 ? { total, processing, decoding, speculative } : null;
  return { contextUsage, summary, perRequest };
};

export class LlamacppProtocol extends SpecialistProtocol {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(
      this.url("/health"),
      {},
      async (response) => {
        if (!response.ok) return this.statusResult(response);
        try {
          healthSchema.parse(await response.json());
        } catch (error) {
          if (error instanceof SpecialistNonDegradableError) throw error;
          this.resources.context.signal.throwIfAborted();
          return specialistParseResult("Invalid llama.cpp /health response");
        }
        return { success: true };
      },
      10_000,
    );
  }

  async getStatsAsync(): Promise<LlamacppStats> {
    return this.runAsync(async (http) => {
      const [health, models, metrics, slots] = await settleSpecialistTasksAsync([
        http.jsonAsync(this.url("/health"), {}, 10_000).then((value) => healthSchema.parse(value)),
        http.jsonAsync(this.url("/v1/models"), {}, 10_000).then((value) => modelsSchema.parse(value)),
        http.responseAsync(
          this.url("/metrics"),
          {},
          async (response) => (response.ok ? parseSpecialistPrometheusMetrics(await response.text()) : []),
          10_000,
        ),
        this.slotsAsync(http),
      ] as const);
      const first = models.data[0];
      const model: LlamacppModel | null = first
        ? {
            id: first.id,
            name:
              first.id
                .split("/")
                .pop()
                ?.replace(/\.gguf$/i, "") ?? first.id,
            contextSize: first.meta?.n_ctx ?? null,
            parameterCount: first.meta?.n_params ?? null,
            fileSizeBytes: first.meta?.size ?? null,
            quantization: first.meta?.ftype ?? null,
          }
        : null;
      const metric = (name: string) => metrics.find((entry) => entry.name === name)?.value ?? null;
      const average = (tokens: number | null, seconds: number | null) =>
        tokens !== null && seconds !== null && seconds > 0 ? tokens / seconds : null;
      const promptTokens = metric("llamacpp:prompt_tokens_total");
      const cachedTokens = metric("llamacpp:prompt_tokens_cached_total");
      const { contextUsage, summary, perRequest } = slotSummaries(slots);
      return {
        health: health.status,
        model,
        contextUsage,
        slots: summary,
        metrics: {
          generationSpeedTps: metric("llamacpp:predicted_tokens_seconds"),
          promptSpeedTps: metric("llamacpp:prompt_tokens_seconds"),
          avgGenerationSpeedTps: average(
            metric("llamacpp:tokens_predicted_total"),
            metric("llamacpp:tokens_predicted_seconds_total"),
          ),
          avgPromptSpeedTps: average(promptTokens, metric("llamacpp:prompt_seconds_total")),
          requestsProcessing: metric("llamacpp:requests_processing"),
          requestsDeferred: metric("llamacpp:requests_deferred"),
          tokensProcessed: promptTokens,
          tokensGenerated: metric("llamacpp:tokens_predicted_total"),
          promptCacheHitRate:
            promptTokens !== null && cachedTokens !== null && promptTokens + cachedTokens > 0
              ? Math.round((cachedTokens / (promptTokens + cachedTokens)) * 100)
              : null,
          requestDecodedTokens: perRequest.decodedTokens,
          taskId: perRequest.taskId,
          specDraftTokens: metric("llamacpp:spec_decode_num_draft_tokens_total"),
          specAcceptedTokens: metric("llamacpp:spec_decode_num_accepted_tokens_total"),
          specDrafts: metric("llamacpp:spec_decode_num_drafts_total"),
        },
      };
    });
  }

  private async slotsAsync(http: SpecialistHttp): Promise<unknown[] | null> {
    return http.responseAsync(
      this.url("/slots"),
      {},
      async (response) => {
        if (!response.ok) return null;
        let json: unknown;
        try {
          json = await response.json();
        } catch (error) {
          if (error instanceof SpecialistNonDegradableError) throw error;
          throw new SpecialistBodyParseError(error);
        }
        return Array.isArray(json) ? json : null;
      },
      10_000,
      async () => null,
    );
  }
}
