import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { PaperlessNgxStats } from "../../paperless-ngx/paperless-ngx-types";
import {
  paperlessNgxPaginatedCountSchema,
  paperlessNgxStatisticsSchema,
} from "../../paperless-ngx/paperless-ngx-types";
import { SpecialistProtocol, settleSpecialistTasksAsync } from "./protocol";

export class PaperlessNgxProtocol extends SpecialistProtocol {
  private headers() {
    return { Authorization: `Token ${this.secret("apiKey")}` };
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(
      this.url("/api/statistics/"),
      { headers: this.headers() },
      async (response) => (response.ok ? { success: true } : this.statusResult(response)),
    );
  }

  async getStatsAsync(): Promise<PaperlessNgxStats> {
    return this.runAsync(async (http) => {
      const [statistics, tags, correspondents, documentTypes] = await settleSpecialistTasksAsync([
        http
          .jsonAsync(this.url("/api/statistics/"), { headers: this.headers() })
          .then((json) => paperlessNgxStatisticsSchema.parse(json)),
        http
          .jsonAsync(this.url("/api/tags/"), { headers: this.headers() })
          .then((json) => paperlessNgxPaginatedCountSchema.parse(json).count),
        http
          .jsonAsync(this.url("/api/correspondents/"), { headers: this.headers() })
          .then((json) => paperlessNgxPaginatedCountSchema.parse(json).count),
        http
          .jsonAsync(this.url("/api/document_types/"), { headers: this.headers() })
          .then((json) => paperlessNgxPaginatedCountSchema.parse(json).count),
      ] as const);
      return {
        documentsTotal: statistics.documents_total,
        documentsInbox: statistics.documents_inbox,
        tagsCount: tags,
        correspondentsCount: correspondents,
        documentTypesCount: documentTypes,
      };
    });
  }
}
