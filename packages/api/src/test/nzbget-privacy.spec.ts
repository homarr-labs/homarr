import type { MockAgent } from "undici";
import { MockAgent as UndiciMockAgent } from "undici";
import { transports } from "winston";
import { parse } from "superjson";
import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";

import { createIntegrationAsync } from "@homarr/integrations/factory";
import type * as HttpInfrastructure from "@homarr/core/infrastructure/http";
import { loggerMessageSchema } from "@homarr/core/infrastructure/logs/constants";

import { settleIntegrationQueries, toPublicIntegrationError } from "../settle-integrations";

const fixture = vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.LOG_LEVEL = "debug";
  // Exercise the public logger's production Redis wiring with an in-memory client.
  vi.stubEnv("CI", "");
  vi.stubEnv("DISABLE_REDIS_LOGS", "");
  const history: string[] = [];
  const live: string[] = [];
  const pipeline = { lpush: vi.fn(), ltrim: vi.fn(), publish: vi.fn(), exec: vi.fn().mockResolvedValue([]) };
  pipeline.lpush.mockImplementation((_key: string, value: string) => {
    history.push(value);
    return pipeline;
  });
  pipeline.ltrim.mockImplementation(() => pipeline);
  pipeline.publish.mockImplementation((_key: string, value: string) => {
    live.push(value);
    return pipeline;
  });
  return {
    agent: null as MockAgent | null,
    console: [] as string[],
    history,
    live,
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
  fixture.history.length = 0;
  fixture.live.length = 0;
  fixture.agent = new UndiciMockAgent();
  fixture.agent.disableNetConnect();
  vi.spyOn(transports.Console.prototype, "log").mockImplementation((info, callback) => {
    const entry = info as Record<symbol, unknown>;
    const message = entry[Symbol.for("message")];
    if (typeof message !== "string") {
      throw new Error("Expected a formatted Console message");
    }
    fixture.console.push(message);
    (callback as () => void)();
  });
});

afterEach(async () => {
  await fixture.agent?.close();
  vi.restoreAllMocks();
});

afterAll(() => {
  vi.unstubAllEnvs();
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
      expect(fixture.history.some((line) => line.includes("Integration query failed"))).toBe(true);
      expect(fixture.live.some((line) => line.includes("Integration query failed"))).toBe(true);
    });
    const decoded = [fixture.history, fixture.live].map((messages) =>
      messages.map((value) => loggerMessageSchema.parse(parse(value))),
    );
    const consoleFailure = fixture.console.find((line) => line.includes("Integration query failed"));
    for (const messages of decoded) {
      expect(messages.some((message) => message.message === consoleFailure)).toBe(true);
    }
    const destinations = [
      JSON.stringify(failure),
      JSON.stringify((failure as Error).cause),
      ...fixture.console,
      ...fixture.history,
      ...fixture.live,
      ...decoded.flatMap((messages) => messages.map((message) => message.message)),
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
