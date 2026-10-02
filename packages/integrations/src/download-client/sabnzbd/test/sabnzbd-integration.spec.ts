// @vitest-environment node

import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../../base/types";
import { SabnzbdIntegration } from "../sabnzbd-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const secrets: IntegrationSecret[] = [{ kind: "apiKey", value: "test-api-key" }];

const createIntegration = () =>
  new SabnzbdIntegration({
    id: "test-sabnzbd",
    name: "Test SABnzbd",
    url: "https://sabnzbd.example.com",
    externalUrl: null,
    decryptedSecrets: secrets,
  });

describe("SabnzbdIntegration.getClientJobsAndStatusAsync", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("starts queue and history requests together", async () => {
    const releaseRequests = Promise.withResolvers<void>();
    const startedModes: string[] = [];
    const results = {
      queue: { queue: { paused: false, kbpersec: "0", slots: [] } },
      history: { history: { slots: [] } },
    } as const;

    mockFetch.mockImplementation(async (url) => {
      const mode = new URL(String(url)).searchParams.get("mode") as keyof typeof results;
      startedModes.push(mode);
      await releaseRequests.promise;
      return new Response(JSON.stringify(results[mode]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const resultPromise = createIntegration().getClientJobsAndStatusAsync({ limit: 10 });

    try {
      await vi.waitFor(() => {
        expect(startedModes).toEqual(expect.arrayContaining(["queue", "history"]));
        expect(startedModes).toHaveLength(2);
      });
    } finally {
      releaseRequests.resolve();
    }

    await expect(resultPromise).resolves.toStrictEqual({
      status: { paused: false, rates: { down: 0 }, types: ["usenet"] },
      items: [],
    });
  });
});
