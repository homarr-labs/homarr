import type { DnsHoleSummaryIntegration } from "../../interfaces/dns-hole-summary/dns-hole-summary-integration";
import type { DnsHoleSummary } from "../../types";

export class DnsHoleMockService implements DnsHoleSummaryIntegration {
  private static isEnabled = true;

  public async getSummaryAsync(): Promise<DnsHoleSummary> {
    const blocked = 12_480;
    const queries = 58_400;
    return await Promise.resolve({
      status: DnsHoleMockService.isEnabled ? "enabled" : "disabled",
      domainsBeingBlocked: 145_230,
      adsBlockedToday: blocked,
      adsBlockedTodayPercentage: (blocked / queries) * 100,
      dnsQueriesToday: queries,
    });
  }
  public async enableAsync(): Promise<void> {
    DnsHoleMockService.isEnabled = true;
    return await Promise.resolve();
  }
  public async disableAsync(_duration?: number): Promise<void> {
    DnsHoleMockService.isEnabled = false;
    return await Promise.resolve();
  }
}
