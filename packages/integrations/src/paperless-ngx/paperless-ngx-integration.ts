import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { PaperlessNgxStats } from "./paperless-ngx-types";
import { paperlessNgxPaginatedCountSchema, paperlessNgxStatisticsSchema } from "./paperless-ngx-types";

export class PaperlessNgxIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const statisticsUrl = this.url("/api/statistics/");
    const statisticsResponse = await input.fetchAsync(statisticsUrl, {
      headers: this.getAuthHeaders(),
    });

    if (!statisticsResponse.ok) {
      return TestConnectionError.StatusResult(statisticsResponse);
    }

    return { success: true };
  }

  public async getStatsAsync(): Promise<PaperlessNgxStats> {
    const [statistics, tags, correspondents, documentTypes] = await Promise.all([
      this.fetchStatisticsAsync(),
      this.fetchCountAsync("/api/tags/"),
      this.fetchCountAsync("/api/correspondents/"),
      this.fetchCountAsync("/api/document_types/"),
    ]);

    return {
      documentsTotal: statistics.documents_total,
      documentsInbox: statistics.documents_inbox,
      correspondentsCount: correspondents,
      tagsCount: tags,
      documentTypesCount: documentTypes,
    };
  }

  private async fetchAuthenticatedAsync(path: `/${string}`) {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path), {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new ResponseError(response);
    }
    return response;
  }

  private async fetchStatisticsAsync() {
    const response = await this.fetchAuthenticatedAsync("/api/statistics/");
    return paperlessNgxStatisticsSchema.parse(await response.json());
  }

  private async fetchCountAsync(path: `/${string}`) {
    const response = await this.fetchAuthenticatedAsync(path);
    return paperlessNgxPaginatedCountSchema.parse(await response.json()).count;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Token ${this.getSecretValue("apiKey")}`,
    };
  }
}
