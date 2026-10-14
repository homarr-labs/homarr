import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import {
  speedtestTrackerLatestResultEnvelopeSchema,
  speedtestTrackerResultsCollectionSchema,
  speedtestTrackerStatsEnvelopeSchema,
} from "../../speedtest-tracker/speedtest-tracker-types";
import type { SpeedtestTrackerDashboardData } from "../../speedtest-tracker/speedtest-tracker-types";
import { IntegrationTransportStatusError } from "../../runtime/transport-errors";
import { SpecialistProtocol, settleSpecialistTasksAsync } from "./protocol";
import type { SpecialistHttp } from "./protocol";

export class SpeedtestTrackerProtocol extends SpecialistProtocol {
  private headers() {
    return { Authorization: `Bearer ${this.secret("apiKey")}`, Accept: "application/json" };
  }
  async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return { headers: this.headers(), redactValues: [] };
  }
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(
      this.url("/api/v1/results/latest"),
      { headers: this.headers() },
      async (response) => (response.ok ? { success: true } : this.statusResult(response)),
    );
  }
  getLatestResultAsync() {
    return this.runAsync((http) => this.latestAsync(http));
  }
  getStatsAsync() {
    return this.runAsync((http) => this.statsAsync(http));
  }
  getRecentResultsAsync(perPage = 10) {
    return this.runAsync((http) => this.recentAsync(http, perPage));
  }
  async getDashboardDataAsync(): Promise<SpeedtestTrackerDashboardData> {
    return this.runAsync(async (http) => {
      const [latestResult, stats, recentCollection] = await settleSpecialistTasksAsync([
        this.latestAsync(http),
        this.statsAsync(http),
        this.recentAsync(http, 30),
      ] as const);
      return { latestResult, stats, recentResults: recentCollection.data };
    });
  }
  private latestAsync(http: SpecialistHttp) {
    return http.responseAsync(this.url("/api/v1/results/latest"), { headers: this.headers() }, async (response) => {
      if (response.status === 404) return null;
      if (!response.ok) throw new IntegrationTransportStatusError(response.status);
      return speedtestTrackerLatestResultEnvelopeSchema.parse(await response.json()).data;
    });
  }
  private async statsAsync(http: SpecialistHttp) {
    return speedtestTrackerStatsEnvelopeSchema.parse(
      await http.jsonAsync(this.url("/api/v1/stats"), { headers: this.headers() }),
    ).data;
  }
  private async recentAsync(http: SpecialistHttp, perPage: number) {
    return speedtestTrackerResultsCollectionSchema.parse(
      await http.jsonAsync(this.url("/api/v1/results", { result_count: String(perPage), sort: "-created_at" }), {
        headers: this.headers(),
      }),
    );
  }
}
