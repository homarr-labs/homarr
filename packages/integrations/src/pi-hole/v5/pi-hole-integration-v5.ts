import { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import { Integration } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { DnsHoleSummaryIntegration } from "../../interfaces/dns-hole-summary/dns-hole-summary-integration";
import type { DnsHoleSummary } from "../../interfaces/dns-hole-summary/dns-hole-summary-types";
import { summaryResponseSchema } from "./pi-hole-schemas-v5";

export class PiHoleIntegrationV5 extends Integration implements DnsHoleSummaryIntegration {
  public async getSummaryAsync(): Promise<DnsHoleSummary> {
    const apiKey = super.getSecretValue("apiKey");
    const response = await fetchWithTrustedCertificatesAsync(this.url("/admin/api.php?summaryRaw", { auth: apiKey }));
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
      status: result.data.status,
      adsBlockedToday: result.data.ads_blocked_today,
      adsBlockedTodayPercentage: result.data.ads_percentage_today,
      domainsBeingBlocked: result.data.domains_being_blocked,
      dnsQueriesToday: result.data.dns_queries_today,
    };
  }

  protected async testingAsync(): Promise<TestingResult> {
    const apiKey = super.getSecretValue("apiKey");

    const response = await fetchWithTrustedCertificatesAsync(this.url("/admin/api.php?status", { auth: apiKey }));

    if (!response.ok) return TestConnectionError.StatusResult(response);

    // TODO: try out if this still works
    const responseSchema = z.object({
      status: z.string(),
    });

    await responseSchema.parseAsync(await response.json());
    return { success: true };
  }

  public async enableAsync(): Promise<void> {
    const apiKey = super.getSecretValue("apiKey");
    const response = await fetchWithTrustedCertificatesAsync(this.url("/admin/api.php?enable", { auth: apiKey }));
    if (!response.ok) {
      throw new Error(
        `Failed to enable PiHole for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
      );
    }
  }

  public async disableAsync(duration?: number): Promise<void> {
    const apiKey = super.getSecretValue("apiKey");
    const url = this.url(`/admin/api.php?disable${duration ? `=${duration}` : ""}`, { auth: apiKey });
    const response = await fetchWithTrustedCertificatesAsync(url);
    if (!response.ok) {
      throw new Error(
        `Failed to disable PiHole for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
      );
    }
  }
}
