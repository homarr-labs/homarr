import { z } from "zod/v4";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { SystemHealthMonitoring } from "../../interfaces/health-monitoring/health-monitoring-types";
import { settleAllAsync, SystemsHttpClient, SystemsResourceHold } from "./http";
import type { SystemsHttpOperation } from "./http";
import { pickSystemHealthStats } from "./stats";

const cpuSchema = z.array(z.object({ load: z.number().min(0), temp: z.number().min(0) }));
const infoSchema = z.object({
  os: z.object({ distro: z.string(), kernel: z.string(), release: z.string(), uptime: z.number().min(0) }),
  cpu: z.object({ brand: z.string(), model: z.string() }),
  ram: z.object({ size: z.number().min(0) }),
  storage: z.array(
    z.object({
      size: z.number().min(0),
      disks: z.array(z.object({ device: z.string(), brand: z.string(), type: z.string() })),
    }),
  ),
  gpu: z.object({ layout: z.array(z.object({ brand: z.string(), model: z.string().optional() })).default([]) }),
});
const gpuSchema = z.object({
  layout: z.array(z.object({ load: z.number().min(0).optional(), memory: z.number().min(0).optional() })),
});
const memorySchema = z.object({ load: z.number().min(0) });
const networkSchema = z.object({ up: z.number().min(0), down: z.number().min(0) });

export interface DashDotSnapshot {
  info: z.infer<typeof infoSchema>;
  cpu: { sumLoad: number; averageTemperature: number; sample?: z.infer<typeof cpuSchema> };
  memory: number;
  storage: number[];
  network: z.infer<typeof networkSchema> | null;
  gpu: z.infer<typeof gpuSchema>["layout"];
}

export class DashDotHttpClient extends SystemsHttpClient {
  async getStatsAsync() {
    return pickSystemHealthStats(await this.getSystemInfoAsync());
  }

  async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    throw new SystemsResourceHold("dashdot-history");
  }

  async readSystemSnapshotAsync(): Promise<DashDotSnapshot> {
    return await this.runAsync(async (http) => {
      const [info, cpu, memory, storage, network, gpu] = await settleAllAsync([
        http.readAsync(this.url("/info"), async (response) => infoSchema.parse(await response.json())),
        this.cpuAsync(http),
        this.memoryAsync(http),
        this.storageAsync(http),
        this.networkAsync(http),
        this.gpuAsync(http),
      ] as const);
      return { info, cpu, memory, storage, network, gpu };
    });
  }

  protected async testingAsync(http: SystemsHttpOperation) {
    return await http.readAsync(this.url("/info"), async (response) => {
      if (!response.ok) return TestConnectionError.StatusResult(response);
      await response.json();
      return { success: true } as const;
    });
  }

  private async cpuAsync(http: SystemsHttpOperation): Promise<DashDotSnapshot["cpu"]> {
    const text = await http.readAsync(this.url("/load/cpu"), (response) => response.text());
    if (text.length === 0) return { sumLoad: 0, averageTemperature: 0 };
    const sample = cpuSchema.parse(JSON.parse(text));
    return {
      sumLoad: averageCpu(sample),
      averageTemperature: sample.reduce((sum, cpu) => sum + cpu.temp, 0) / sample.length,
      sample,
    };
  }

  private async storageAsync(http: SystemsHttpOperation) {
    const text = await http.readAsync(this.url("/load/storage"), (response) => response.text());
    return text.length === 0 ? [] : z.array(z.number()).parse(JSON.parse(text));
  }

  private async memoryAsync(http: SystemsHttpOperation) {
    const data: unknown = await http.readAsync(this.url("/load/ram"), (response) => response.json());
    const object = z.record(z.string(), z.unknown()).parse(data);
    return Object.keys(object).length === 0 ? 0 : memorySchema.parse(object).load;
  }

  private async networkAsync(http: SystemsHttpOperation) {
    const text = await http.readAsync(this.url("/load/network"), (response) => response.text());
    return text.length === 0 ? null : networkSchema.parse(JSON.parse(text));
  }

  private async gpuAsync(http: SystemsHttpOperation) {
    try {
      return await http.readAsync(
        this.url("/load/gpu"),
        async (response) => gpuSchema.parse(await response.json()).layout,
      );
    } catch (error) {
      http.rethrowCritical(error);
      return [];
    }
  }
}

function averageCpu(sample?: z.infer<typeof cpuSchema>) {
  if (!sample) return 0;
  return sample.reduce((sum, cpu) => sum + cpu.load, 0) / sample.length;
}

function averageHistory(history: z.infer<typeof cpuSchema>[]) {
  return history.map(averageCpu).reduce((sum, value) => sum + value, 0) / history.length;
}

export function mapDashDotSystemInfo(
  snapshot: DashDotSnapshot,
  history: z.infer<typeof cpuSchema>[],
): SystemHealthMonitoring {
  const { info, cpu, memory, storage, network, gpu } = snapshot;
  return {
    cpuUtilization: cpu.sumLoad,
    memUsedInBytes: memory,
    memAvailableInBytes: info.ram.size - memory,
    network,
    fileSystem: info.storage
      .filter((_, index) => storage[index] !== -1)
      .map((disk, index) => ({
        deviceName: `Storage ${index + 1}: (${disk.disks.map((disk) => disk.device).join(", ")})`,
        used: `${storage[index]}`,
        available: storage[index] ? `${disk.size - storage[index]}` : `${disk.size}`,
        percentage: storage[index] ? (storage[index] / disk.size) * 100 : 0,
      })),
    cpuModelName: info.cpu.model === "" ? `Unknown Model (${info.cpu.brand})` : `${info.cpu.model} (${info.cpu.brand})`,
    cpuTemp: cpu.averageTemperature,
    availablePkgUpdates: 0,
    rebootRequired: false,
    smart: [],
    gpu: gpu.map((entry, index) => ({
      gpuId: `gpu-${index}`,
      name: info.gpu.layout[index]?.brand ?? `GPU ${index}`,
      memoryUtilization: entry.memory ?? 0,
      processorUtilization: entry.load ?? 0,
      temperature: null,
      fanSpeed: null,
    })),
    uptime: info.os.uptime,
    version: `${info.os.distro} ${info.os.release} (${info.os.kernel})`,
    loadAverage: {
      "1min": Math.round(averageCpu(history[0])),
      "5min": Math.round(averageHistory(history.slice(0, 4))),
      "15min": Math.round(averageHistory(history.slice(0, 14))),
    },
  };
}
