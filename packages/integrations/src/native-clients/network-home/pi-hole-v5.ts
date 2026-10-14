import { isRecord } from "@homarr/common/object";
import { ResponseError } from "@homarr/common/response-error";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { DnsHoleSummary } from "../../interfaces/dns-hole-summary/dns-hole-summary-types";
import { summaryResponseSchema } from "../../pi-hole/v5/pi-hole-schemas-v5";
import { NetworkHomeProtocol } from "./transport";
import type { NetworkHomeHttpOperation } from "./transport";

export class PiHoleV5Protocol extends NetworkHomeProtocol {
  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    this.resources.context.signal.throwIfAborted();
    return this.hasSecret("apiKey") ? { headers: {}, query: { auth: this.secret("apiKey") } } : { headers: {} };
  }

  async getSummaryAsync(): Promise<DnsHoleSummary> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/admin/api.php?summaryRaw", { auth: this.secret("apiKey") }),
        {},
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
          const data = await summaryResponseSchema.parseAsync(await response.json());
          return {
            status: data.status,
            adsBlockedToday: data.ads_blocked_today,
            adsBlockedTodayPercentage: data.ads_percentage_today,
            domainsBeingBlocked: data.domains_being_blocked,
            dnsQueriesToday: data.dns_queries_today,
          };
        },
      ),
    );
  }

  protected async testingAsync(http: NetworkHomeHttpOperation): Promise<TestingResult> {
    return http.responseAsync(
      this.url("/admin/api.php?status", { auth: this.secret("apiKey") }),
      {},
      async (response) => {
        if (!response.ok) return TestConnectionError.StatusResult(response);
        return isRecord(await response.json()) ? { success: true } : TestConnectionError.UnauthorizedResult(401);
      },
    );
  }

  async enableAsync(): Promise<void> {
    this.requireInteract();
    await this.setBlockingCandidateAsync("enable");
  }

  async disableAsync(duration?: number): Promise<void> {
    this.requireInteract();
    await this.setBlockingCandidateAsync("disable", duration);
  }

  private async setBlockingCandidateAsync(action: "enable" | "disable", duration?: number): Promise<void> {
    const path: `/${string}` = `/admin/api.php?${action}${action === "disable" && duration ? `=${duration}` : ""}`;
    await this.runAsync((http) =>
      http.responseAsync(this.url(path, { auth: this.secret("apiKey") }), {}, async (response) => {
        if (!response.ok)
          throw new Error(
            `Failed to ${action} PiHole for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
          );
      }),
    );
  }
}
