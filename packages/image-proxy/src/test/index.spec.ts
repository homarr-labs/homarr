// @vitest-environment node
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { beforeEach, describe, expect, test, vi } from "vitest";

process.env.SECRET_ENCRYPTION_KEY ??= "0".repeat(64);

const mocks = vi.hoisted(() => ({ store: new Map<string, { value: unknown; expiresAt: number | null }>() }));

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("@homarr/core/infrastructure/http/request", () => ({
  createCertificateAgentAsync: vi.fn(() => Promise.resolve({ destroy: () => Promise.resolve() })),
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}));
vi.mock("@homarr/redis", () => ({
  createGetSetChannel: (name: string) => ({
    getAsync: async () => {
      const stored = mocks.store.get(name);
      if (!stored) return null;
      if (stored.expiresAt !== null && Date.now() >= stored.expiresAt) {
        mocks.store.delete(name);
        return null;
      }
      return stored.value;
    },
    setAsync: async (value: unknown, options?: { ttlSeconds?: number }) => {
      mocks.store.set(name, { value, expiresAt: options?.ttlSeconds ? Date.now() + options.ttlSeconds * 1_000 : null });
    },
  }),
}));

const { createCertificateAgentAsync, fetchWithTrustedCertificatesAsync } =
  await import("@homarr/core/infrastructure/http/request");
const { ImageProxy } = await import("../index");

const mockedLookup = vi.mocked(lookup as unknown as (hostname: string) => Promise<LookupAddress[]>);
const mockedFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const mockedCreateAgent = vi.mocked(createCertificateAgentAsync);

const encoder = new TextEncoder();

const createResponse = (status: number, options: { location?: string; contentType?: string; body?: string } = {}) => {
  const bytes = options.body !== undefined ? encoder.encode(options.body) : undefined;
  let delivered = false;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => {
        const key = name.toLowerCase();
        if (key === "location") return options.location ?? null;
        if (key === "content-type") return options.contentType ?? null;
        return null;
      },
    },
    body: {
      cancel: () => Promise.resolve(),
      getReader: () => ({
        read: () => {
          if (!bytes || delivered) return Promise.resolve({ done: true });
          delivered = true;
          return Promise.resolve({ done: false, value: bytes });
        },
        cancel: () => Promise.resolve(),
      }),
    },
  };
};

const mockDns = (addressesByHostname: Record<string, string[]>) => {
  mockedLookup.mockImplementation((hostname) => {
    const addresses = addressesByHostname[hostname];
    if (addresses === undefined) return Promise.reject(new Error(`getaddrinfo ENOTFOUND ${hostname}`));
    return Promise.resolve(addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })));
  });
};

const mockResponses = (responsesByUrl: Record<string, ReturnType<typeof createResponse>>) => {
  mockedFetch.mockImplementation((input) => {
    const url = input instanceof URL ? input.href : String(input);
    const response = responsesByUrl[url];
    return response === undefined
      ? Promise.reject(new Error(`Unexpected request to ${url}`))
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Promise.resolve(response as any);
  });
};

describe("ImageProxy.forwardImageAsync", () => {
  beforeEach(() => {
    mocks.store.clear();
    mockedLookup.mockReset();
    mockedFetch.mockReset();
    mockedCreateAgent.mockClear();
  });

  test("forwards an image from an allowed address", async () => {
    const imageProxy = new ImageProxy();
    mockResponses({ "http://192.168.1.10/icon.png": createResponse(200, { contentType: "image/png", body: "img" }) });
    const proxyUrl = await imageProxy.createImageAsync("http://192.168.1.10/icon.png");
    const id = proxyUrl.split("/").pop() as string;

    const result = await imageProxy.forwardImageAsync(id);

    expect(result).toMatchObject({ contentType: "image/png" });
    expect("image" in result && new TextDecoder().decode(result.image)).toBe("img");
  });

  test("refuses to forward an image whose registered url resolves to a blocked address", async () => {
    const imageProxy = new ImageProxy();
    mockDns({ "metadata.internal": ["169.254.169.254"] });
    const proxyUrl = await imageProxy.createImageAsync("http://metadata.internal/latest/meta-data/");
    const id = proxyUrl.split("/").pop() as string;

    const result = await imageProxy.forwardImageAsync(id);

    expect(result).toEqual({ error: "fetch-error" });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test("refuses to forward when a redirect points at a blocked address", async () => {
    const imageProxy = new ImageProxy();
    mockResponses({
      "http://192.168.1.10/icon.png": createResponse(302, { location: "http://169.254.169.254/latest/meta-data/" }),
    });
    const proxyUrl = await imageProxy.createImageAsync("http://192.168.1.10/icon.png");
    const id = proxyUrl.split("/").pop() as string;

    const result = await imageProxy.forwardImageAsync(id);

    expect(result).toEqual({ error: "fetch-error" });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  test("still allows a private network address, for self hosted integrations", async () => {
    const imageProxy = new ImageProxy();
    mockResponses({
      "http://192.168.1.50:32400/photo": createResponse(200, { contentType: "image/jpeg", body: "poster" }),
    });
    const proxyUrl = await imageProxy.createImageAsync("http://192.168.1.50:32400/photo", {
      "X-Plex-Token": "secret",
    });
    const id = proxyUrl.split("/").pop() as string;

    const result = await imageProxy.forwardImageAsync(id);

    expect(result).toMatchObject({ contentType: "image/jpeg" });
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ headers: { "X-Plex-Token": "secret" } }),
    );
  });

  test("reports not-found for an unregistered id", async () => {
    const imageProxy = new ImageProxy();

    await expect(imageProxy.forwardImageAsync("unknown-id")).resolves.toEqual({ error: "not-found" });
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
