import {Integration} from "../base/integration";
import type {CpuLoad} from "../interfaces/hardware-usage/cpu-load";

export class DashDotIntegration extends Integration {
    public async testConnectionAsync(): Promise<void> {
      const response = await fetch(this.integration.url + (this.integration.url.endsWith("/") ? "info" : "/info"));
      await response.json();
    }

    public async getCurrentCpuLoadAsync(): Promise<CpuLoad> {
      const cpu = await fetch(this.integration.url + (this.integration.url.endsWith("/") ? "load/cpu" : "/load/cpu"));
      const data = (await cpu.json()) as CpuLoadApi[];
      return {
        sumLoad: data.reduce((acc, current) => acc + current.load, 0),
      };
    }
}

/**
 * CPU load per core
 */
interface CpuLoadApi {
  load: number;
}