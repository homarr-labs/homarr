import type { MockAgent } from "undici";
import { MockAgent as UndiciMockAgent } from "undici";
import { transports } from "winston";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createIntegrationAsync } from "@homarr/integrations/factory";
import type * as HttpInfrastructure from "@homarr/core/infrastructure/http";

import { RedisTransport } from "../../../core/src/infrastructure/logs/transports/redis-transport";
import { settleIntegrationQueries, toPublicIntegrationError } from "../settle-integrations";

const fixture = vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.LOG_LEVEL = "debug";
  const serialized: string[] = [];
  const pipeline = { lpush: vi.fn(), ltrim: vi.fn(), publish: vi.fn(), exec: vi.fn().mockResolvedValue([]) };
  pipeline.lpush.mockImplementation((_key: string, value: string) => {
    serialized.push(value);
    return pipeline;
  });
  pipeline.ltrim.mockImplementation(() => pipeline);
  pipeline.publish.mockImplementation((_key: string, value: string) => {
    serialized.push(value);
    return pipeline;
  });
  return {
    agent: null as MockAgent | null,
    console: [] as string[],
    serialized,
    redis: { options: {}, on: vi.fn(), multi: vi.fn(() => pipeline) },
  };
});

vi.mock("@homarr/core/infrastructure/redis", () => ({ createRedisClient: () => fixture.redis }));
vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getAllTrustedCertificatesAsync: async () => [],
  getTrustedCertificateHostnamesAsync: async () => [],
}));
vi.mock("@homarr/core/infrastructure/http", async (importActual) => {
  const actual = await importActual<typeof HttpInfrastructure>();
  return {
    ...actual,
    fetchWithTrustedCertificatesAsync: (
      url: Parameters<typeof actual.fetchWithTrustedCertificatesAsync>[0],
      init: Parameters<typeof actual.fetchWithTrustedCertificatesAsync>[1],
    ) => actual.fetchWithTrustedCertificatesAsync(url, { ...init, dispatcher: fixture.agent ?? undefined }),
  };
});

const input = {
  id: "owned-nzbget",
  kind: "nzbGet" as const,
  name: "Owned NZBGet",
  url: "https://nzbget.example.com",
  externalUrl: null,
  decryptedSecrets: [
    { kind: "username" as const, value: "fixture-private-user" },
    { kind: "password" as const, value: "fixture-private-password/:?" },
  ],
};

beforeEach(() => {
  fixture.console.length = 0;
  fixture.serialized.length = 0;
  fixture.agent = new UndiciMockAgent();
  fixture.agent.disableNetConnect();
  const redisTransport = new RedisTransport({ level: "debug" });
  vi.spyOn(transports.Console.prototype, "log").mockImplementation((info, callback) => {
    const entry = info as Parameters<RedisTransport["log"]>[0];
    fixture.console.push(Reflect.get(entry, Symbol.for("message")) as string);
    redisTransport.log(entry, callback as () => void);
  });
});

afterEach(async () => {
  await fixture.agent?.close();
  vi.restoreAllMocks();
});

test.each([401, 403, 500])(
  "keeps rejected RPC credentials out of original errors, Console and Redis history/live messages (HTTP %i)",
  async (status) => {
    fixture.agent?.get(input.url).intercept({ path: /.*/, method: "POST" }).reply(status, "").persist();
    const client = await createIntegrationAsync(input);
    let failure: unknown;
    const results = await settleIntegrationQueries(
      [input],
      async () => {
        return await client.getClientJobsAndStatusAsync({ limit: 10 });
      },
      {
        fallback: (_integration, error) => {
          failure = error;
          return toPublicIntegrationError(error);
        },
      },
    );
    expect(results).toEqual(["INTEGRATION_REQUEST_FAILED"]);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).cause).toMatchObject({ statusCode: status, url: "https://nzbget.example.com/jsonrpc" });
    await vi.waitFor(() => {
      expect(fixture.console.some((line) => line.includes("Integration query failed"))).toBe(true);
      expect(fixture.serialized.some((line) => line.includes("Integration query failed"))).toBe(true);
    });
    const destinations = [
      JSON.stringify(failure),
      JSON.stringify((failure as Error).cause),
      ...fixture.console,
      ...fixture.serialized,
    ];
    for (const destination of destinations) {
      for (const credential of input.decryptedSecrets) {
        expect(destination).not.toContain(credential.value);
        expect(destination).not.toContain(encodeURIComponent(credential.value));
      }
      expect(destination).not.toContain(
        Buffer.from("fixture-private-user:fixture-private-password/:?").toString("base64"),
      );
      expect(destination).not.toContain("Authorization");
    }
  },
);
