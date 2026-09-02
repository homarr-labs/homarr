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
  mapLlamacppStats,
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
      return TestConnectionError.StatusResult(response);
    }

    try {
      await response.json();
    } catch (error) {
      return TestConnectionError.ParseResult(
        new ParseError("Invalid llama.cpp /health response", {
          cause: error instanceof Error ? error : new Error(String(error)),
        }),
      );
    }

    return { success: true };
  }

  public async getStatsAsync(): Promise<LlamacppStats> {
    const [healthResponse, modelsResponse, metricsResponse, slotsResponse] = await Promise.all([
      fetchWithTrustedCertificatesAsync(this.url("/health"), { timeout: LLMACPP_REQUEST_TIMEOUT_MS }),
      fetchWithTrustedCertificatesAsync(this.url("/v1/models"), { timeout: LLMACPP_REQUEST_TIMEOUT_MS }),
      fetchWithTrustedCertificatesAsync(this.url("/metrics"), { timeout: LLMACPP_REQUEST_TIMEOUT_MS }),
      // /slots is not present on every build; a missing endpoint degrades to no context usage.
      fetchWithTrustedCertificatesAsync(this.url("/slots"), { timeout: LLMACPP_REQUEST_TIMEOUT_MS }).catch(() => null),
    ]);

    if (!healthResponse.ok) {
      throw new ResponseError(healthResponse);
    }
    if (!modelsResponse.ok) {
      throw new ResponseError(modelsResponse);
    }
    if (!metricsResponse.ok) {
      throw new ResponseError(metricsResponse);
    }

    const [health, models, metrics, slots] = await Promise.all([
      parseLlamacppHealthAsync(healthResponse),
      parseLlamacppModelsAsync(modelsResponse),
      parseLlamacppMetricsAsync(metricsResponse),
      slotsResponse?.ok ? parseLlamacppSlotsAsync(slotsResponse) : Promise.resolve(null),
    ]);

    const firstModel = models.data[0] ? mapLlamacppModel(models.data[0]) : null;
    const contextUsage = mapContextUsage(slots);

    return mapLlamacppStats(health, firstModel, metrics, contextUsage);
  }
}
