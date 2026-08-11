// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { fetchFaviconUrlAsync } from "../favicon-fetcher";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn() }),
}));

type FetchResponse = Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;

const mockedFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const websiteUrl = "https://app.example.com/";
const faviconUrl = "https://app.example.com/favicon.ico";

const createBody = (content: string) => {
  let read = false;
  return {
    getReader: () => ({
      read: () => {
        if (read) return Promise.resolve({ done: true, value: undefined });
        read = true;
        return Promise.resolve({ done: false, value: new TextEncoder().encode(content) });
      },
      cancel: () => Promise.resolve(),
    }),
    cancel: () => Promise.resolve(),
  };
};

const createResponse = (options: { ok?: boolean; url?: string; contentType?: string; body?: string }): FetchResponse =>
  ({
    ok: options.ok ?? true,
    url: options.url ?? websiteUrl,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? (options.contentType ?? null) : null),
    },
    body: options.body === undefined ? null : createBody(options.body),
  }) as unknown as FetchResponse;

const createPage = (head: string, url?: string) =>
  createResponse({ url, contentType: "text/html; charset=utf-8", body: `<html><head>${head}</head></html>` });

const mockResponses = (responsesByUrl: Record<string, FetchResponse>) => {
  mockedFetch.mockImplementation((input) => {
    const url = input instanceof URL ? input.href : String(input);
    const response = responsesByUrl[url];
    return response === undefined
      ? Promise.reject(new Error(`Unexpected request to ${url}`))
      : Promise.resolve(response);
  });
};

describe("fetchFaviconUrlAsync", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
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
      [websiteUrl]: createPage('<link rel="icon" href="icon.png">', "https://app.example.com/login/"),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBe("https://app.example.com/login/icon.png");
  });

  test("falls back to the well known favicon when the page declares no icon", async () => {
    mockResponses({
      [websiteUrl]: createPage(""),
      [faviconUrl]: createResponse({ contentType: "image/x-icon", body: "binary" }),
    });

    const result = await fetchFaviconUrlAsync("https://app.example.com/dashboard");

    expect(result).toBe(faviconUrl);
  });

  test("ignores a well known favicon that answers with a page instead of an image", async () => {
    mockResponses({
      [websiteUrl]: createPage(""),
      [faviconUrl]: createResponse({ contentType: "text/html", body: "<html></html>" }),
    });

    const result = await fetchFaviconUrlAsync(websiteUrl);

    expect(result).toBeNull();
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
});
