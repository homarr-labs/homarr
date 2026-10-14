import dayjs from "dayjs";
import { z } from "zod";

import type { SystemHealthMonitoring } from "../../interfaces/health-monitoring/health-monitoring-types";
import { unraidSystemInfoSchema } from "../../unraid/unraid-types";
import { SystemsHttpClient } from "./http";
import type { SystemsHttpOperation } from "./http";
import { pickSystemHealthStats } from "./stats";

const envelopeSchema = z.object({ data: z.unknown(), errors: z.array(z.object({ message: z.string() })).optional() });
const systemQuery = `query {
  metrics {
    cpu { percentTotal cpus { percentTotal } }
    memory { available used free total swapFree swapTotal swapUsed percentTotal }
  }
  array {
    state capacity { disks { free total used } }
    disks { id name device fsSize fsFree fsUsed status temp }
    caches { id name device fsSize fsFree fsUsed status temp }
  }
  info {
    devices { network { speed dhcp model model } }
    os { platform distro release uptime }
    cpu { manufacturer brand cores threads }
  }
}`;

export class UnraidHttpClient extends SystemsHttpClient {
  async getStatsAsync() {
    return pickSystemHealthStats(await this.getSystemInfoAsync());
  }

  async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    return await this.runAsync(async (http) => {
      this.resources.log?.write("debug", "Retrieving system information", { integrationId: this.integration.id });
      const data = unraidSystemInfoSchema.parse(await this.queryAsync(http, systemQuery));
      this.resources.log?.write("debug", "Retrieved system information", { integrationId: this.integration.id });
      const cpus = data.metrics.cpu.cpus;
      const usedMemory = Math.max(data.metrics.memory.total - data.metrics.memory.available, 0);
      const disks = [...data.array.disks, ...data.array.caches];
      return {
        version: data.info.os.release,
        cpuModelName: data.info.cpu.brand,
        cpuUtilization: cpus.length > 0 ? cpus.reduce((sum, cpu) => sum + cpu.percentTotal, 0) / cpus.length : 0,
        memUsedInBytes: usedMemory,
        memAvailableInBytes: data.metrics.memory.total - usedMemory,
        uptime: dayjs().diff(dayjs(data.info.os.uptime), "seconds"),
        network: null,
        loadAverage: null,
        rebootRequired: false,
        availablePkgUpdates: 0,
        cpuTemp: undefined,
        fileSystem: disks.flatMap((disk) =>
          disk.fsSize === null || disk.fsFree === null || disk.fsUsed === null || disk.fsSize === 0
            ? []
            : [
                {
                  deviceName: disk.name ?? disk.device ?? disk.id,
                  used: `${disk.fsUsed * 1024}`,
                  available: `${disk.fsFree * 1024}`,
                  percentage: (disk.fsUsed / disk.fsSize) * 100,
                },
              ],
        ),
        smart: disks.map((disk) => ({
          deviceName: disk.name ?? disk.device ?? disk.id,
          temperature: disk.temp ?? null,
          overallStatus: disk.status ?? "UNKNOWN",
          healthy: disk.status === "DISK_OK",
        })),
        gpu: [],
      };
    });
  }

  protected async testingAsync(http: SystemsHttpOperation) {
    await this.queryAsync(http, "query { info { os { platform } } }");
    return { success: true } as const;
  }

  private async queryAsync(http: SystemsHttpOperation, query: string) {
    this.resources.log?.write("debug", "Sending GraphQL query", { integrationId: this.integration.id });
    const envelope = envelopeSchema.parse(
      await http.jsonAsync(this.url("/graphql"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": this.secret("apiKey") },
        body: JSON.stringify({ query }),
      }),
    );
    if (envelope.errors) throw new Error(`GraphQL errors: ${envelope.errors.map((error) => error.message).join(", ")}`);
    return envelope.data;
  }
}
