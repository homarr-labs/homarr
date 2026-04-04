import type { IUptimeKumaIntegration } from "../../interfaces/uptime-kuma/uptime-kuma-integration";
import type { UptimeKumaCheck } from "../../interfaces/uptime-kuma/uptime-kuma-types";

export class UptimeKumaMockService implements IUptimeKumaIntegration {
  public async listChecksAsync(): Promise<UptimeKumaCheck[]> {
    // return some fake checks
    return await Promise.resolve([
      { id: 1, name: "Website", url: "https://example.com", status: "Up", type: 1, interval: 5 },
      { id: 2, name: "API", url: "https://api.example.com", status: "Down", type: 1, interval: 5 },
    ]);
  }

  public async getCheckAsync(id: number): Promise<UptimeKumaCheck> {
    const checks = await this.listChecksAsync();
    const found = checks.find((c) => c.id === id);
    if (!found) {
      throw new Error(`Check with id ${id} not found`);
    }
    return found;
  }
}
