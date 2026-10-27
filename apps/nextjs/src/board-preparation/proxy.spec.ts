// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@homarr/common/env", () => ({ env: { SECRET_ENCRYPTION_KEY: "1".repeat(64) } }));

import { getPreparedBoardResponseAsync } from "./proxy";

const request = () =>
  new NextRequest("https://homarr.test/boards/default", {
    headers: { cookie: "homarr.session-token=viewer", "user-agent": "test browser", "sec-ch-viewport-width": "1440" },
  });
const fallback = () => NextResponse.rewrite("https://homarr.test/en/boards/default");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("keeps a prepared document readable after the lookup deadline without forwarding encoding headers", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockResolvedValue(
    new Response("prepared HTML", {
      headers: { "X-Homarr-Board-Cache": "HIT; age=1", "Content-Encoding": "gzip", "Content-Length": "999" },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const result = await getPreparedBoardResponseAsync(request(), fallback());
  const options = fetch.mock.calls[0]?.[1] as RequestInit;
  expect(new Headers(options.headers).get("cookie")).toBe("homarr.session-token=viewer");
  expect(new Headers(options.headers).has("x-homarr-board-preparation")).toBe(true);
  await vi.advanceTimersByTimeAsync(500);
  expect(options.signal?.aborted).toBe(false);
  expect(await result?.text()).toBe("prepared HTML");
  expect(result?.headers.get("cache-control")).toContain("private, no-store");
  expect(result?.headers.has("content-encoding")).toBe(false);
  expect(result?.headers.has("content-length")).toBe(false);
});

test("falls back to ordinary rendering when the lookup is unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
  const response = fallback();
  expect(await getPreparedBoardResponseAsync(request(), response)).toBeNull();
  expect(response.headers.get("X-Homarr-Board-Cache")).toBe("MISS; reason=lookup_unavailable");
});
