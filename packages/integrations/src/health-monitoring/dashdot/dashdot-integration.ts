import type { z, ZodType } from "zod";

import type { HealthMonitoring } from "../../interfaces/health-monitoring/healt-monitoring-data";
import { HealthMonitoringIntegration } from "../../interfaces/health-monitoring/health-monitoring-interface";
import {
  configSchema,
  cpuLoadSchema,
  memoryLoadSchema,
  networkLoadSchema,
  serverInfoSchema,
  storageLoadSchema,
} from "./dashdot-schema";
import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

export class DashDotIntegration extends HealthMonitoringIntegration {
  public async testConnectionAsync(): Promise<void> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/info"));
    await response.json();
  }

  public async getSystemInfoAsync(): Promise<HealthMonitoring> {
    const { config } = await this.dashDotApiCallAsync("/config", configSchema);
    const info = await this.dashDotApiCallAsync("/info", serverInfoSchema);
    const cpuLoad = await this.dashDotApiCallAsync("/load/cpu", cpuLoadSchema);
    const memoryLoad = await this.dashDotApiCallAsync("/load/ram", memoryLoadSchema);
    const storageLoad = await this.dashDotApiCallAsync("/load/storage", storageLoadSchema);
    const networkLoad = await this.dashDotApiCallAsync("/load/network", networkLoadSchema);
    return {
      system: {
        name: config.override.os ?? info.os.distro,
        type: "single",
        version: info.os.release,
        uptime: info.os.uptime * 1000,
      },
      cpu: cpuLoad.map((cpu) => {
        return {
          id: `${cpu.core}`,
          name: `${cpu.core}`,
          temp: cpu.temp ? (config.use_imperial ? (cpu.temp - 32) / 1.8 : cpu.temp) : undefined,
          maxValue: 100,
        };
      }),
      memory: [
        {
          id: "unique",
          name: `${config.override.ram_brand ?? info.ram.layout[0].brand} - ${config.override.ram_type ?? info.ram.layout[0].type}`,
          maxValue: config.override.ram_size ?? info.ram.size,
        },
      ],
      storage: info.storage.map((storage, index) => {
        return {
          name: storage.disks.map((disk) => config.override.storage_brands?.[disk.brand] ?? disk.brand).join(", "),
          used: storageLoad[index] ?? -1,
          size: storage.size,
        };
      }),
      network: [
        {
          id: "unique",
          name: config.use_network_interface,
          maxValue: ((config.override.network_interface_speed ?? info.network.interfaceSpeed) * 1000 ** 3) / 8,
        },
      ],
      history: [
        {
          timestamp: Date.now(),
          cpu: cpuLoad.map(({ core, load }) => ({ id: `${core}`, value: load })),
          memory: [{ id: "unique", value: memoryLoad.load }],
          networkUp: [{ id: "unique", value: Math.round(networkLoad.up) }],
          networkDown: [{ id: "unique", value: Math.round(networkLoad.down) }],
        },
      ],
    };
  }

  private async dashDotApiCallAsync<T extends ZodType>(path: `/${string}`, schema: T): Promise<z.infer<T>> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path));
    return await schema.parseAsync(await response.json()) as Promise<z.infer<T>>;
  }
}
