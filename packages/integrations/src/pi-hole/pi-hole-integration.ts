import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { DnsHoleSummaryIntegration } from "../interfaces/dns-hole-summary/dns-hole-summary-integration";
import type { DnsHoleSummary } from "../interfaces/dns-hole-summary/dns-hole-summary-types";
import { summaryResponseSchema } from "./pi-hole-types";

export class PiHoleIntegration extends Integration implements DnsHoleSummaryIntegration {
  public async getSummaryAsync(): Promise<DnsHoleSummary> {
    const apiKey = super.getSecretValue("apiKey");
    const response = await fetch(`${this.integration.url}/admin/api.php?summaryRaw&auth=${apiKey}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch summary for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
      );
    }

    const result = summaryResponseSchema.safeParse(await response.json());

    if (!result.success) {
      throw new Error(
        `Failed to parse summary for ${this.integration.name} (${this.integration.id}), most likely your api key is wrong: ${result.error.message}`,
      );
    }

    return {
      adsBlockedToday: result.data.ads_blocked_today,
      adsBlockedTodayPercentage: result.data.ads_percentage_today,
      domainsBeingBlocked: result.data.domains_being_blocked,
      dnsQueriesToday: result.data.dns_queries_today,
    };
  }

  public async testConnectionAsync(): Promise<void> {
    const apiKey = super.getSecretValue("apiKey");

    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetch(`${this.integration.url}/admin/api.php?status&auth=${apiKey}`);
      },
      handleResponseAsync: async (response) => {
        try {
          const result = (await response.json()) as unknown;
          if (typeof result === "object" && result !== null && "status" in result) return;
        } catch {
          throw new IntegrationTestConnectionError("invalidJson");
        }

        throw new IntegrationTestConnectionError("invalidCredentials");
      },
    });
  }
}
