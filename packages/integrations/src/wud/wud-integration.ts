import { Buffer } from "node:buffer";

import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { WudStats } from "./wud-types";
import { mapWudStats, parseWudContainersResponseAsync } from "./wud-types";

const CONTAINERS_REQUEST_TIMEOUT_MS = 10_000;

export class WudIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/app"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    try {
      await response.json();
    } catch (error) {
      return TestConnectionError.ParseResult(
        new ParseError("Invalid WUD app response", {
          cause: error instanceof Error ? error : new Error(String(error)),
        }),
      );
    }

    return { success: true };
  }

  public async getStatsAsync(): Promise<WudStats> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/containers"), {
      headers: this.getAuthHeaders(),
      timeout: CONTAINERS_REQUEST_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const containers = await parseWudContainersResponseAsync(response);

    return mapWudStats(containers);
  }

  private getAuthHeaders(): Record<string, string> | undefined {
    if (!this.hasSecretValue("username") || !this.hasSecretValue("password")) {
      return undefined;
    }

    if (this.url("/api/app").protocol !== "https:") {
      return undefined;
    }

    const credentials = Buffer.from(`${this.getSecretValue("username")}:${this.getSecretValue("password")}`).toString(
      "base64",
    );

    return { Authorization: `Basic ${credentials}` };
  }
}
