// @vitest-environment node

import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../../base/types";
import type { IntegrationTestingInput } from "../../../base/integration";
import { NzbGetIntegration } from "../nzbget-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const secrets: IntegrationSecret[] = [
  { kind: "username", value: "test-user" },
  { kind: "password", value: "test-password" },
];

const createIntegration = () =>
  new NzbGetIntegration({
    id: "test-nzbget",
    name: "Test NZBGet",
    url: "https://nzbget.example.com",
    externalUrl: null,
    decryptedSecrets: secrets,
  });

describe("NzbGetIntegration.getClientJobsAndStatusAsync", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("starts queue, history, and status requests together", async () => {
    const releaseRequests = Promise.withResolvers<void>();
    const startedMethods: string[] = [];
    const results = {
      listgroups: [],
      history: [],
      status: { DownloadPaused: false, DownloadRate: 0 },
    } as const;

    mockFetch.mockImplementation(async (_url, init) => {
      const method = (JSON.parse(String(init?.body)) as { method: keyof typeof results }).method;
      startedMethods.push(method);
      await releaseRequests.promise;
      return new Response(JSON.stringify({ result: results[method] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const resultPromise = createIntegration().getClientJobsAndStatusAsync({ limit: 10 });

    try {
      await vi.waitFor(() => {
        expect(startedMethods).toEqual(expect.arrayContaining(["listgroups", "history", "status"]));
        expect(startedMethods).toHaveLength(3);
      });
    } finally {
      releaseRequests.resolve();
    }

    await expect(resultPromise).resolves.toStrictEqual({
      status: { paused: false, rates: { down: 0 }, types: ["usenet"] },
      items: [],
    });
  });

  test("authenticates every RPC through headers with a credential-free Address", async () => {
    const results = { listgroups: [], history: [], status: { DownloadPaused: false, DownloadRate: 0 } };
    mockFetch.mockImplementation(async (_url, init) => {
      const { method } = JSON.parse(String(init?.body)) as { method: keyof typeof results };
      return Response.json({ result: results[method] });
    });
    await createIntegration().getClientJobsAndStatusAsync({ limit: 10 });
    for (const [url, init] of mockFetch.mock.calls) {
      expect(url.toString()).toBe("https://nzbget.example.com/jsonrpc");
      expect(new Headers(init?.headers as HeadersInit).get("Authorization")).toBe(
        `Basic ${Buffer.from("test-user:test-password").toString("base64")}`,
      );
    }
  });

  test("uses the same header transport for connection testing", async () => {
    const fetchAsync = vi.fn().mockResolvedValue(Response.json({ result: "26.3" }));
    const integration = createIntegration();
    const input = { fetchAsync } as unknown as IntegrationTestingInput;
    const testing = integration as unknown as {
      testingAsync: (input: IntegrationTestingInput) => Promise<{ success: boolean }>;
    };
    await expect(testing.testingAsync(input)).resolves.toEqual({ success: true });
    const [url, init] = fetchAsync.mock.calls[0] as [URL, { headers: Record<string, string> }];
    expect(url.toString()).toBe("https://nzbget.example.com/jsonrpc");
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("test-user:test-password").toString("base64")}`);
  });
});
