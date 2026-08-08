// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  type StoredValue = {
    expiresAt: number | null;
    value: unknown;
  };

  const values = new Map<string, StoredValue>();
  const locks = new Set<string>();
  const listReleases = vi.fn();
  const redisOperation = vi.fn();

  return {
    env: { NO_EXTERNAL_CONNECTION: false },
    listReleases,
    redisOperation,
    values,
    locks,
    removeFreshResult() {
      for (const key of values.keys()) {
        if (key.startsWith("update-checker:fresh:")) values.delete(key);
      }
    },
  };
});

vi.mock("@homarr/common/env", () => ({ env: mocks.env }));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

vi.mock("@homarr/redis", () => ({
  createGetSetChannel: (name: string) => ({
    getAsync: async () => {
      mocks.redisOperation();
      const stored = mocks.values.get(name);
      if (!stored) return null;
      if (stored.expiresAt !== null && Date.now() >= stored.expiresAt) {
        mocks.values.delete(name);
        return null;
      }
      return stored.value;
    },
    setAsync: async (value: unknown, options?: { ttlSeconds?: number }) => {
      mocks.redisOperation();
      mocks.values.set(name, {
        value,
        expiresAt: options?.ttlSeconds ? Date.now() + options.ttlSeconds * 1_000 : null,
      });
    },
    removeAsync: async () => {
      mocks.redisOperation();
      mocks.values.delete(name);
    },
  }),
  createLockChannel: (name: string) => ({
    acquireAsync: async () => {
      mocks.redisOperation();
      if (mocks.locks.has(name)) return null;
      mocks.locks.add(name);
      return "test-lock-token";
    },
    releaseAsync: async () => {
      mocks.redisOperation();
      mocks.locks.delete(name);
    },
  }),
}));

vi.mock("octokit", () => ({
  Octokit: class {
    rest = {
      repos: {
        listReleases: mocks.listReleases,
      },
    };
  },
}));

const successfulResponse = {
  data: [
    {
      body_html: undefined,
      html_url: "https://github.com/homarr-labs/homarr/releases/tag/v99.0.0",
      name: "v99.0.0",
      prerelease: false,
      tag_name: "v99.0.0",
    },
  ],
  headers: {},
  status: 200,
  url: "",
};

const loadHandlerAsync = async () => {
  const { updateCheckerRequestHandler } = await import("../update-checker");
  return updateCheckerRequestHandler.handler({});
};

describe("persisted update checker cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mocks.env.NO_EXTERNAL_CONNECTION = false;
    mocks.listReleases.mockReset();
    mocks.redisOperation.mockReset();
    mocks.values.clear();
    mocks.locks.clear();
  });

  test("checks GitHub once for repeated page loads inside 24 hours", async () => {
    mocks.listReleases.mockResolvedValue(successfulResponse);
    const handler = await loadHandlerAsync();

    const first = await handler.getDataAsync();
    const second = await handler.getDataAsync();

    expect(first.data).toEqual(second.data);
    expect(mocks.listReleases).toHaveBeenCalledTimes(1);
  });

  test("deduplicates concurrent checks", async () => {
    mocks.listReleases.mockImplementation(async () => {
      await Promise.resolve();
      return successfulResponse;
    });
    const handler = await loadHandlerAsync();

    const results = await Promise.all(Array.from({ length: 10 }, async () => await handler.getDataAsync()));

    expect(results.every(({ data }) => data.availableUpdates.length === 1)).toBe(true);
    expect(mocks.listReleases).toHaveBeenCalledTimes(1);
  });

  test("deduplicates concurrent checks across simulated processes", async () => {
    let completeGitHubRequest: (() => void) | undefined;
    mocks.listReleases.mockImplementation(
      async () =>
        await new Promise<typeof successfulResponse>((resolve) => {
          completeGitHubRequest = () => resolve(successfulResponse);
        }),
    );
    const firstHandler = await loadHandlerAsync();
    vi.resetModules();
    const secondHandler = await loadHandlerAsync();

    const firstRequest = firstHandler.getDataAsync();
    await vi.waitFor(() => expect(mocks.listReleases).toHaveBeenCalledOnce());
    const secondRequest = secondHandler.getDataAsync();
    completeGitHubRequest?.();

    const results = await Promise.all([firstRequest, secondRequest]);

    expect(results[0].data).toEqual(results[1].data);
    expect(mocks.listReleases).toHaveBeenCalledTimes(1);
  });

  test("refreshes at the 24-hour boundary, not before it", async () => {
    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    mocks.listReleases.mockResolvedValue(successfulResponse);
    const handler = await loadHandlerAsync();
    await handler.getDataAsync();

    now += 24 * 60 * 60 * 1_000 - 1;
    await handler.getDataAsync();
    expect(mocks.listReleases).toHaveBeenCalledTimes(1);

    now += 1;
    await handler.getDataAsync();
    expect(mocks.listReleases).toHaveBeenCalledTimes(2);
  });

  test("reuses the Redis result after a simulated process restart", async () => {
    mocks.listReleases.mockResolvedValue(successfulResponse);
    const firstHandler = await loadHandlerAsync();
    await firstHandler.getDataAsync();

    vi.resetModules();
    const restartedHandler = await loadHandlerAsync();
    await restartedHandler.getDataAsync();

    expect(mocks.listReleases).toHaveBeenCalledTimes(1);
  });

  test("ignores update results created for an older application version", async () => {
    mocks.values.set("update-checker:fresh:v1", {
      value: { availableUpdates: [], attemptedAt: 1, checkedAt: 1 },
      expiresAt: null,
    });
    mocks.listReleases.mockResolvedValue(successfulResponse);

    const handler = await loadHandlerAsync();
    const result = await handler.getDataAsync();

    expect(result.data.availableUpdates).toHaveLength(1);
    expect(mocks.listReleases).toHaveBeenCalledOnce();
  });

  test("serves stale data and retries only after 24 hours following a provider failure", async () => {
    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    mocks.listReleases.mockResolvedValueOnce(successfulResponse).mockRejectedValue(new Error("GitHub unavailable"));
    const handler = await loadHandlerAsync();
    const fresh = await handler.getDataAsync();
    mocks.removeFreshResult();

    const stale = await handler.getDataAsync();
    now += 24 * 60 * 60 * 1_000 - 1;
    const repeated = await handler.getDataAsync();

    expect(stale.data).toEqual(fresh.data);
    expect(repeated.data).toEqual(fresh.data);
    expect(mocks.listReleases).toHaveBeenCalledTimes(2);

    now += 1;
    const retried = await handler.getDataAsync();

    expect(retried.data).toEqual(fresh.data);
    expect(mocks.listReleases).toHaveBeenCalledTimes(3);
  });

  test("does not contact GitHub when external connections are disabled", async () => {
    mocks.env.NO_EXTERNAL_CONNECTION = true;
    const handler = await loadHandlerAsync();

    await expect(handler.getDataAsync()).resolves.toMatchObject({ data: { availableUpdates: [] } });
    expect(mocks.listReleases).not.toHaveBeenCalled();
    expect(mocks.redisOperation).not.toHaveBeenCalled();
  });
});
