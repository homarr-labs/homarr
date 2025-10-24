import type { ISystemUsageIntegration } from "../../interfaces/system-usage/system-usage-integration";
import type { System } from "../../types";

export class SystemUsageMockService implements ISystemUsageIntegration {
  async getSystemsAsync(): Promise<Pick<System, "id" | "name">[]> {
    return await Promise.resolve([
      { id: "1", name: "Mock System 1" },
      { id: "2", name: "Mock System 2" },
    ]);
  }
  async getSystemDetailsAsync(id: System["id"]): Promise<System> {
    return await Promise.resolve({
      id,
      name: `Mock System ${id}`,
      status: "up",
      agent: {
        connectionType: "webSocket",
        version: "1.0.0",
      },
      usage: {
        cpuPercentage: 25,
        memoryPercentage: 50,
        diskPercentage: 75,
        gpuPercentage: null,
        load: {
          status: "good",
          averages: {
            one: 0.5,
            five: 0.7,
            fifteen: 0.9,
          },
        },
        networkBytes: 2 ** 24.5,
        temperature: 55,
      },
    });
  }
}
