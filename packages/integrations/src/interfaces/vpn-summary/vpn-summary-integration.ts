import type { VpnSummary } from "./vpn-summary-types";

export interface VpnSummaryIntegration {
  getSummaryAsync(): Promise<VpnSummary>;
}
