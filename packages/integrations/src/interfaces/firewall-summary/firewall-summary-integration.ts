import type { FirewallSummary } from "./firewall-summary-types";

export interface FirewallSummaryIntegration {
  getFirewallSummaryAsync(): Promise<FirewallSummary>;
}
