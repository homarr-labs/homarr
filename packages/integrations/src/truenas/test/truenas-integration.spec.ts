import { beforeEach, describe, expect, test, vi } from "vitest";

import { IntegrationRequestError } from "../../base/errors/http/integration-request-error";
import type { IntegrationSecret } from "../../base/types";

const ws = vi.hoisted(() => {
  const sentPayloads: Record<string, unknown>[] = [];
  const constructedUrls: string[] = [];
  // A failure with a `code` emits a coded TLS-style error; without one it mimics a missing endpoint (HTTP 404).
  const failures: { path: string; code?: string }[] = [];
  let responder: (method: string, params: unknown[]) => unknown = () => undefined;

  type Listener = (...args: unknown[]) => void;

  class FakeWebSocket {
    static readonly OPEN = 1;
    public readyState = FakeWebSocket.OPEN;
    private readonly listeners: Record<string, Listener[]> = {};

    constructor(url: URL | string) {
      constructedUrls.push(url.toString());
      setTimeout(() => {
        const failure = failures.find((candidate) => url.toString().includes(candidate.path));
        if (failure) {
          const error: Error & { code?: string } = new Error(failure.code ?? "Unexpected server response: 404");
          if (failure.code) error.code = failure.code;
          this.dispatch("error", error);
        } else {
          this.dispatch("open");
        }
      }, 0);
    }

    on(event: string, listener: Listener) {
      (this.listeners[event] ??= []).push(listener);
      return this;
    }

    once(event: string, listener: Listener) {
      const wrapper: Listener = (...args) => {
        this.off(event, wrapper);
        listener(...args);
      };
      return this.on(event, wrapper);
    }

    off(event: string, listener: Listener) {
      this.listeners[event] = (this.listeners[event] ?? []).filter((candidate) => candidate !== listener);
      return this;
    }

    send(raw: string) {
      const payload = JSON.parse(raw) as Record<string, unknown>;
      sentPayloads.push(payload);

      if (payload.msg === "connect") {
        this.respond(JSON.stringify({ msg: "connected", session: "test-session" }));
        return;
      }

      const result = responder(payload.method as string, (payload.params as unknown[] | undefined) ?? []);
      const envelope =
        payload.jsonrpc === "2.0"
          ? { jsonrpc: "2.0", id: payload.id, result }
          : { msg: "result", id: payload.id, result };
      this.respond(JSON.stringify(envelope));
    }

    close() {
      this.readyState = 3;
    }

    private respond(message: string) {
      setTimeout(() => this.dispatch("message", message), 0);
    }

    private dispatch(event: string, ...args: unknown[]) {
      // `off` replaces the array rather than mutating it, so iterating it directly is safe.
      for (const listener of this.listeners[event] ?? []) listener(...args);
    }
  }

  return {
    FakeWebSocket,
    sentPayloads,
    constructedUrls,
    failures,
    setResponder: (fn: (method: string, params: unknown[]) => unknown) => {
      responder = fn;
    },
  };
});

vi.mock("ws", () => ({ WebSocket: ws.FakeWebSocket }));
vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getAllTrustedCertificatesAsync: vi.fn().mockResolvedValue([]),
  getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
}));
vi.mock("@homarr/core/infrastructure/http", () => ({
  createCustomCheckServerIdentity: () => () => undefined,
}));

import { TrueNasIntegration } from "../truenas-integration";

const happyResponder = (method: string) => {
  switch (method) {
    case "auth.login":
    case "auth.login_with_api_key":
      return true;
    case "system.info":
      return {
        version: "TrueNAS-SCALE-24.10",
        hostname: "nas",
        physmem: 16_000_000_000,
        model: "Intel Xeon",
        uptime_seconds: 3600,
      };
    case "reporting.get_data":
      return [
        {
          name: "cpu",
          identifier: "cpu",
          aggregations: emptyAggregations(),
          start: 0,
          end: 1,
          legend: [],
          data: [[1000, 12]],
        },
        {
          name: "memory",
          identifier: "memory",
          aggregations: emptyAggregations(),
          start: 0,
          end: 1,
          // The "memory" graph reports available (free) memory: legend is ["time", "available"].
          legend: ["time", "available"],
          data: [[1000, 6_000_000_000]],
        },
        {
          name: "cputemp",
          identifier: "cputemp",
          aggregations: emptyAggregations(),
          start: 0,
          end: 1,
          legend: [],
          data: [[1000, 45]],
        },
      ];
    case "pool.query":
      return [{ name: "tank", status: "ONLINE", healthy: true, free: 500, size: 1000, allocated: 500 }];
    case "interface.query":
      return [{ id: "eth0", name: "eth0" }];
    case "reporting.netdata_get_data":
      return [{ name: "interface", identifier: "eth0", data: [[1000, 100, 200]] }];
    default:
      return null;
  }
};

const emptyAggregations = () => ({ min: {}, mean: {}, max: {} });

let integrationCounter = 0;
const createIntegration = (decryptedSecrets: IntegrationSecret[]) =>
  new TrueNasIntegration({
    id: `truenas-${(integrationCounter += 1)}`,
    name: "TrueNAS Test",
    url: "https://truenas.local",
    externalUrl: null,
    decryptedSecrets,
  });

const credentials: IntegrationSecret[] = [
  { kind: "username", value: "root" },
  { kind: "password", value: "secret" },
];

describe("TrueNasIntegration", () => {
  beforeEach(() => {
    ws.sentPayloads.length = 0;
    ws.constructedUrls.length = 0;
    ws.failures.length = 0;
    ws.setResponder(happyResponder);
  });

  test("fetches and maps system info over the JSON-RPC API", async () => {
    const integration = createIntegration(credentials);

    const result = await integration.getSystemInfoAsync();

    expect(ws.constructedUrls).toContain("wss://truenas.local/api/current");
    // JSON-RPC does not use the legacy "connect" session handshake.
    expect(ws.sentPayloads.some((payload) => payload.msg === "connect")).toBe(false);

    expect(result).toMatchObject({
      version: "TrueNAS-SCALE-24.10",
      cpuModelName: "Intel Xeon",
      cpuTemp: 45,
      // physmem (16 GB) minus the reported available 6 GB leaves 10 GB used.
      memAvailableInBytes: 6_000_000_000,
      memUsedInBytes: 10_000_000_000,
      uptime: 3600,
      rebootRequired: false,
      availablePkgUpdates: 0,
      loadAverage: null,
      gpu: [],
      network: { up: 20_000, down: 10_000 },
      // `available` is the free space left on the pool (free = 500), not its total size.
      fileSystem: [{ deviceName: "tank", available: "500", used: "500", percentage: 50 }],
      smart: [{ deviceName: "tank", healthy: true, overallStatus: "ONLINE", temperature: null }],
    });
  });

  test("authenticates with an API key when one is configured", async () => {
    const integration = createIntegration([{ kind: "apiKey", value: "api-key-123" }]);

    await integration.getSystemInfoAsync();

    const authPayload = ws.sentPayloads.find((payload) => String(payload.method).startsWith("auth."));
    expect(authPayload).toMatchObject({ method: "auth.login_with_api_key", params: ["api-key-123"] });
  });

  test("authenticates with username and password when no API key is configured", async () => {
    const integration = createIntegration(credentials);

    await integration.getSystemInfoAsync();

    const authPayload = ws.sentPayloads.find((payload) => String(payload.method).startsWith("auth."));
    expect(authPayload).toMatchObject({ method: "auth.login", params: ["root", "secret"] });
  });

  test("falls back to the legacy websocket API when the JSON-RPC endpoint is unavailable", async () => {
    ws.failures.push({ path: "/api/current" });
    const integration = createIntegration(credentials);

    const result = await integration.getSystemInfoAsync();

    expect(ws.constructedUrls).toContain("wss://truenas.local/api/current");
    expect(ws.constructedUrls).toContain("wss://truenas.local/websocket");
    // The legacy API requires the "connect" session handshake before authenticating.
    expect(ws.sentPayloads[0]).toMatchObject({ msg: "connect" });
    expect(ws.sentPayloads.find((payload) => String(payload.method).startsWith("auth."))).toMatchObject({
      msg: "method",
      method: "auth.login",
    });
    expect(result.version).toBe("TrueNAS-SCALE-24.10");
  });

  test("rejects when authentication is not successful", async () => {
    ws.setResponder((method) => (method.startsWith("auth.") ? false : happyResponder(method)));
    const integration = createIntegration(credentials);

    await expect(integration.getSystemInfoAsync()).rejects.toThrow();
  });

  test("surfaces a self-signed certificate as a certificate request error without falling back", async () => {
    ws.failures.push({ path: "/api/current", code: "DEPTH_ZERO_SELF_SIGNED_CERT" });
    ws.failures.push({ path: "/websocket", code: "DEPTH_ZERO_SELF_SIGNED_CERT" });
    const integration = createIntegration(credentials);

    const error = await integration.getSystemInfoAsync().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(IntegrationRequestError);
    expect((error as IntegrationRequestError).cause).toMatchObject({ type: "certificate", reason: "untrusted" });
    // A certificate failure is endpoint-independent, so the legacy API must not be tried.
    expect(ws.constructedUrls).not.toContain("wss://truenas.local/websocket");
  });
});
