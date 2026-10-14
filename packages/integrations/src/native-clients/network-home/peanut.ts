import { Buffer } from "node:buffer";

import { ResponseError } from "@homarr/common/response-error";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { UpsStatus, UpsSummary } from "../../interfaces/ups-summary/ups-summary-types";
import { peaNutDevicesSchema } from "../../peanut/peanut-types";
import type { PeaNutDevice } from "../../peanut/peanut-types";
import { NetworkHomeProtocol } from "./transport";
import type { NetworkHomeHttpOperation } from "./transport";

export class PeaNutProtocol extends NetworkHomeProtocol {
  async getUpsSummariesAsync(): Promise<UpsSummary[]> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/v1/devices", { meta: true }),
        { headers: this.authHeaders() },
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
          return peaNutDevicesSchema
            .parse(await response.json())
            .map((device, index) => this.mapDeviceToSummary(device, index));
        },
      ),
    );
  }

  protected async testingAsync(http: NetworkHomeHttpOperation): Promise<TestingResult> {
    return http.responseAsync(this.url("/api/v1/devices"), { headers: this.authHeaders() }, async (response) => {
      if (!response.ok) return TestConnectionError.StatusResult(response);
      await response.json();
      return { success: true };
    });
  }

  private mapDeviceToSummary(device: PeaNutDevice, index: number): UpsSummary {
    const manufacturer = this.readString(device, "device.mfr") ?? this.readString(device, "ups.mfr");
    const model = this.readString(device, "device.model") ?? this.readString(device, "ups.model");
    const id = this.readString(device, "peanut.device_id") ?? `ups-${index}`;
    return {
      id,
      name: [manufacturer, model].filter(Boolean).join(" ") || id,
      manufacturer,
      model,
      serial: this.readString(device, "device.serial"),
      status: this.parseStatus(this.readString(device, "ups.status")),
      batteryCharge: this.readNumber(device, "battery.charge"),
      batteryRuntime: this.readNumber(device, "battery.runtime"),
      batteryVoltage: this.readNumber(device, "battery.voltage"),
      load: this.readNumber(device, "ups.load"),
      inputVoltage: this.readNumber(device, "input.voltage"),
      outputVoltage: this.readNumber(device, "output.voltage"),
      power: this.readNumber(device, "ups.realpower") ?? this.readNumber(device, "ups.power"),
      temperature: this.readNumber(device, "ups.temperature"),
    };
  }

  private parseStatus(raw: string | null): UpsStatus {
    const flags = (raw ?? "").toUpperCase().split(/\s+/).filter(Boolean);
    if (flags.includes("LB")) return "lowBattery";
    if (flags.includes("OB")) return "onBattery";
    if (flags.includes("OL")) return flags.includes("CHRG") ? "charging" : "online";
    return "unknown";
  }

  private readString(device: PeaNutDevice, key: string): string | null {
    const value = device[key];
    if (value === undefined || value === null) return null;
    const result = String(value).trim();
    return result.length > 0 ? result : null;
  }

  private readNumber(device: PeaNutDevice, key: string): number | null {
    const value = device[key];
    if (value === undefined || value === null || value === "") return null;
    const result = typeof value === "number" ? value : Number(value);
    return Number.isFinite(result) ? result : null;
  }

  private authHeaders(): Record<string, string> {
    if (!this.hasSecret("username") || !this.hasSecret("password")) return {};
    return {
      Authorization: `Basic ${Buffer.from(`${this.secret("username")}:${this.secret("password")}`).toString("base64")}`,
    };
  }
}
