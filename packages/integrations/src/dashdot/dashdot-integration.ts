import {Integration} from "../base/integration";
import type {CpuLoad} from "../interfaces/hardware-usage/cpu-load";
import type {MemoryLoad} from "../interfaces/hardware-usage/memory-load";
import type {NetworkLoad} from "../interfaces/hardware-usage/network-load";

export class DashDotIntegration extends Integration {
    public async testConnectionAsync(): Promise<void> {
      const response = await fetch(this.appendPathToUrlWithEndingSlash(this.integration.url, "info"));
      await response.json();
    }

    public async getCurrentCpuLoadAsync(): Promise<CpuLoad> {
      const cpu = await fetch(this.appendPathToUrlWithEndingSlash(this.integration.url, "load/cpu"));
      const data = (await cpu.json()) as CpuLoadApi[];
      return {
        sumLoad: data.reduce((acc, current) => acc + current.load, 0) / data.length,
      };
    }

    public async getCurrentMemoryLoadAsync(): Promise<MemoryLoad> {
      const memoryLoad = await fetch(this.appendPathToUrlWithEndingSlash(this.integration.url, "load/ram"));
      const data = (await memoryLoad.json()) as MemoryLoadApi;
      return {
        loadInBytes: data.load
      }
    }

    public async getCurrentNetworkLoadAsync(): Promise<NetworkLoad> {
      const memoryLoad = await fetch(this.appendPathToUrlWithEndingSlash(this.integration.url, "load/network"));
      const data = (await memoryLoad.json()) as NetworkLoadApi;
      return {
        down: data.down,
        up: data.up
      }
    }
}

/**
 * CPU load per core
 */
interface CpuLoadApi {
  load: number;
}

interface MemoryLoadApi {
  load: number;
}

interface NetworkLoadApi {
  up: number;
  down: number;
}