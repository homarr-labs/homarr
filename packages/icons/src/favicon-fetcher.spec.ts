// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";

import { fetchBestIconUrlForAppAsync } from "./favicon-fetcher";

const createHtmlResponse = (html: string, url: string) => ({
  ok: true,
  url,
  headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "text/html" : null) },
  body: new Response(html).body,
});

const createImageResponse = (contentType: string) => ({
  ok: true,
  headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? contentType : null) },
  body: new Response("binary").body,
});

const notFoundResponse = () => ({
  ok: false,
  url: "",
  headers: { get: () => null },
  body: new Response("").body,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchBestIconUrlForAppAsync", () => {
  test("prefers the apple-touch-icon and resolves it to an absolute url", async () => {
    const html = `<html><head>
      <link rel="icon" href="/favicon-16.png" sizes="16x16">
      <link rel="apple-touch-icon" href="touch.png">
    </head></html>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(createHtmlResponse(html, "https://app.example.com/"))),
    );

    const result = await fetchBestIconUrlForAppAsync("https://app.example.com");

    expect(result).toBe("https://app.example.com/touch.png");
  });

  test("prefers the icon with the largest declared size", async () => {
    const html = `<html><head>
      <link rel="icon" href="/small.png" sizes="16x16">
      <link rel="icon" href="/large.png" sizes="128x128">
    </head></html>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(createHtmlResponse(html, "https://app.example.com/"))),
    );

    const result = await fetchBestIconUrlForAppAsync("https://app.example.com");

    expect(result).toBe("https://app.example.com/large.png");
  });

  test("falls back to the origin /favicon.ico when the page declares no icon", async () => {
    const fetchMock = vi.fn((input: URL | string) => {
      const requestUrl = typeof input === "string" ? input : input.href;
      if (requestUrl.endsWith("/favicon.ico")) {
        return Promise.resolve(createImageResponse("image/x-icon"));
      }
      return Promise.resolve(createHtmlResponse("<html><head></head></html>", "https://app.example.com/"));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBestIconUrlForAppAsync("https://app.example.com/dashboard");

    expect(result).toBe("https://app.example.com/favicon.ico");
  });

  test("returns null when neither a declared icon nor a reachable favicon exists", async () => {
    const fetchMock = vi.fn((input: URL | string) => {
      const requestUrl = typeof input === "string" ? input : input.href;
      if (requestUrl.endsWith("/favicon.ico")) {
        return Promise.resolve(notFoundResponse());
      }
      return Promise.resolve(createHtmlResponse("<html><head></head></html>", "https://app.example.com/"));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBestIconUrlForAppAsync("https://app.example.com");

    expect(result).toBeNull();
  });

  test("rejects non-http(s) schemes without performing any request", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("should not be called")));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBestIconUrlForAppAsync("ftp://app.example.com");

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
