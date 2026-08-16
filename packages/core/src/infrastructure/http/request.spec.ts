import { describe, expect, it, vi, beforeEach } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("undici", async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return { ...actual, fetch: fetchMock };
});

import { Headers } from "undici";
import { fetchWithTrustedCertificatesAsync, getDefaultUserAgent } from "./request";

const dummyDispatcher = {} as never;

const lastFetchHeaders = (): Headers => {
  const [, init] = fetchMock.mock.calls.at(-1) ?? [];
  return init?.headers as unknown as Headers;
};

describe("fetchWithTrustedCertificatesAsync default User-Agent", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  const defaultUserAgent = getDefaultUserAgent();

  it("sets the default User-Agent when no header is provided", async () => {
    await fetchWithTrustedCertificatesAsync("https://example.com", { dispatcher: dummyDispatcher });
    expect(lastFetchHeaders().get("User-Agent")).toBe(defaultUserAgent);
  });

  it("keeps caller-provided record headers", async () => {
    await fetchWithTrustedCertificatesAsync("https://example.com", {
      dispatcher: dummyDispatcher,
      headers: { Authorization: "token" },
    });
    const headers = lastFetchHeaders();
    expect(headers.get("authorization")).toBe("token");
    expect(headers.get("User-Agent")).toBe(defaultUserAgent);
  });

  it("normalizes a Headers instance without losing entries", async () => {
    await fetchWithTrustedCertificatesAsync("https://example.com", {
      dispatcher: dummyDispatcher,
      headers: new Headers({ "x-custom": "present" }),
    });
    const headers = lastFetchHeaders();
    expect(headers.get("x-custom")).toBe("present");
    expect(headers.get("User-Agent")).toBe(defaultUserAgent);
  });

  it("normalizes a tuple-array of headers", async () => {
    await fetchWithTrustedCertificatesAsync("https://example.com", {
      dispatcher: dummyDispatcher,
      headers: [["x-tuple", "value"]],
    });
    const headers = lastFetchHeaders();
    expect(headers.get("x-tuple")).toBe("value");
    expect(headers.get("User-Agent")).toBe(defaultUserAgent);
  });

  it("does not override a caller-provided User-Agent regardless of casing", async () => {
    await fetchWithTrustedCertificatesAsync("https://example.com", {
      dispatcher: dummyDispatcher,
      headers: { "user-agent": "custom-agent" },
    });
    expect(lastFetchHeaders().get("User-Agent")).toBe("custom-agent");
  });

  it("sets the default User-Agent on the timeout path too", async () => {
    await fetchWithTrustedCertificatesAsync("https://example.com", {
      dispatcher: dummyDispatcher,
      timeout: 1000,
    });
    expect(lastFetchHeaders().get("User-Agent")).toBe(defaultUserAgent);
  });
});
