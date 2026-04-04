import type { UptimeKumaCheck } from "./uptime-kuma-types";

export interface IUptimeKumaIntegration {
  /**
   * Return the full list of checks configured in the instance.
   */
  listChecksAsync(): Promise<UptimeKumaCheck[]>;
  /**
   * Get a single check by its ID. Useful for polling a specific check status.
   */
  getCheckAsync(id: number): Promise<UptimeKumaCheck>;
}
