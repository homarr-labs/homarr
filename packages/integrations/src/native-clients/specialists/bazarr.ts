import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { BazarrBadges } from "../../bazarr/bazarr-types";
import { bazarrBadgesSchema, bazarrSystemStatusSchema } from "../../bazarr/bazarr-types";
import { SpecialistProtocol, SpecialistReportedError } from "./protocol";

export class BazarrProtocol extends SpecialistProtocol {
  private headers() {
    return { "X-API-KEY": this.secret("apiKey"), Accept: "application/json" };
  }
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(
      this.url("/api/system/status"),
      { headers: this.headers() },
      async (response) => {
        if (!response.ok) return this.statusResult(response);
        bazarrSystemStatusSchema.parse(await response.json());
        return { success: true };
      },
    );
  }
  async getBadgesAsync(): Promise<BazarrBadges> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/badges"),
        { headers: this.headers() },
        async (response) => {
          if (!response.ok)
            throw new SpecialistReportedError(
              `Failed to fetch Bazarr badges for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
            );
          return bazarrBadgesSchema.parse(await response.json());
        },
        10_000,
      ),
    );
  }
}
