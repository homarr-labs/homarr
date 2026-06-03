import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IUpsSummaryIntegration } from "../interfaces/ups-summary/ups-summary-integration";
import type { UpsSummary } from "../interfaces/ups-summary/ups-summary-types";
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
      status: this.readString(device, "ups.status") ?? "",
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
