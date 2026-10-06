// @vitest-environment node

import { Response } from "undici";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../../base/types";
import { SabnzbdIntegration } from "../sabnzbd-integration";
import type { SabnzbdHistorySlot } from "../sabnzbd-schema";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const secrets: IntegrationSecret[] = [{ kind: "apiKey", value: "test-api-key" }];
const NOW = Date.UTC(2026, 9, 4);
const createHistorySlot = (id: string, daysAgo: number): SabnzbdHistorySlot => ({
  category: "test",
  download_time: 60,
  status: "Completed",
  completed: Math.floor(NOW / 1000) - daysAgo * 24 * 60 * 60,
  nzo_id: id,
  postproc_time: 30,
  name: id,
  bytes: 1000,
});

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

  afterEach(() => {
    vi.useRealTimers();
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

  test.each([undefined, false])(
    "keeps normal history when archive is disabled (%s)",
    async (includeArchivedHistory) => {
      mockFetch.mockImplementation(async (url) => {
        const params = new URL(String(url)).searchParams;
        expect(params.has("archive")).toBe(false);
        const result =
          params.get("mode") === "queue"
            ? { queue: { paused: false, kbpersec: "0", slots: [] } }
            : { history: { slots: [createHistorySlot("old-normal", 30)] } };
        return new Response(JSON.stringify(result));
      });

      const result = await createIntegration().getClientJobsAndStatusAsync({
        limit: 10,
        includeArchivedHistory,
        historyWindowDays: 1,
      });

      expect(result.items.map((item) => item.id)).toEqual(["old-normal"]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    },
  );

  test("merges archived history without displacing active jobs and applies the row limit", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    mockFetch.mockImplementation(async (url) => {
      const params = new URL(String(url)).searchParams;
      let result;
      if (params.get("mode") === "queue") {
        result = {
          queue: {
            paused: false,
            kbpersec: "1",
            slots: [
              {
                status: "Downloading",
                index: 0,
                mb: "1",
                filename: "queue",
                cat: "test",
                timeleft: "0:00:10",
                percentage: "50",
                nzo_id: "queue",
              },
            ],
          },
        };
      } else if (params.get("archive") === "1") {
        expect(params.get("start")).toBe("0");
        expect(params.get("limit")).toBe("100");
        result = { history: { slots: [createHistorySlot("archived", 3), createHistorySlot("duplicate", 2)] } };
      } else {
        result = {
          history: {
            slots: [
              { ...createHistorySlot("processing", 0), status: "Extracting", completed: 0 },
              createHistorySlot("normal", 1),
              createHistorySlot("duplicate", 2),
              createHistorySlot("expired", 8),
            ],
          },
        };
      }
      return new Response(JSON.stringify(result));
    });

    const integration = createIntegration();
    const input = { limit: 10, includeArchivedHistory: true, historyWindowDays: 7 };
    const result = await integration.getClientJobsAndStatusAsync(input);
    expect(result.items.map((item) => item.id)).toEqual(["queue", "processing", "normal", "duplicate", "archived"]);
    expect(result.status.rates.down).toBe(1024);

    const limited = await integration.getClientJobsAndStatusAsync({ ...input, limit: 3 });
    expect(limited.items.map((item) => item.id)).toEqual(["queue", "processing", "normal"]);
  });

  test("rejects malformed archive timestamps through the existing history schema", async () => {
    mockFetch.mockImplementation(async (url) => {
      const params = new URL(String(url)).searchParams;
      const result =
        params.get("mode") === "queue"
          ? { queue: { paused: false, kbpersec: "0", slots: [] } }
          : {
              history: {
                slots: params.has("archive") ? [{ ...createHistorySlot("invalid", 0), completed: "bad" }] : [],
              },
            };
      return new Response(JSON.stringify(result));
    });

    await expect(
      createIntegration().getClientJobsAndStatusAsync({ limit: 10, includeArchivedHistory: true }),
    ).rejects.toThrow();
  });
});
