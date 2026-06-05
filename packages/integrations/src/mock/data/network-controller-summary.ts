import type { NetworkControllerSummaryIntegration } from "../../interfaces/network-controller-summary/network-controller-summary-integration";
import type { NetworkControllerSummary } from "../../types";

export class NetworkControllerSummaryMockService implements NetworkControllerSummaryIntegration {
  public async getNetworkSummaryAsync(): Promise<NetworkControllerSummary> {
    return await Promise.resolve({
      lan: { guests: 5, users: 18, status: "enabled" },
      vpn: { users: 3, status: "enabled" },
      wanStatus: "enabled",
      wifi: { status: "enabled", guests: 2, users: 12 },
      www: { latency: 22, status: "enabled", ping: 14, uptime: 864000 },
    });
  }
}
