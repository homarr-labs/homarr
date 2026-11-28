import { z } from "zod/v4";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createChannelEventHistoryOld } from "@homarr/redis";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../interfaces/health-monitoring/health-monitoring-types";

export class DashDotIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/info"));
    if (!response.ok) return TestConnectionError.StatusResult(response);

    await response.json();

    return {
      success: true,
    };
  }

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    const [info, cpuLoad, memoryLoad, storageLoad, networkLoad, gpuLoad] = await Promise.all([
      this.getInfoAsync(),
      this.getCurrentCpuLoadAsync(),
      this.getCurrentMemoryLoadAsync(),
      this.getCurrentStorageLoadAsync(),
      this.getCurrentNetworkLoadAsync(),
      this.getCurrentGpuLoadAsync(),
    ]);

    // Read history after the CPU request has persisted its newest sample.
    let loadAverage: SystemHealthMonitoring["loadAverage"] = null;
    if (cpuLoad.sumLoad !== null) {
      const history = await this.getChannel().getSliceAsync(0, 99);
      const now = Date.now();
      const observed = history.flatMap(({ data, timestamp }) => {
        if (!data.length) return [];
        return [{ time: timestamp.getTime(), percent: this.getAverageOfCpu(data) }];
      });
      const averageSince = (minutes: number) => {
        const samples = observed.filter(({ time }) => time >= now - minutes * 60_000 && time <= now);
        if (samples.length === 0) return null;
        return Math.round(samples.reduce((sum, { percent }) => sum + percent, 0) / samples.length);
      };
      loadAverage = { "1min": averageSince(1), "5min": averageSince(5), "15min": averageSince(15) };
    }
    let availableMemory = null;
    if (memoryLoad !== null) availableMemory = info.maxAvailableMemoryBytes - memoryLoad;
    return {
      cpuUtilization: cpuLoad.sumLoad,
      cpuCores: cpuLoad.cores,
      memUsedInBytes: memoryLoad,
      memAvailableInBytes: availableMemory,
      network: networkLoad,
      fileSystem: info.storage.flatMap((storage, index) => {
        const used = storageLoad[index];
        // Keep the original index when skipping unmounted or unavailable drives.
        if (used === undefined || !Number.isFinite(used) || used < 0 || storage.size <= 0) return [];
        return [
          {
            deviceName: `Storage ${index + 1}: (${storage.disks.map((disk) => disk.device).join(", ")})`,
            used: `${used}`,
            available: `${Math.max(0, storage.size - used)}`,
            percentage: (used / storage.size) * 100,
          },
        ];
      }),
      cpuModelName: info.cpuModel === "" ? `Unknown Model (${info.cpuBrand})` : `${info.cpuModel} (${info.cpuBrand})`,
      cpuTemp: cpuLoad.averageTemperature,
      availablePkgUpdates: null,
      rebootRequired: null,
      smart: [], // API endpoint does not provide S.M.A.R.T data.
      gpu: gpuLoad.map((gpu, index) => ({
        gpuId: `gpu-${index}`,
        name: info.gpuNames[index] ?? `GPU ${index}`,
        memoryUtilization: gpu.memory ?? null,
        processorUtilization: gpu.load ?? null,
        temperature: null,
        fanSpeed: null,
      })),
      uptime: info.uptime,
      version: `${info.operatingSystemVersion}`,
      loadAverage,
    };
  }

  private async getInfoAsync() {
    const infoResponse = await fetchWithTrustedCertificatesAsync(this.url("/info"));
    const serverInfo = await internalServerInfoApi.parseAsync(await infoResponse.json());
    return {
      maxAvailableMemoryBytes: serverInfo.ram.size,
      storage: serverInfo.storage,
      cpuBrand: serverInfo.cpu.brand,
      cpuModel: serverInfo.cpu.model,
      operatingSystemVersion: `${serverInfo.os.distro} ${serverInfo.os.release} (${serverInfo.os.kernel})`,
      uptime: serverInfo.os.uptime,
      gpuNames: serverInfo.gpu.layout.map((gpu) => gpu.brand),
    };
  }

  private async getCurrentCpuLoadAsync() {
    const channel = this.getChannel();
    const response = await fetchWithTrustedCertificatesAsync(this.url("/load/cpu"));
    const result = await response.text();

    // we convert it to text as the response is either valid json or empty if cpu widget is disabled.
    let data: z.infer<typeof cpuLoadPerCoreApiList> = [];
    if (result.trim()) data = await cpuLoadPerCoreApiList.parseAsync(JSON.parse(result));
    if (data.length === 0) return { sumLoad: null, cores: [], averageTemperature: undefined };

    await channel.pushAsync(data);
    const temperatures = data.flatMap((core) => core.temp ?? []);
    let averageTemperature;
    if (temperatures.length)
      averageTemperature = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
    return {
      sumLoad: this.getAverageOfCpu(data),
      cores: data.map((core, id) => ({ id, utilization: core.load })),
      averageTemperature,
    };
  }

  private getAverageOfCpu(cpuLoad: z.infer<typeof cpuLoadPerCoreApiList>) {
    return cpuLoad.reduce((acc, current) => acc + current.load, 0) / cpuLoad.length;
  }

  private async getCurrentStorageLoadAsync() {
    const storageLoad = await fetchWithTrustedCertificatesAsync(this.url("/load/storage"));
    // we convert it to text as the response is either valid json or empty if storage widget is disabled.
    const result = await storageLoad.text();
    if (result.length === 0) {
      return [];
    }

    return JSON.parse(result) as number[];
  }

  private async getCurrentMemoryLoadAsync() {
    const memoryLoad = await fetchWithTrustedCertificatesAsync(this.url("/load/ram"));
    const result = (await memoryLoad.json()) as object;

    // somehow the response here is not empty and rather an empty json object if the ram widget is disabled.
    if (Object.keys(result).length === 0) {
      return null;
    }

    const data = await memoryLoadApi.parseAsync(result);
    return data.load;
  }

  private async getCurrentNetworkLoadAsync() {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/load/network"));
    const result = await response.text();

    // we convert it to text as the response is either valid json or empty if network widget is disabled.
    if (result.length === 0) return null;

    return await networkLoadApi.parseAsync(JSON.parse(result));
  }

  private async getCurrentGpuLoadAsync() {
    try {
      const response = await fetchWithTrustedCertificatesAsync(this.url("/load/gpu"));
      const result = await response.json();
      const data = await gpuLoadApi.parseAsync(result);
      return data.layout;
    } catch {
      return [];
    }
  }

  private getChannel() {
    return createChannelEventHistoryOld<z.infer<typeof cpuLoadPerCoreApiList>>(
      `integration:${this.integration.id}:history:cpu`,
      100,
    );
  }
}

const cpuLoadPerCoreApi = z.object({
  load: z.number().min(0),
  temp: z.number().min(0).nullish().catch(undefined),
});

const memoryLoadApi = z.object({
  load: z.number().min(0),
});

const networkLoadApi = z.object({
  up: z.number().min(0),
  down: z.number().min(0),
});

const internalServerInfoApi = z.object({
  os: z.object({
    distro: z.string(),
    kernel: z.string(),
    release: z.string(),
    uptime: z.number().min(0),
  }),
  cpu: z.object({
    brand: z.string(),
    model: z.string(),
  }),
  ram: z.object({
    size: z.number().min(0),
  }),
  storage: z.array(
    z.object({
      size: z.number().min(0),
      disks: z.array(
        z.object({
          device: z.string(),
          brand: z.string(),
          type: z.string(),
        }),
      ),
    }),
  ),
  gpu: z.object({
    layout: z
      .array(
        z.object({
          brand: z.string(),
          model: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

const cpuLoadPerCoreApiList = z.array(cpuLoadPerCoreApi);

const gpuLoadApi = z.object({
  layout: z.array(
    z.object({
      load: z.number().min(0).optional(),
      memory: z.number().min(0).optional(),
    }),
  ),
});
