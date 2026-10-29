// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { IntegrationRequestError } from "../../base/errors/http/integration-request-error";
import type { IntegrationSecret } from "../../base/types";

const ws = vi.hoisted(() => {
  const sentPayloads: Record<string, unknown>[] = [];
  const constructedUrls: string[] = [];
  // A failure with a `code` emits a coded TLS-style error; without one it mimics a missing endpoint (HTTP 404).
  const failures: { path: string; code?: string }[] = [];
  let responder: (method: string, params: unknown[]) => unknown | Promise<unknown> = () => undefined;

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

      void Promise.resolve(responder(payload.method as string, (payload.params as unknown[] | undefined) ?? [])).then(
        (result) => {
          // An Error mimics a rejected method; promises support independent-request checks.
          const body = result instanceof Error ? { error: { message: result.message } } : { result };
          const envelope =
            payload.jsonrpc === "2.0"
              ? { jsonrpc: "2.0", id: payload.id, ...body }
              : { msg: "result", id: payload.id, ...body };
          this.respond(JSON.stringify(envelope));
        },
      );
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
    setResponder: (fn: (method: string, params: unknown[]) => unknown | Promise<unknown>) => {
      responder = fn;
    },
  };
});

const logs = vi.hoisted(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock("ws", () => ({ WebSocket: ws.FakeWebSocket }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => logs }));
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
          legend: ["time", "cpu"],
          data: [[1000, 12]],
        },
        {
          name: "memory",
          identifier: "memory",
          aggregations: emptyAggregations(),
          start: 0,
          end: 1,
          legend: ["time", "available"],
          data: [[1000, 6_000_000_000]],
        },
        {
          name: "cputemp",
          identifier: "cputemp",
          aggregations: emptyAggregations(),
          start: 0,
          end: 1,
          legend: ["time", "cpu0"],
          data: [[1000, 45]],
        },
      ];
    case "pool.query":
      return [{ name: "tank", status: "ONLINE", healthy: true, free: 500, size: 1000, allocated: 500 }];
    case "pool.dataset.query":
      return [
        {
          id: "tank",
          used: { parsed: 200 },
          available: { parsed: 300 },
        },
      ];
    case "interface.query":
      return [{ id: "eth0", name: "eth0" }];
    case "reporting.netdata_get_data":
      return [
        { name: "interface", identifier: "eth0", legend: ["time", "received", "sent"], data: [[1000, 100, 200]] },
      ];
    default:
      return null;
  }
};

const emptyAggregations = () => ({ min: {}, mean: {}, max: {} });

const reportingResponder = (identifier: string, legend: string[], data: number[][]) => (method: string) => {
  const response = happyResponder(method);
  if (method !== "reporting.get_data" || !Array.isArray(response)) return response;
  return response.map((report) => {
    if ("identifier" in report && report.identifier === identifier) return { ...report, legend, data };
    return report;
  });
};

// `pool.query` reports 500 allocated of a 1000 byte pool, leaving 500 free.
const physicalFallbackFileSystem = [{ deviceName: "tank", available: "500", used: "500", percentage: 50 }];

const ERROR_MESSAGE_LIMIT = 200;

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
    logs.warn.mockClear();
  });

  test("fetches and maps system info over the JSON-RPC API", async () => {
    const integration = createIntegration(credentials);

    const result = await integration.getSystemInfoAsync();

    expect(ws.constructedUrls).toContain("wss://truenas.local/api/current");
    // JSON-RPC does not use the legacy "connect" session handshake.
    expect(ws.sentPayloads.some((payload) => payload.msg === "connect")).toBe(false);

    const datasetPayload = ws.sentPayloads.find((payload) => payload.method === "pool.dataset.query");
    expect(datasetPayload).toMatchObject({
      params: [
        [["id", "in", ["tank"]]],
        {
          extra: {
            properties: ["used", "available"],
          },
        },
      ],
    });

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
      network: { up: 25_000, down: 12_500 },
      // `available` and `used` come from the root dataset, not the physical pool.
      fileSystem: [{ deviceName: "tank", available: "300", used: "200", percentage: 40 }],
      smart: [{ deviceName: "tank", healthy: true, overallStatus: "ONLINE", temperature: null }],
    });
  });

  test("falls back to physical pool space when the root dataset is not returned", async () => {
    ws.setResponder((method) => (method === "pool.dataset.query" ? [] : happyResponder(method)));
    const integration = createIntegration(credentials);

    const result = await integration.getSystemInfoAsync();

    expect(result.fileSystem).toMatchObject(physicalFallbackFileSystem);
    // Dropping the pool would also hide its health status.
    expect(result.smart).toMatchObject([{ deviceName: "tank", healthy: true, overallStatus: "ONLINE" }]);
  });

  test.each([
    {
      version: "TrueNAS-SCALE-24.10.2.2",
      physmem: 168_946_339_840,
      legend: ["time", "free", "used", "cached", "buffers"],
      data: [[1792834434, 54525.64, 65164.29, 41429.86, 0]],
      used: 65164.29 * 1024 * 1024,
    },
    {
      version: "25.10.7",
      physmem: 541_011_288_064,
      legend: ["time", "available"],
      data: [[1792834431, 492_588_100_000]],
      used: 541_011_288_064 - 492_588_100_000,
    },
  ])("normalizes the $version memory reporting format", async ({ version, physmem, legend, data, used }) => {
    ws.setResponder((method) => {
      if (method === "system.info") return { version, physmem, hostname: "nas", model: "Xeon", uptime_seconds: 3600 };
      const response = happyResponder(method);
      if (method === "reporting.get_data" && Array.isArray(response)) {
        return response.map((report) => {
          if ("name" in report && report.name === "memory") return { ...report, legend, data };
          return report;
        });
      }
      return response;
    });

    const result = await createIntegration(credentials).getSystemInfoAsync();

    expect(result.memUsedInBytes).toBe(used);
    expect(result.memAvailableInBytes).toBe(physmem - used);
  });

  test.each([
    {
      legend: ["cached", "used", "time", "buffers", "free"],
      data: [
        [4000, 1, 999, 0, 1000],
        [4000, 6000, 1000, 0, 1000],
      ],
      used: 6000 * 1024 * 1024,
    },
    {
      legend: ["available", "time"],
      data: [
        [1, 999],
        [6_000_000_000, 1000],
      ],
      used: 10_000_000_000,
    },
    { legend: ["time", "available"], data: [[1000, 0]], used: 16_000_000_000 },
    { legend: ["time", "available"], data: [[1000, 17_000_000_000]], used: 0 },
    {
      legend: ["time", "free", "used", "cached", "buffers"],
      data: [[1000, 0, 20_000, 0, 0]],
      used: 16_000_000_000,
    },
  ])("uses the latest named memory columns and bounds usage: $legend $used", async ({ legend, data, used }) => {
    ws.setResponder(reportingResponder("memory", legend, data));

    const result = await createIntegration(credentials).getSystemInfoAsync();

    expect(result.memUsedInBytes).toBe(used);
    expect(result.memAvailableInBytes).toBe(16_000_000_000 - used);
  });

  test.each([
    { legend: ["time", "other"], data: [[1000, 123]] },
    { legend: ["time", "used"], data: [[1000, 123]] },
    { legend: ["time", "available"], data: [] },
    { legend: ["time", "available"], data: [[1000]] },
    { legend: ["time", "available", "available"], data: [[1000, 123, 456]] },
    { legend: ["time", "available"], data: [[1000, Number.NaN]] },
    { legend: ["time", "available"], data: [[1000, -1]] },
    { legend: ["time", "free", "used", "cached", "buffers"], data: [[1000, 0, -1, 0, 0]] },
  ])("reports an integration error instead of inventing memory usage: $legend $data", async ({ legend, data }) => {
    ws.setResponder(reportingResponder("memory", legend, data));

    await expect(createIntegration(credentials).getSystemInfoAsync()).rejects.toThrow(
      "Failed to parse integration data",
    );
  });

  test.each([
    { legend: ["time", "system", "user", "idle", "softirq", "nice", "iowait"], data: [[1000, 4, 8, 87, 0, 0, 1]] },
    { legend: ["cpu1", "cpu", "time", "cpu0"], data: [[100, 12, 1000, 0]] },
  ])(
    "reads CPU utilization without averaging timestamps, idle time or duplicate core totals: $legend",
    async ({ legend, data }) => {
      ws.setResponder(reportingResponder("cpu", legend, data));

      const result = await createIntegration(credentials).getSystemInfoAsync();

      expect(result.cpuUtilization).toBe(12);
    },
  );

  test("excludes the named timestamp from CPU temperatures even when reordered", async () => {
    ws.setResponder(reportingResponder("cputemp", ["cpu0", "time", "cpu1"], [[45, 1000, 46]]));

    const result = await createIntegration(credentials).getSystemInfoAsync();

    expect(result.cpuTemp).toBe(46);
  });

  test("sums the latest named network columns across interfaces in bytes per second", async () => {
    ws.setResponder((method) => {
      if (method === "reporting.netdata_get_data") {
        return [
          {
            name: "interface",
            identifier: "eth0",
            legend: ["sent", "time", "received"],
            data: [
              [1, 999, 2],
              [200, 1000, 100],
            ],
          },
          { name: "interface", identifier: "eth1", legend: ["time", "received", "sent"], data: [[1000, 300, 400]] },
        ];
      }
      return happyResponder(method);
    });

    const result = await createIntegration(credentials).getSystemInfoAsync();

    expect(result.network).toEqual({ up: 75_000, down: 50_000 });
  });

  test("skips a trailing zero-filled reporting row and keeps the latest collected sample", async () => {
    ws.setResponder((method) => {
      if (method === "reporting.get_data") {
        return [
          {
            name: "cpu",
            identifier: "cpu",
            aggregations: emptyAggregations(),
            start: 0,
            end: 3,
            legend: ["time", "cpu"],
            data: [
              [1000, 0],
              [1001, 12],
              [1002, 0],
            ],
          },
          {
            name: "memory",
            identifier: "memory",
            aggregations: emptyAggregations(),
            start: 0,
            end: 3,
            legend: ["time", "available"],
            data: [
              [1000, 1_000_000_000],
              [1001, 6_000_000_000],
              [1002, 0],
            ],
          },
          {
            name: "cputemp",
            identifier: "cputemp",
            aggregations: emptyAggregations(),
            start: 0,
            end: 2,
            legend: ["cpu0", "time"],
            data: [
              [45, 1000],
              [0, 1001],
            ],
          },
        ];
      }
      if (method === "reporting.netdata_get_data") {
        return [
          {
            name: "interface",
            identifier: "eth0",
            legend: ["sent", "time", "received"],
            data: [
              [200, 1000, 100],
              [0, 1001, 0],
            ],
          },
        ];
      }
      return happyResponder(method);
    });

    const result = await createIntegration(credentials).getSystemInfoAsync();

    expect(result.cpuUtilization).toBe(12);
    expect(result.cpuTemp).toBe(45);
    expect(result.memAvailableInBytes).toBe(6_000_000_000);
    expect(result.memUsedInBytes).toBe(10_000_000_000);
    expect(result.network).toEqual({ up: 25_000, down: 12_500 });
  });

  test("uses the last row when every reporting sample is zero", async () => {
    ws.setResponder((method) => {
      if (method === "reporting.get_data") {
        return [
          {
            name: "cpu",
            identifier: "cpu",
            aggregations: emptyAggregations(),
            start: 0,
            end: 2,
            legend: ["time", "cpu"],
            data: [
              [1000, 0],
              [1001, 0],
            ],
          },
          {
            name: "memory",
            identifier: "memory",
            aggregations: emptyAggregations(),
            start: 0,
            end: 2,
            legend: ["time", "available"],
            data: [
              [1000, 0],
              [1001, 0],
            ],
          },
          {
            name: "cputemp",
            identifier: "cputemp",
            aggregations: emptyAggregations(),
            start: 0,
            end: 2,
            legend: ["time", "cpu0"],
            data: [
              [1000, 0],
              [1001, 0],
            ],
          },
        ];
      }
      if (method === "reporting.netdata_get_data") {
        return [
          {
            name: "interface",
            identifier: "eth0",
            legend: ["time", "received", "sent"],
            data: [
              [1000, 0, 0],
              [1001, 0, 0],
            ],
          },
        ];
      }
      return happyResponder(method);
    });

    const result = await createIntegration(credentials).getSystemInfoAsync();

    expect(result.cpuUtilization).toBe(0);
    expect(result.cpuTemp).toBe(0);
    expect(result.memAvailableInBytes).toBe(0);
    expect(result.memUsedInBytes).toBe(16_000_000_000);
    expect(result.network).toEqual({ up: 0, down: 0 });
  });

  test("uses the latest row when zeros persist after a collected sample", async () => {
    ws.setResponder((method) => {
      if (method === "reporting.get_data") {
        return [
          {
            name: "cpu",
            identifier: "cpu",
            aggregations: emptyAggregations(),
            start: 0,
            end: 7,
            legend: ["time", "cpu"],
            data: [
              [1000, 12],
              [1001, 0],
              [1002, 0],
              [1003, 0],
              [1004, 0],
              [1005, 0],
              [1006, 0],
            ],
          },
          {
            name: "memory",
            identifier: "memory",
            aggregations: emptyAggregations(),
            start: 0,
            end: 7,
            legend: ["time", "available"],
            data: [
              [1000, 6_000_000_000],
              [1001, 0],
              [1002, 0],
              [1003, 0],
              [1004, 0],
              [1005, 0],
              [1006, 0],
            ],
          },
          {
            name: "cputemp",
            identifier: "cputemp",
            aggregations: emptyAggregations(),
            start: 0,
            end: 7,
            legend: ["time", "cpu0"],
            data: [
              [1000, 45],
              [1001, 0],
              [1002, 0],
              [1003, 0],
              [1004, 0],
              [1005, 0],
              [1006, 0],
            ],
          },
        ];
      }
      if (method === "reporting.netdata_get_data") {
        return [
          {
            name: "interface",
            identifier: "eth0",
            legend: ["sent", "time", "received"],
            data: [
              [200, 1000, 100],
              [0, 1001, 0],
              [0, 1002, 0],
              [0, 1003, 0],
              [0, 1004, 0],
              [0, 1005, 0],
              [0, 1006, 0],
            ],
          },
        ];
      }
      return happyResponder(method);
    });

    const result = await createIntegration(credentials).getSystemInfoAsync();

    expect(result.cpuUtilization).toBe(0);
    expect(result.cpuTemp).toBe(0);
    expect(result.memAvailableInBytes).toBe(0);
    expect(result.memUsedInBytes).toBe(16_000_000_000);
    expect(result.network).toEqual({ up: 0, down: 0 });
  });

  test("still rejects reporting data that contains no rows", async () => {
    ws.setResponder(reportingResponder("cpu", ["time", "cpu"], []));

    await expect(createIntegration(credentials).getSystemInfoAsync()).rejects.toThrow(
      "Failed to parse integration data",
    );
  });

  test("falls back to physical pool space when the root dataset reports no usable values", async () => {
    ws.setResponder((method) =>
      method === "pool.dataset.query"
        ? [{ id: "tank", used: { parsed: null }, available: null }]
        : happyResponder(method),
    );
    const integration = createIntegration(credentials);

    const result = await integration.getSystemInfoAsync();

    expect(result.fileSystem).toMatchObject(physicalFallbackFileSystem);
  });

  test("falls back to physical pool space when the root dataset omits the requested properties", async () => {
    // Datasets that cannot report space, e.g. while locked, come back without `used` and `available`.
    ws.setResponder((method) =>
      method === "pool.dataset.query" ? [{ id: "tank", locked: true }] : happyResponder(method),
    );
    const integration = createIntegration(credentials);

    const result = await integration.getSystemInfoAsync();

    expect(result.fileSystem).toMatchObject(physicalFallbackFileSystem);
  });

  test("falls back to physical pool space when the dataset response fails schema validation", async () => {
    ws.setResponder((method) =>
      method === "pool.dataset.query" ? { unexpected: "not an array" } : happyResponder(method),
    );
    const integration = createIntegration(credentials);

    const result = await integration.getSystemInfoAsync();

    expect(result.fileSystem).toMatchObject(physicalFallbackFileSystem);
    // A malformed payload must not take the rest of the system info down with it.
    expect(result).toMatchObject({ cpuTemp: 45, memAvailableInBytes: 6_000_000_000, uptime: 3600 });
  });

  test("falls back to physical pool space when the dataset query is rejected", async () => {
    ws.setResponder((method) =>
      method === "pool.dataset.query"
        ? new Error("[EINVAL] filters: Value error, Invalid operation: in")
        : happyResponder(method),
    );
    const integration = createIntegration(credentials);

    const result = await integration.getSystemInfoAsync();

    expect(result.fileSystem).toMatchObject(physicalFallbackFileSystem);
    // A rejected dataset query must not take the rest of the system info down with it.
    expect(result).toMatchObject({ cpuTemp: 45, memAvailableInBytes: 6_000_000_000, uptime: 3600 });
  });

  test("logs the truncated rejection reason rather than the generic wrapper message", async () => {
    // TrueNAS answers a rejected method with its Python traceback, which runs to several kilobytes.
    ws.setResponder((method) =>
      method === "pool.dataset.query"
        ? new Error(`[EINVAL] query-filters ${"x".repeat(5000)}`)
        : happyResponder(method),
    );
    const integration = createIntegration(credentials);

    await integration.getSystemInfoAsync();

    const logged = logs.warn.mock.calls.find(([message]) => String(message).includes("Could not retrieve"));
    const reason = String((logged?.[1] as { error?: string } | undefined)?.error);
    // The decorator would otherwise surface only "An unknown error occured while executing Integration method".
    expect(reason).toContain("[EINVAL] query-filters");
    expect(reason).toHaveLength(ERROR_MESSAGE_LIMIT + 1); // truncated, plus the ellipsis
  });

  test("keeps reporting a pool that is unhealthy but has no usable dataset space", async () => {
    ws.setResponder((method) => {
      if (method === "pool.query")
        return [
          { name: "tank", status: "ONLINE", healthy: true, free: 500, size: 1000, allocated: 500 },
          { name: "backup", status: "DEGRADED", healthy: false, free: 10, size: 100, allocated: 90 },
        ];
      if (method === "pool.dataset.query") return [{ id: "tank", used: { parsed: 200 }, available: { parsed: 300 } }];
      return happyResponder(method);
    });
    const integration = createIntegration(credentials);

    const result = await integration.getSystemInfoAsync();

    expect(result.smart).toMatchObject([
      { deviceName: "tank", healthy: true, overallStatus: "ONLINE" },
      { deviceName: "backup", healthy: false, overallStatus: "DEGRADED" },
    ]);
    expect(result.fileSystem).toMatchObject([
      { deviceName: "tank", available: "300", used: "200", percentage: 40 },
      { deviceName: "backup", available: "10", used: "90", percentage: 90 },
    ]);
  });

  test("reports zero usage for an empty root dataset", async () => {
    ws.setResponder((method) =>
      method === "pool.dataset.query"
        ? [{ id: "tank", used: { parsed: 0 }, available: { parsed: 0 } }]
        : happyResponder(method),
    );
    const integration = createIntegration(credentials);

    const result = await integration.getSystemInfoAsync();

    expect(result.fileSystem[0]?.percentage).toBe(0);
  });

  test("starts independent system requests together while preserving the network interface dependency", async () => {
    const gates = new Map<string, ReturnType<typeof Promise.withResolvers<unknown>>>();
    ws.setResponder((method) => {
      if (method.startsWith("auth.")) return true;
      const gate = Promise.withResolvers<unknown>();
      gates.set(method, gate);
      return gate.promise;
    });
    const integration = createIntegration(credentials);

    const resultPromise = integration.getSystemInfoAsync();

    await vi.waitFor(() => {
      expect([...gates.keys()]).toEqual(["system.info", "reporting.get_data", "pool.query", "interface.query"]);
    });
    expect(gates.has("reporting.netdata_get_data")).toBe(false);
    expect(gates.has("pool.dataset.query")).toBe(false);

    gates.get("interface.query")?.resolve(happyResponder("interface.query"));
    await vi.waitFor(() => expect(gates.has("reporting.netdata_get_data")).toBe(true));

    gates.get("pool.query")?.resolve(happyResponder("pool.query"));
    await vi.waitFor(() => expect(gates.has("pool.dataset.query")).toBe(true));

    for (const [method, gate] of gates) gate.resolve(happyResponder(method));

    await expect(resultPromise).resolves.toMatchObject({
      version: "TrueNAS-SCALE-24.10",
      network: { up: 25_000, down: 12_500 },
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
