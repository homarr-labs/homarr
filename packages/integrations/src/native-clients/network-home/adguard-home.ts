import { Buffer } from "node:buffer";

import {
  filteringStatusSchema,
  statsResponseSchema,
  statusResponseSchema,
} from "../../adguard-home/adguard-home-types";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { DnsHoleSummary } from "../../interfaces/dns-hole-summary/dns-hole-summary-types";
import { NetworkHomeCapabilityHeldError, NetworkHomeProtocol, settleNetworkHomeAsync } from "./transport";
import type { NetworkHomeHttpOperation } from "./transport";

export class AdGuardHomeProtocol extends NetworkHomeProtocol {
  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return { headers: this.authHeaders() };
  }

  async getSummaryAsync(): Promise<DnsHoleSummary> {
    return this.runAsync<DnsHoleSummary>(async (http) => {
      const headers = this.authHeaders();
      const responses = await settleNetworkHomeAsync([
        http.responseAsync(this.url("/control/stats"), { headers }, async (response) => ({
          ok: response.ok,
          statusText: response.statusText,
          body: response.ok ? await response.text() : "",
        })),
        http.responseAsync(this.url("/control/status"), { headers }, async (response) => ({
          ok: response.ok,
          statusText: response.statusText,
          body: response.ok ? await response.text() : "",
        })),
        http.responseAsync(this.url("/control/filtering/status"), { headers }, async (response) => ({
          ok: response.ok,
          statusText: response.statusText,
          body: response.ok ? await response.text() : "",
        })),
      ]);
      const [statsResponse, statusResponse, filteringStatusResponse] = responses;
      if (!statsResponse || !statusResponse || !filteringStatusResponse)
        throw new Error("Incomplete AdGuard Home summary");
      for (const { label, response } of [
        { label: "stats", response: statsResponse },
        { label: "status", response: statusResponse },
        { label: "filtering status", response: filteringStatusResponse },
      ]) {
        if (!response.ok)
          throw new Error(
            `Failed to fetch ${label} for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
          );
      }
      const stats = statsResponseSchema.safeParse(JSON.parse(statsResponse.body));
      const status = statusResponseSchema.safeParse(JSON.parse(statusResponse.body));
      const filteringStatus = filteringStatusSchema.safeParse(JSON.parse(filteringStatusResponse.body));
      const errors: string[] = [];
      if (!stats.success) errors.push(`Stats parsing error: ${stats.error.message}`);
      if (!status.success) errors.push(`Status parsing error: ${status.error.message}`);
      if (!filteringStatus.success) errors.push(`Filtering status parsing error: ${filteringStatus.error.message}`);
      if (!stats.success || !status.success || !filteringStatus.success)
        throw new Error(
          `Failed to parse summary for ${this.integration.name} (${this.integration.id}):\n${errors.join("\n")}`,
        );
      const blockedQueriesToday =
        stats.data.time_units === "days"
          ? (stats.data.blocked_filtering.at(-1) ?? 0)
          : stats.data.blocked_filtering.reduce((previous, sum) => previous + sum, 0);
      const queriesToday =
        stats.data.time_units === "days"
          ? (stats.data.dns_queries.at(-1) ?? 0)
          : stats.data.dns_queries.reduce((previous, sum) => previous + sum, 0);
      return {
        status: status.data.protection_enabled ? "enabled" : "disabled",
        adsBlockedToday: blockedQueriesToday,
        adsBlockedTodayPercentage: blockedQueriesToday > 0 ? (queriesToday / blockedQueriesToday) * 100 : 0,
        domainsBeingBlocked: filteringStatus.data.filters
          .filter((filter) => filter.enabled)
          .reduce((sum, filter) => filter.rules_count + sum, 0),
        dnsQueriesToday: queriesToday,
      };
    });
  }

  protected async testingAsync(http: NetworkHomeHttpOperation): Promise<TestingResult> {
    return http.responseAsync(this.url("/control/status"), { headers: this.authHeaders() }, async (response) => {
      if (!response.ok) return TestConnectionError.StatusResult(response);
      const data = await response.json();
      if (typeof data === "object" && data !== null) return { success: true };
      throw new NetworkHomeCapabilityHeldError("parse-error-constructor");
    });
  }

  async enableAsync(): Promise<void> {
    this.requireInteract();
    await this.setProtectionCandidateAsync(true);
  }

  async disableAsync(duration = 0): Promise<void> {
    this.requireInteract();
    await this.setProtectionCandidateAsync(false, duration);
  }

  private async setProtectionCandidateAsync(enabled: boolean, duration = 0): Promise<void> {
    await this.runAsync((http) =>
      http.responseAsync(
        this.url("/control/protection"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...this.authHeaders() },
          body: JSON.stringify(enabled ? { enabled: true } : { enabled: false, duration: duration * 1000 }),
        },
        async (response) => {
          if (!response.ok)
            throw new Error(
              `Failed to ${enabled ? "enable" : "disable"} AdGuard Home for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
            );
        },
      ),
    );
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Basic ${Buffer.from(`${this.secret("username")}:${this.secret("password")}`).toString("base64")}`,
    };
  }
}
