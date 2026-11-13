// @vitest-environment node
import { describe, expect, it } from "vitest";

import { ImageProxy } from "../index";

const jpeg = () =>
  new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { headers: { "content-type": "image/jpeg" } });
describe("Private image forwarding", () => {
  it("never fetches bytes without viewer authorization", async () => {
    let fetched = false;
    await expect(
      new ImageProxy().forwardPrivateImageAsync({
        signal: new AbortController().signal,
        authorizeAsync: async () => {
          throw new Error("denied");
        },
        fetchAsync: async () => {
          fetched = true;
          return jpeg();
        },
      }),
    ).rejects.toThrow();
    expect(fetched).toBe(false);
  });
  it("discards transferred bytes if the viewer loses access during the request", async () => {
    let checks = 0;
    await expect(
      new ImageProxy().forwardPrivateImageAsync({
        signal: new AbortController().signal,
        authorizeAsync: async () => {
          if (++checks === 2) throw new Error("revoked");
        },
        fetchAsync: async () => jpeg(),
      }),
    ).rejects.toThrow();
    expect(checks).toBe(2);
  });
  it("never reuses a response or an authorization decision for another request", async () => {
    let checks = 0,
      fetches = 0;
    const input = {
      signal: new AbortController().signal,
      authorizeAsync: async () => {
        checks++;
      },
      fetchAsync: async () => {
        fetches++;
        return jpeg();
      },
    };
    const proxy = new ImageProxy();
    expect(await proxy.forwardPrivateImageAsync(input)).toMatchObject({ contentType: "image/jpeg" });
    expect(await proxy.forwardPrivateImageAsync(input)).toMatchObject({ contentType: "image/jpeg" });
    expect(fetches).toBe(2);
    expect(checks).toBe(4);
  });
  it("refuses non-JPEG media and oversized bodies", async () => {
    const input = { signal: new AbortController().signal, authorizeAsync: async () => undefined };
    expect(
      await new ImageProxy().forwardPrivateImageAsync({
        ...input,
        fetchAsync: async () => new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }),
      }),
    ).toEqual({ error: "fetch-error" });
    await expect(
      new ImageProxy().forwardPrivateImageAsync({
        ...input,
        fetchAsync: async () =>
          new Response(new Uint8Array(5 * 1024 * 1024 + 1), { headers: { "content-type": "image/jpeg" } }),
      }),
    ).rejects.toThrow();
  });
});
