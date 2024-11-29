import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { DnsHoleSummaryIntegration } from "../interfaces/dns-hole-summary/dns-hole-summary-integration";
import type { DnsHoleSummary } from "../interfaces/dns-hole-summary/dns-hole-summary-types";
import { filteringStatusSchema, statsResponseSchema, statusResponseSchema } from "./adguard-home-types";

export class AdGuardHomeIntegration extends Integration implements DnsHoleSummaryIntegration {
  public async getSummaryAsync(): Promise<DnsHoleSummary> {
    const statsResponse = await fetch(this.url("/control/stats"), {
      headers: {
        Authorization: `Basic ${this.getAuthorizationHeaderValue()}`,
      },
    });

    if (!statsResponse.ok) {
      throw new Error(
        `Failed to fetch stats for ${this.integration.name} (${this.integration.id}): ${statsResponse.statusText}`,
      );
    }

    const statusResponse = await fetch(this.url("/control/status"), {
      headers: {
        Authorization: `Basic ${this.getAuthorizationHeaderValue()}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to fetch status for ${this.integration.name} (${this.integration.id}): ${statusResponse.statusText}`,
      );
    }

    const filteringStatusResponse = await fetch(this.url("/control/filtering/status"), {
      headers: {
        Authorization: `Basic ${this.getAuthorizationHeaderValue()}`,
      },
    });

    if (!filteringStatusResponse.ok) {
      throw new Error(
        `Failed to fetch filtering status for ${this.integration.name} (${this.integration.id}): ${filteringStatusResponse.statusText}`,
      );
    }

    const stats = statsResponseSchema.safeParse(await statsResponse.json());
    const status = statusResponseSchema.safeParse(await statusResponse.json());
    const filteringStatus = filteringStatusSchema.safeParse(await filteringStatusResponse.json());

    const errorMessages: string[] = [];
    if (!stats.success) {
      errorMessages.push(`Stats parsing error: ${stats.error.message}`);
    }
    if (!status.success) {
      errorMessages.push(`Status parsing error: ${status.error.message}`);
    }
    if (!filteringStatus.success) {
      errorMessages.push(`Filtering status parsing error: ${filteringStatus.error.message}`);
    }
    if (!stats.success || !status.success || !filteringStatus.success) {
      throw new Error(
        `Failed to parse summary for ${this.integration.name} (${this.integration.id}):\n${errorMessages.join("\n")}`,
      );
    }

    const blockedQueriesToday =
      stats.data.time_units === "days"
        ? (stats.data.blocked_filtering[stats.data.blocked_filtering.length - 1] ?? 0)
        : stats.data.blocked_filtering.reduce((prev, sum) => prev + sum, 0);
    const queriesToday =
      stats.data.time_units === "days"
        ? (stats.data.dns_queries[stats.data.dns_queries.length - 1] ?? 0)
        : stats.data.dns_queries.reduce((prev, sum) => prev + sum, 0);
    const countFilteredDomains = filteringStatus.data.filters
      .filter((filter) => filter.enabled)
      .reduce((sum, filter) => filter.rules_count + sum, 0);

    return {
      status: status.data.protection_enabled ? ("enabled" as const) : ("disabled" as const),
      adsBlockedToday: blockedQueriesToday,
      adsBlockedTodayPercentage: blockedQueriesToday > 0 ? (queriesToday / blockedQueriesToday) * 100 : 0,
      domainsBeingBlocked: countFilteredDomains,
      dnsQueriesToday: queriesToday,
    };
  }

  public async testConnectionAsync(): Promise<void> {
    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetch(this.url("/control/status"), {
          headers: {
            Authorization: `Basic ${this.getAuthorizationHeaderValue()}`,
          },
        });
      },
      handleResponseAsync: async (response) => {
        try {
          const result = (await response.json()) as unknown;
          if (typeof result === "object" && result !== null) return;
        } catch {
          throw new IntegrationTestConnectionError("invalidJson");
        }

        throw new IntegrationTestConnectionError("invalidCredentials");
      },
    });
  }

  public async enableAsync(): Promise<void> {
    const response = await fetch(this.url("/control/protection"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${this.getAuthorizationHeaderValue()}`,
      },
      body: JSON.stringify({
        enabled: true,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to enable AdGuard Home for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
      );
    }
  }

  public async disableAsync(duration = 0): Promise<void> {
    const response = await fetch(this.url("/control/protection"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${this.getAuthorizationHeaderValue()}`,
      },
      body: JSON.stringify({
        enabled: false,
        duration: duration * 1000,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to disable AdGuard Home for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
      );
    }
  }

  private getAuthorizationHeaderValue() {
    const username = super.getSecretValue("username");
    const password = super.getSecretValue("password");
    return Buffer.from(`${username}:${password}`).toString("base64");
  }
}
