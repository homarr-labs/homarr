// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { FrameleafState, FrameleafStore } from "../../src/frameleaf/connection";
import { FrameleafReader } from "../../src/frameleaf/reader";

const albumId = "00000000-0000-4000-8000-000000000001";
const assetId = "00000000-0000-4000-8000-000000000002";
const store = (): FrameleafStore => {
  let state: FrameleafState | null = {
    version: 1,
    origin: "https://library.example.test",
    clientId: "client",
    status: "connected",
    tokens: { accessToken: "current", refreshToken: "refresh", expiresAt: Date.now() + 3600000 },
    connection: { grantId: "grant", libraryUserId: "owner" },
  };
  return {
    readAsync: async () => state,
    replaceAsync: async (previous, next) => {
      if (previous !== state) return false;
      state = next;
      return true;
    },
  };
};
const json = (value: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } });

describe("Frameleaf restricted media reads", () => {
  it("uses the exact selected album, one image per page, and only the display rendition", async () => {
    const paths: string[] = [];
    const reader = new FrameleafReader(store(), async (url, init) => {
      paths.push(url);
      expect(init?.headers).toEqual({ authorization: "Bearer current" });
      expect(init?.redirect).toBe("error");
      if (url.endsWith("capabilities"))
        return json({
          protocolVersion: 1,
          policyRevision: 4,
          connection: { grantId: "grant", libraryUserId: "owner" },
        });
      if (url.includes("/assets?"))
        return json({
          total: 3,
          items: [{ id: assetId, type: "IMAGE", title: null, description: "Synthetic", updatedAt: "2026-01-01" }],
        });
      return new Response();
    });
    expect(await reader.pageAsync(albumId, 2)).toMatchObject({ total: 3, grantId: "grant", policyRevision: 4 });
    await reader.displayAsync(assetId, new AbortController().signal);
    expect(new URL(paths[1] ?? "").searchParams).toEqual(
      new URLSearchParams({ albumId, page: "2", size: "1", type: "IMAGE" }),
    );
    expect(paths[2]).toBe(`https://library.example.test/api/connect/assets/${assetId}/rendition?variant=display`);
  });
  it("rejects a different grant identity before reading any asset metadata", async () => {
    let calls = 0;
    const reader = new FrameleafReader(store(), async () => {
      calls++;
      return json({
        protocolVersion: 1,
        policyRevision: 1,
        connection: { grantId: "other-grant", libraryUserId: "other-owner" },
      });
    });
    await expect(reader.pageAsync(albumId, 1)).rejects.toThrow();
    expect(calls).toBe(1);
  });
  it("invalidates authorization after revocation and does not keep fetching with that grant", async () => {
    const connectionStore = store();
    let calls = 0;
    const reader = new FrameleafReader(connectionStore, async () => {
      calls++;
      return json({}, 401);
    });
    await expect(reader.albumsAsync()).rejects.toThrow();
    await expect(reader.albumsAsync()).rejects.toThrow();
    expect(calls).toBe(1);
    expect((await connectionStore.readAsync())?.status).toBe("uncertain");
  });
  it("preserves the server retry delay without retrying a rate-limited request", async () => {
    const reader = new FrameleafReader(store(), async () => json({}, 429, { "retry-after": "120" }));
    await expect(reader.albumsAsync()).rejects.toMatchObject({ reason: "rateLimit", retryAfter: 120 });
  });
});
