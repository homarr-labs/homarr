import type { IUpsSummaryIntegration } from "../../interfaces/ups-summary/ups-summary-integration";
import type { UpsSummary } from "../../types";

export class UpsSummaryMockService implements IUpsSummaryIntegration {
  public async getUpsSummariesAsync(): Promise<UpsSummary[]> {
    return await Promise.resolve([
      {
        id: "ups-rack-1",
        name: "CyberPower OR1500",
        manufacturer: "CyberPower",
        model: "OR1500LCDRM1U",
        serial: "CPS1500-001",
        status: "online",
        batteryCharge: 100,
        batteryRuntime: 2280,
        batteryVoltage: 27.3,
        load: 42,
        inputVoltage: 230,
        outputVoltage: 230,
        power: 315,
        temperature: 29,
      },
      {
        id: "ups-rack-2",
        name: "APC Back-UPS Pro",
        manufacturer: "APC",
        model: "BR1500G",
        serial: "APC1500-002",
        status: "onBattery",
        batteryCharge: 64,
        batteryRuntime: 840,
        batteryVoltage: 25.1,
        load: 58,
        inputVoltage: 0,
        outputVoltage: 229,
        power: 410,
        temperature: 31,
      },
    ]);
  }
}
