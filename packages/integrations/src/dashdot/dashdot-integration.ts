import { humanFileSize } from "@homarr/common";

import "@homarr/redis";

import dayjs from "dayjs";
import { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import { createChannelEventHistory } from "../../../redis/src/lib/channel";
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
    const info = await this.getInfoAsync();
    const cpuLoad = await this.getCurrentCpuLoadAsync();
    const memoryLoad = await this.getCurrentMemoryLoadAsync();
    const storageLoad = await this.getCurrentStorageLoadAsync();

    const channel = this.getChannel();
    const history = await channel.getSliceUntilTimeAsync(dayjs().subtract(15, "minutes").toDate());

    return {
      cpuUtilization: cpuLoad.sumLoad,
      memUsed: `${memoryLoad.loadInBytes}`,
      memAvailable: `${info.maxAvailableMemoryBytes - memoryLoad.loadInBytes}`,
      fileSystem: info.storage
        .filter((_, index) => storageLoad[index] !== -1) // filter out undermoutned drives, they display as -1 in the load API
        .map((storage, index) => ({
          deviceName: `Storage ${index + 1}: (${storage.disks.map((disk) => disk.device).join(", ")})`,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          used: humanFileSize(storageLoad[index]!),
          available: storageLoad[index] ? `${storage.size - storageLoad[index]}` : `${storage.size}`,
          percentage: storageLoad[index] ? (storageLoad[index] / storage.size) * 100 : 0,
        })),
      cpuModelName: info.cpuModel === "" ? `Unknown Model (${info.cpuBrand})` : `${info.cpuModel} (${info.cpuBrand})`,
      cpuTemp: cpuLoad.averageTemperature,
      availablePkgUpdates: 0,
      rebootRequired: false,
      smart: [],
      uptime: info.uptime,
      version: `${info.operatingSystemVersion}`,
      loadAverage: {
        "1min": Math.round(this.getAverageOfCpu(history[0])),
        "5min": Math.round(this.getAverageOfCpuFlat(history.slice(0, 4))),
        "15min": Math.round(this.getAverageOfCpuFlat(history.slice(0, 14))),
      },
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
    };
  }

  private async getCurrentCpuLoadAsync() {
    const channel = this.getChannel();
    const cpu = await fetchWithTrustedCertificatesAsync(this.url("/load/cpu"));
    const data = await cpuLoadPerCoreApiList.parseAsync(await cpu.json());
    await channel.pushAsync(data);
    return {
      sumLoad: this.getAverageOfCpu(data),
      averageTemperature: data.reduce((acc, current) => acc + current.temp, 0) / data.length,
    };
  }

  private getAverageOfCpuFlat(cpuLoad: z.infer<typeof cpuLoadPerCoreApiList>[]) {
    const averages = cpuLoad.map((load) => this.getAverageOfCpu(load));
    return averages.reduce((acc, current) => acc + current, 0) / averages.length;
  }

  private getAverageOfCpu(cpuLoad?: z.infer<typeof cpuLoadPerCoreApiList>) {
    if (!cpuLoad) {
      return 0;
    }
    return cpuLoad.reduce((acc, current) => acc + current.load, 0) / cpuLoad.length;
  }

  private async getCurrentStorageLoadAsync() {
    const storageLoad = await fetchWithTrustedCertificatesAsync(this.url("/load/storage"));
    return (await storageLoad.json()) as number[];
  }

  private async getCurrentMemoryLoadAsync() {
    const memoryLoad = await fetchWithTrustedCertificatesAsync(this.url("/load/ram"));
    const data = await memoryLoadApi.parseAsync(await memoryLoad.json());
    return {
      loadInBytes: data.load,
    };
  }

  private getChannel() {
    return createChannelEventHistory<z.infer<typeof cpuLoadPerCoreApiList>>(
      `integration:${this.integration.id}:history:cpu`,
      100,
    );
  }
}

const cpuLoadPerCoreApi = z.object({
  load: z.number().min(0),
  temp: z.number().min(0),
});

const memoryLoadApi = z.object({
  load: z.number().min(0),
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
});

const cpuLoadPerCoreApiList = z.array(cpuLoadPerCoreApi);
