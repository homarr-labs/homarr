import type {
  FirewallCpuSummary, FirewallInterfacesSummary, FirewallMemorySummary, FirewallVersionSummary
} from "./firewall-summary-types";

export interface FirewallCpuSummaryIntegration {
  getFirewallCpuAsync(): Promise<FirewallCpuSummary>;
}

export interface FirewallMemorySummaryIntegration {
  getFirewallMemoryAsync(): Promise<FirewallMemorySummary>;
}

export interface FirewallInterfacesSummaryIntegration {
  getFirewallInterfacesAsync(): Promise<FirewallInterfacesSummary>;
}

export interface FirewallVersionSummaryIntegration {
  getFirewallVersionAsync(): Promise<FirewallVersionSummary>;
}
