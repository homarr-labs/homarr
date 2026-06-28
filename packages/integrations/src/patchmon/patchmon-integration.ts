import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { PatchMonStats } from "./patchmon-types";
import { mapPatchMonStats, patchmonStatsResponseSchema } from "./patchmon-types";

const STATS_REQUEST_TIMEOUT_MS = 10_000;

export class PatchMonIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/v1/gethomepage/stats"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    const parseResult = await patchmonStatsResponseSchema.safeParseAsync(await response.json());
    if (!parseResult.success) {
      return TestConnectionError.ParseResult(
        new ParseError("Invalid PatchMon stats response", { cause: parseResult.error }),
      );
    }

    return { success: true };
  }

  public async getStatsAsync(): Promise<PatchMonStats> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/gethomepage/stats"), {
      headers: this.getAuthHeaders(),
      timeout: STATS_REQUEST_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = patchmonStatsResponseSchema.parse(await response.json());
    return mapPatchMonStats(data);
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = Buffer.from(
      `${this.getSecretValue("patchmonApiKey")}:${this.getSecretValue("patchmonApiSecret")}`,
    ).toString("base64");

    return { Authorization: `Basic ${credentials}` };
  }
}
