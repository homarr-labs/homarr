import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IUpsSummaryIntegration } from "../interfaces/ups-summary/ups-summary-integration";
import type { UpsStatus, UpsSummary } from "../interfaces/ups-summary/ups-summary-types";
import type { PeaNutDevice } from "./peanut-types";
import { peaNutDevicesSchema } from "./peanut-types";

export class PeaNutIntegration extends Integration implements IUpsSummaryIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/v1/devices"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) return TestConnectionError.StatusResult(response);

    await response.json();

    return { success: true };
  }

  public async getUpsSummariesAsync(): Promise<UpsSummary[]> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/devices", { meta: true }), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const devices = peaNutDevicesSchema.parse(await response.json());
    return devices.map((device, index) => this.mapDeviceToSummary(device, index));
  }

  private mapDeviceToSummary(device: PeaNutDevice, index: number): UpsSummary {
    const manufacturer = this.readString(device, "device.mfr") ?? this.readString(device, "ups.mfr");
    const model = this.readString(device, "device.model") ?? this.readString(device, "ups.model");
    const id = this.readString(device, "peanut.device_id") ?? `ups-${index}`;
    const name = [manufacturer, model].filter(Boolean).join(" ") || id;

    return {
      id,
      name,
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

  /**
   * Resolves the raw NUT `ups.status` flags (e.g. "OL CHRG", "OB DISCHRG LB") into a single
   * normalized status. The flags are checked in priority order so the most critical state wins.
   */
  private parseStatus(rawStatus: string | null): UpsStatus {
    const flags = (rawStatus ?? "").toUpperCase().split(/\s+/).filter(Boolean);

    if (flags.includes("LB")) return "lowBattery";
    if (flags.includes("OB")) return "onBattery";
    if (flags.includes("OL")) {
      return flags.includes("CHRG") ? "charging" : "online";
    }

    return "unknown";
  }

  private readString(device: PeaNutDevice, key: string): string | null {
    const value = device[key];
    if (value === undefined || value === null) return null;
    const stringValue = String(value).trim();
    return stringValue.length > 0 ? stringValue : null;
  }

  private readNumber(device: PeaNutDevice, key: string): number | null {
    const value = device[key];
    if (value === undefined || value === null || value === "") return null;
    const numberValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.hasSecretValue("username") && this.hasSecretValue("password")) {
      const credentials = Buffer.from(`${this.getSecretValue("username")}:${this.getSecretValue("password")}`).toString(
        "base64",
      );
      return { Authorization: `Basic ${credentials}` };
    }

    return {};
  }
}
