// @vitest-environment node
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCertificateAgentAsync, fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { fetchFaviconUrlAsync } from "../favicon-fetcher";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("@homarr/core/infrastructure/http", () => ({
  createCertificateAgentAsync: vi.fn(),
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));
const debugLog = vi.hoisted(() => vi.fn());
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: debugLog }),
}));

type FetchResponse = Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
type Dispatcher = Awaited<ReturnType<typeof createCertificateAgentAsync>>;

const mockedLookup = vi.mocked(lookup as unknown as (hostname: string) => Promise<LookupAddress[]>);
const mockedCreateAgent = vi.mocked(createCertificateAgentAsync);
const mockedFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const websiteUrl = "https://app.example.com/";
const faviconUrl = "https://app.example.com/favicon.ico";

const addressesByHostname: Record<string, string> = {
  "app.example.com": "93.184.216.34",
  "auth.example.net": "93.184.216.35",
  localhost: "127.0.0.1",
};

const createBody = (content: string | string[]) => {
  const chunks = (typeof content === "string" ? [content] : content).map((chunk) => new TextEncoder().encode(chunk));
  return {
    getReader: () => ({
      read: () => {
        const value = chunks.shift();
        return Promise.resolve(value === undefined ? { done: true, value: undefined } : { done: false, value });
      },
      cancel: () => Promise.resolve(),
    }),
    cancel: () => Promise.resolve(),
  };
};

const createResponse = (options: {
  status?: number;
  location?: string;
  contentType?: string;
  body?: string | string[];
}): FetchResponse => {
  const status = options.status ?? 200;
  const headers: Record<string, string | undefined> = {
    "content-type": options.contentType,
    location: options.location,
  };
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    body: options.body === undefined ? null : createBody(options.body),
  } as unknown as FetchResponse;
};

// Sends one byte every few seconds, each within the idle timeout, and fails the read once
// the request is aborted the way the body of a real fetch does.
const createDrippingPage = (signal: AbortSignal | null | undefined): FetchResponse =>
  ({
    status: 200,
    ok: true,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "text/html" : null) },
    body: {
      getReader: () => ({
        read: () =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve({ done: false, value: new Uint8Array([32]) }), 3_000);
            signal?.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(signal.reason);
            });
          }),
        cancel: () => Promise.resolve(),
      }),
      cancel: () => Promise.resolve(),
    },
  }) as unknown as FetchResponse;

const createPage = (head: string) =>
  createResponse({ contentType: "text/html; charset=utf-8", body: `<html><head>${head}</head></html>` });

const createRedirect = (location: string) => createResponse({ status: 302, location });

const mockResponses = (responsesByUrl: Record<string, FetchResponse>) => {
  mockedFetch.mockImplementation((input) => {
    const url = input instanceof URL ? input.href : String(input);
    const response = responsesByUrl[url];
    return response === undefined
      ? Promise.reject(new Error(`Unexpected request to ${url}`))
      : Promise.resolve(response);
  });
};

const requestedUrls = () => mockedFetch.mock.calls.map(([input]) => String(input));

describe("fetchFaviconUrlAsync", () => {
  beforeEach(() => {
    debugLog.mockReset();
    mockedFetch.mockReset();
    mockedCreateAgent.mockReset();
    mockedCreateAgent.mockImplementation(() =>
      Promise.resolve({ destroy: () => Promise.resolve() } as unknown as Dispatcher),
    );
    mockedLookup.mockReset();
    mockedLookup.mockImplementation((hostname) => {
      const address = addressesByHostname[hostname];
      return address === undefined
        ? Promise.reject(new Error(`getaddrinfo ENOTFOUND ${hostname}`))
        : Promise.resolve([{ address, family: 4 }]);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("prefers the apple touch icon and resolves it to an absolute url", async () => {
    mockResponses({
      [websiteUrl]: createPage(
        '<link rel="icon" href="/favicon-16.png" sizes="16x16"><link rel="apple-touch-icon" href="touch.png">',
      ),
    });

    const result = await fetchFaviconUrlAsync("https://app.example.com");

    expect(result).toBe("https://app.example.com/touch.png");
  });

  test("prefers the icon with the largest declared size", async () => {
    mockResponses({
      [websiteUrl]: createPage(
        '<link rel="icon" href="/small.png" sizes="16x16"><link rel="icon" href="/large.png" sizes="128x128">',
      ),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://app.example.com/large.png");
  });

  test("resolves relative icons against the page that answered the request", async () => {
    mockResponses({
      [websiteUrl]: createRedirect("/login/"),
      "https://app.example.com/login/": createPage('<link rel="icon" href="icon.png">'),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://app.example.com/login/icon.png");
  });

  test("falls back to the well known favicon when the page declares no icon", async () => {
    mockResponses({
      "https://app.example.com/dashboard": createPage(""),
      [faviconUrl]: createResponse({ contentType: "image/x-icon", body: "binary" }),
    });

    const result = await fetchFaviconUrlAsync("https://app.example.com/dashboard");

    expect(result).toBe(faviconUrl);
  });

  test("falls back to the well known favicon of the origin that answered the request", async () => {
    mockResponses({
      [websiteUrl]: createRedirect("https://auth.example.net/login"),
      "https://auth.example.net/login": createPage(""),
      "https://auth.example.net/favicon.ico": createResponse({ contentType: "image/x-icon", body: "binary" }),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://auth.example.net/favicon.ico");
  });

  test("falls back to the well known favicon of the origin that answered, even when that response carried no usable html", async () => {
    mockResponses({
      [websiteUrl]: createRedirect("https://auth.example.net/error"),
      "https://auth.example.net/error": createResponse({ contentType: "application/json" }),
      "https://auth.example.net/favicon.ico": createResponse({ contentType: "image/x-icon", body: "binary" }),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://auth.example.net/favicon.ico");
  });

  test("ignores a well known favicon that answers with a page instead of an image", async () => {
    mockResponses({
      [websiteUrl]: createPage(""),
      [faviconUrl]: createResponse({ contentType: "text/html", body: "<html></html>" }),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBeNull();
  });

  test("reads a page that declares its media type in a different case", async () => {
    mockResponses({
      [websiteUrl]: createResponse({
        contentType: "Text/HTML; charset=UTF-8",
        body: '<html><head><link rel="icon" href="/icon.png"></head></html>',
      }),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://app.example.com/icon.png");
  });

  test("reads no more than 256 KiB of a page that arrives in a single chunk", async () => {
    const padding = " ".repeat(256 * 1024);
    mockResponses({
      [websiteUrl]: createResponse({
        contentType: "text/html",
        body: `<html><head>${padding}<link rel="icon" href="/late.png"></head></html>`,
      }),
      [faviconUrl]: createResponse({ contentType: "image/x-icon", body: "binary" }),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe(faviconUrl);
  });

  test("ignores icons declared after the end of the head", async () => {
    mockResponses({
      [websiteUrl]: createResponse({
        contentType: "text/html",
        body: [
          '<html><head><link rel="icon" href="/head.png"></he',
          'ad><body><header></header><link rel="apple-touch-icon" href="/body.png"></body></html>',
        ],
      }),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://app.example.com/head.png");
  });

  test("ends the head at the body when the page leaves out </head>", async () => {
    mockResponses({
      [websiteUrl]: createResponse({
        contentType: "text/html",
        body: [
          '<html><head><link rel="icon" href="/head.png"><bo',
          'dy><link rel="apple-touch-icon" href="/body.png"></body></html>',
        ],
      }),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://app.example.com/head.png");
  });

  test("ignores a header element that is not the end of the head", async () => {
    mockResponses({
      [websiteUrl]: createResponse({
        contentType: "text/html",
        body: '<html><head><header></header><link rel="icon" href="/icon.png"></head></html>',
      }),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://app.example.com/icon.png");
  });

  test("parses a link tag with a very long attribute without stalling", async () => {
    mockResponses({
      [websiteUrl]: createPage(`<link ${"a".repeat(64 * 1024)}><link rel="icon" href="/icon.png">`),
    });

    const start = performance.now();
    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://app.example.com/icon.png");
    expect(performance.now() - start).toBeLessThan(500);
  });

  test("parses a head full of unclosed link tags without stalling", async () => {
    mockResponses({
      [websiteUrl]: createPage(`<link rel="icon" href="/icon.png">${"<link".repeat(50_000)}`),
    });

    const start = performance.now();
    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://app.example.com/icon.png");
    expect(performance.now() - start).toBeLessThan(500);
  });

  test("parses a very long sizes attribute without stalling", async () => {
    mockResponses({
      [websiteUrl]: createPage(`<link rel="icon" sizes="${"1".repeat(64 * 1024)}" href="/icon.png">`),
    });

    const start = performance.now();
    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://app.example.com/icon.png");
    expect(performance.now() - start).toBeLessThan(500);
  });

  test("sends no credentials and logs only the origin when the website fails", async () => {
    mockedFetch.mockRejectedValue(new Error("connection refused"));

    const result = await fetchFaviconUrlAsync("https://admin:secret@app.example.com/home?token=abc#section");

    expect(result).toBeNull();
    expect(requestedUrls()).toEqual(["https://app.example.com/home?token=abc", faviconUrl]);
    expect(debugLog.mock.calls.map(([, metadata]) => (metadata as { origin: string }).origin)).toEqual([
      "https://app.example.com",
      "https://app.example.com",
    ]);
    expect(JSON.stringify(debugLog.mock.calls)).not.toMatch(/admin|secret|token|section/);
  });

  test("bounds the page body and not only the response headers", async () => {
    mockResponses({ [websiteUrl]: createPage('<link rel="icon" href="/icon.png">') });

    await fetchFaviconUrlAsync(websiteUrl);

    expect(mockedCreateAgent.mock.calls[0]?.[1]?.bodyTimeout).toBeGreaterThan(0);
    expect(mockedFetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  test("gives up on a page that keeps dripping its head after fifteen seconds", async () => {
    vi.useFakeTimers();
    mockedFetch.mockImplementation((input, init) =>
      String(input) === websiteUrl
        ? Promise.resolve(createDrippingPage(init?.signal))
        : Promise.reject(new Error(`Unexpected request to ${String(input)}`)),
    );

    let settled = false;
    const detection = fetchFaviconUrlAsync(websiteUrl).finally(() => (settled = true));
    await vi.advanceTimersByTimeAsync(14_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(detection).resolves.toBeNull();
    expect(requestedUrls()).toEqual([websiteUrl]);
  });

  test("returns null when the website cannot be reached", async () => {
    mockedFetch.mockRejectedValue(new Error("connection refused"));

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBeNull();
  });

  test("rejects other protocols without sending a request", async () => {
    const result = await fetchFaviconUrlAsync("ftp://app.example.com");

    expect(result).toBeNull();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test("sends no request to a loopback address, not even for the well known favicon", async () => {
    const result = await fetchFaviconUrlAsync("http://localhost:3000/");

    expect(result).toBeNull();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test("does not follow the page to the cloud metadata service", async () => {
    mockResponses({
      [websiteUrl]: createRedirect("http://169.254.169.254/latest/meta-data/"),
      [faviconUrl]: createResponse({ contentType: "image/x-icon", body: "binary" }),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe(faviconUrl);
    expect(requestedUrls()).toEqual([websiteUrl, faviconUrl]);
  });

  test("does not follow the well known favicon to a loopback address", async () => {
    mockResponses({
      [websiteUrl]: createPage(""),
      [faviconUrl]: createRedirect("http://127.0.0.1:7575/favicon.ico"),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBeNull();
    expect(requestedUrls()).toEqual([websiteUrl, faviconUrl]);
  });
});
