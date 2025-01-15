import { Integration } from "../../base/integration";
import type { HealthMonitoring } from "./healt-monitoring-data";

export abstract class HealthMonitoringIntegration extends Integration {
  public abstract getSystemInfoAsync(): Promise<HealthMonitoring>;
}
