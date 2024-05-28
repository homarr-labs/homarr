import type { DnsHoleSummary } from "./dns-hole-summary-types";

export interface DnsHoleSummaryIntegration {
  getSummaryAsync(): Promise<DnsHoleSummary>;
}
