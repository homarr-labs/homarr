import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../base/types";
import { PeaNutIntegration } from "../peanut-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://peanut.example.com";

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const mockDevicesResponse = (devices: Record<string, string | number>[]) => {
  mockFetch.mockImplementation(
    () =>
      Promise.resolve(
        new Response(JSON.stringify(devices), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>,
  );
};

const createIntegration = (decryptedSecrets: IntegrationSecret[] = []) =>
  new PeaNutIntegration({
    id: "test-peanut",
    name: "Test PeaNUT",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets,
  });

beforeEach(() => {
  mockFetch.mockReset();
});

describe("PeaNutIntegration getUpsSummariesAsync", () => {
  test("maps NUT variables to a UPS summary and coerces string values to numbers", async () => {
    mockDevicesResponse([
      {
        "device.mfr": "CyberPower",
        "device.model": "CP1500EPFCLCD",
        "device.serial": "ABC123",
        "ups.status": "OL CHRG",
        "ups.load": "23",
        "ups.realpower": "120",
        "ups.temperature": "31.5",
        "battery.charge": "100",
        "battery.runtime": "3720",
        "battery.voltage": "27.3",
        "input.voltage": "230",
        "output.voltage": "229",
        "peanut.device_id": "ups",
        "peanut.server": "localhost:3493",
      },
    ]);

    const [summary] = await createIntegration().getUpsSummariesAsync();

    expect(summary).toStrictEqual({
      id: "ups",
      name: "CyberPower CP1500EPFCLCD",
      manufacturer: "CyberPower",
      model: "CP1500EPFCLCD",
      serial: "ABC123",
      status: "charging",
      batteryCharge: 100,
      batteryRuntime: 3720,
      batteryVoltage: 27.3,
      load: 23,
      inputVoltage: 230,
      outputVoltage: 229,
      power: 120,
      temperature: 31.5,
    });
  });

  test("falls back when optional variables are missing", async () => {
    mockDevicesResponse([
      {
        "ups.status": "OB DISCHRG LB",
        "ups.power": "90",
        "battery.charge": "15",
      },
    ]);

    const [summary] = await createIntegration().getUpsSummariesAsync();

    expect(summary).toMatchObject({
      id: "ups-0",
      name: "ups-0",
      manufacturer: null,
      model: null,
      status: "lowBattery",
      batteryCharge: 15,
      batteryRuntime: null,
      load: null,
      inputVoltage: null,
      outputVoltage: null,
      power: 90,
      temperature: null,
    });
  });

  test("returns a summary per device", async () => {
    mockDevicesResponse([
      { "peanut.device_id": "ups-a", "ups.status": "OL" },
      { "peanut.device_id": "ups-b", "ups.status": "OB" },
    ]);

    const summaries = await createIntegration().getUpsSummariesAsync();

    expect(summaries.map((summary) => summary.id)).toStrictEqual(["ups-a", "ups-b"]);
  });

  test("normalizes NUT status flags into a typed status", async () => {
    mockDevicesResponse([
      { "ups.status": "OL" },
      { "ups.status": "OL CHRG" },
      { "ups.status": "OB DISCHRG" },
      { "ups.status": "OB DISCHRG LB" },
      { "ups.status": "OL LB" },
      { "ups.status": "" },
    ]);

    const summaries = await createIntegration().getUpsSummariesAsync();

    expect(summaries.map((summary) => summary.status)).toStrictEqual([
      "online",
      "charging",
      "onBattery",
      "lowBattery",
      "lowBattery",
      "unknown",
    ]);
  });
});

describe("PeaNutIntegration authentication", () => {
  test("sends a Basic auth header when username and password are configured", async () => {
    mockDevicesResponse([]);

    await createIntegration([
      { kind: "username", value: "admin" },
      { kind: "password", value: "secret" },
    ]).getUpsSummariesAsync();

    const expected = `Basic ${Buffer.from("admin:secret").toString("base64")}`;
    const [, requestInit] = mockFetch.mock.calls[0] ?? [];
    expect(requestInit?.headers).toMatchObject({ Authorization: expected });
  });

  test("omits the auth header when no credentials are configured", async () => {
    mockDevicesResponse([]);

    await createIntegration().getUpsSummariesAsync();

    const [, requestInit] = mockFetch.mock.calls[0] ?? [];
    expect(requestInit?.headers).toStrictEqual({});
  });
});
