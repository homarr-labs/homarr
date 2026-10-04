// @vitest-environment node

import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { createChannelEventHistoryOld } from "../../../../redis/src/lib/channel";
import { DashDotIntegration } from "../dashdot-integration";

vi.mock("@homarr/redis", () => ({}));
vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("../../../../redis/src/lib/channel", () => ({ createChannelEventHistoryOld: vi.fn() }));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const mockCreateHistory = vi.mocked(createChannelEventHistoryOld);

const channel = {
  pushAsync: vi.fn(),
  getSliceUntilTimeAsync: vi.fn(),
};

const integration = new DashDotIntegration({
  id: "dashdot-1",
  name: "DashDot",
  url: "https://dashdot.example.com",
  externalUrl: null,
  decryptedSecrets: [],
});

describe("DashDotIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateHistory.mockReturnValue(channel as never);
  });

  test("starts independent requests together and reads history after the CPU sample is persisted", async () => {
    const requestGates = new Map<string, ReturnType<typeof Promise.withResolvers<Response>>>();
    const persistenceGate = Promise.withResolvers<void>();
    const order: string[] = [];

    mockFetch.mockImplementation((url) => {
      const path = new URL(url.toString()).pathname;
      const gate = Promise.withResolvers<Response>();
      requestGates.set(path, gate);
      return gate.promise;
    });
    channel.pushAsync.mockImplementation(async () => {
      order.push("push-start");
      await persistenceGate.promise;
      order.push("push-end");
    });
    channel.getSliceUntilTimeAsync.mockImplementation(async () => {
      order.push("history");
      return [cpuLoad];
    });

    const resultPromise = integration.getSystemInfoAsync();

    await vi.waitFor(() => {
      expect([...requestGates.keys()]).toEqual([
        "/info",
        "/load/cpu",
        "/load/ram",
        "/load/storage",
        "/load/network",
        "/load/gpu",
      ]);
    });

    requestGates.get("/info")?.resolve(jsonResponse(serverInfo));
    requestGates.get("/load/cpu")?.resolve(jsonResponse(cpuLoad));
    requestGates.get("/load/ram")?.resolve(jsonResponse({ load: 4_000 }));
    requestGates.get("/load/storage")?.resolve(jsonResponse([250]));
    requestGates.get("/load/network")?.resolve(jsonResponse({ up: 20, down: 10 }));
    requestGates.get("/load/gpu")?.resolve(jsonResponse({ layout: [{ load: 30, memory: 40 }] }));

    await vi.waitFor(() => expect(channel.pushAsync).toHaveBeenCalledOnce());
    expect(channel.getSliceUntilTimeAsync).not.toHaveBeenCalled();

    persistenceGate.resolve();
    const result = await resultPromise;

    expect(order).toEqual(["push-start", "push-end", "history"]);
    expect(result).toMatchObject({
      cpuUtilization: 15,
      memUsedInBytes: 4_000,
      memAvailableInBytes: 12_000,
      network: { up: 20, down: 10 },
      fileSystem: [{ used: "250", available: "750", percentage: 25 }],
      gpu: [{ memoryUtilization: 40, processorUtilization: 30 }],
    });
  });
});

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

const cpuLoad = [
  { load: 10, temp: 40 },
  { load: 20, temp: 50 },
];

const serverInfo = {
  os: { distro: "Linux", kernel: "6.0", release: "1", uptime: 60 },
  cpu: { brand: "Intel", model: "Test CPU" },
  ram: { size: 16_000 },
  storage: [{ size: 1_000, disks: [{ device: "sda", brand: "Test", type: "SSD" }] }],
  gpu: { layout: [{ brand: "Test GPU" }] },
};
