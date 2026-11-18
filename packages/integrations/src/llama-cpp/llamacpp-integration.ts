import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";

import type { LlamacppStats } from "./llamacpp-types";
import {
  mapContextUsage,
  mapLlamacppModel,
  mapLlamacppPerRequest,
  mapLlamacppStats,
  mapSlotsSummary,
  parseLlamacppHealthAsync,
  parseLlamacppMetricsAsync,
  parseLlamacppModelsAsync,
  parseLlamacppSlotsAsync,
} from "./llamacpp-types";

const LLMACPP_REQUEST_TIMEOUT_MS = 10_000;

export class LlamacppIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/health"), {
      signal: AbortSignal.timeout(LLMACPP_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return TestConnectionError.StatusResult(response);
    }

    // Validate the health payload shape, not just that it is parseable JSON: an
    // unrelated JSON body must not pass connection testing.
    try {
      await parseLlamacppHealthAsync(response);
    } catch (error) {
      if (error instanceof ParseError) {
        return TestConnectionError.ParseResult(error);
      }
      return TestConnectionError.UnknownResult(error);
    }

    return { success: true };
  }

  public async getStatsAsync(): Promise<LlamacppStats> {
    const [health, models] = await Promise.all([
      fetchWithTrustedCertificatesAsync(this.url("/health"), { timeout: LLMACPP_REQUEST_TIMEOUT_MS }).then(
        async (response) => {
          if (!response.ok) {
            await response.body?.cancel().catch(() => undefined);
            throw new ResponseError(response);
          }
          return parseLlamacppHealthAsync(response);
        },
      ),
      fetchWithTrustedCertificatesAsync(this.url("/v1/models"), { timeout: LLMACPP_REQUEST_TIMEOUT_MS }).then(
        async (response) => {
          if (!response.ok) {
            await response.body?.cancel().catch(() => undefined);
            throw new ResponseError(response);
          }
          return parseLlamacppModelsAsync(response);
        },
      ),
    ]);
    const firstModelId = models.data[0]?.id;

    const [metrics, slots] = await Promise.all([
      fetchWithTrustedCertificatesAsync(this.url("/metrics", { model: firstModelId }), {
        timeout: LLMACPP_REQUEST_TIMEOUT_MS,
      }).then(async (response) => {
        // Builds without --metrics have no counters, while health and model data remain usable.
        if (!response.ok) {
          await response.body?.cancel().catch(() => undefined);
          return [];
        }
        return parseLlamacppMetricsAsync(response);
      }),
      // A missing or unreachable /slots endpoint degrades to no context usage.
      fetchWithTrustedCertificatesAsync(this.url("/slots", { model: firstModelId }), {
        timeout: LLMACPP_REQUEST_TIMEOUT_MS,
      })
        .catch(() => null)
        .then(async (response) => {
          if (!response) return null;
          if (!response.ok) {
            await response.body?.cancel().catch(() => undefined);
            return null;
          }
          return parseLlamacppSlotsAsync(response);
        }),
    ]);

    const firstModel = models.data[0] ? mapLlamacppModel(models.data[0]) : null;
    const contextUsage = mapContextUsage(slots);
    const slotsSummary = mapSlotsSummary(slots);
    const perRequest = mapLlamacppPerRequest(slots);

    return mapLlamacppStats(health, firstModel, metrics, contextUsage, slotsSummary, perRequest);
  }
}
