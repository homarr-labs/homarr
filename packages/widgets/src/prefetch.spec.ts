import { dehydrate } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient } from "@homarr/api/shared";

import { prefetchForKind } from "./prefetch";
import { createRpcQueryKey } from "./rpc-query-key";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: "session=board-reader" }),
}));

const backendFetch = vi.fn<typeof fetch>();

describe("board app data prefetch", () => {
  beforeEach(() => {
    backendFetch.mockReset();
    vi.stubGlobal("fetch", backendFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hydrates pending app and bookmark queries before the backend HTTP responses finish", async () => {
    const appResult = Promise.withResolvers<{ id: string; name: string }>();
    const bookmarkResult = Promise.withResolvers<{ id: string; name: string }[]>();
    backendFetch.mockImplementation((input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/app/byId")) {
        return appResult.promise.then((app) => Response.json({ json: app }));
      }
      if (url.pathname.endsWith("/app/byIds")) {
        return bookmarkResult.promise.then((apps) => Response.json({ json: apps }));
      }
      throw new Error(`Unexpected backend request: ${url.pathname}`);
    });
    const queryClient = makeQueryClient();
    const appKey = createRpcQueryKey("app.byId", { id: "app-1" });
    const bookmarkKey = createRpcQueryKey("app.byIds", ["app-1"]);

    prefetchForKind("app", queryClient, [{ options: { appId: "app-1" } }]);
    prefetchForKind("bookmarks", queryClient, [{ options: { items: ["app-1"] } }]);

    const dehydrated = dehydrate(queryClient);
    expect(dehydrated.queries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ queryKey: appKey, state: expect.objectContaining({ status: "pending" }) }),
        expect.objectContaining({ queryKey: bookmarkKey, state: expect.objectContaining({ status: "pending" }) }),
      ]),
    );
    expect(dehydrated.queries.every((query) => query.promise instanceof Promise)).toBe(true);
    await vi.waitFor(() => expect(backendFetch).toHaveBeenCalledTimes(2));
    for (const [url, init] of backendFetch.mock.calls) {
      expect(new URL(String(url)).pathname).toContain("/rpc/app/byId");
      expect(new Headers(init?.headers).get("cookie")).toBe("session=board-reader");
      expect(new Headers(init?.headers).get("x-trpc-source")).toBe("rsc");
    }

    appResult.resolve({ id: "app-1", name: "App" });
    bookmarkResult.resolve([{ id: "app-1", name: "App" }]);
    await vi.waitFor(() => {
      expect(queryClient.getQueryData(appKey)).toEqual({ id: "app-1", name: "App" });
      expect(queryClient.getQueryData(bookmarkKey)).toEqual([{ id: "app-1", name: "App" }]);
    });
    queryClient.clear();
  });
});
