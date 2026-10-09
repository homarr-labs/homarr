// @vitest-environment node

import { createHash } from "node:crypto";

import { beforeEach, describe, expect, test, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@homarr/db", () => ({
  db: { query: { medias: { findFirst: routeMocks.findFirst } } },
  eq: vi.fn(() => "media-id-filter"),
}));
vi.mock("@homarr/db/schema", () => ({ medias: { id: "media.id" } }));
vi.mock("next/navigation", () => ({ notFound: routeMocks.notFound }));

import { NextRequest } from "next/server";

import { GET } from "./route";

const media = { content: Buffer.from([1, 2, 3]), contentType: "image/png" };
const context = { params: Promise.resolve({ id: "media-id" }) };
const request = (headers?: HeadersInit) => new NextRequest("https://homarr.test/api/user-medias/media-id", { headers });

beforeEach(() => {
  vi.resetAllMocks();
  routeMocks.findFirst.mockResolvedValue(media);
  routeMocks.notFound.mockImplementation(() => {
    throw new Error("Not found");
  });
});

describe("uploaded media cache validation", () => {
  test("returns the image body and private revalidation headers", async () => {
    const response = await GET(request(), context);

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
    expect(response.headers.get("etag")).toBe(`"${createHash("sha256").update(media.content).digest("base64url")}"`);
    expect(response.headers.get("content-length")).toBe("3");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("returns an empty 304 with cache and security headers for a matching validator", async () => {
    const firstResponse = await GET(request(), context);
    const etag = firstResponse.headers.get("etag");
    if (!etag) throw new Error("Expected a response ETag");

    const response = await GET(request({ "if-none-match": etag }), context);

    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
    expect(response.headers.get("etag")).toBe(etag);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("accepts weak and list-form If-None-Match validators", async () => {
    const firstResponse = await GET(request(), context);
    const etag = firstResponse.headers.get("etag");
    if (!etag) throw new Error("Expected a response ETag");

    const response = await GET(request({ "if-none-match": `"other", W/${etag}` }), context);
    const wildcardResponse = await GET(request({ "if-none-match": "*" }), context);

    expect(response.status).toBe(304);
    expect(wildcardResponse.status).toBe(304);
  });

  test("returns 200 when the image body changes under the same id", async () => {
    routeMocks.findFirst.mockResolvedValueOnce(media).mockResolvedValueOnce({
      content: Buffer.from([4, 5, 6]),
      contentType: "image/png",
    });
    const firstResponse = await GET(request(), context);
    const previousEtag = firstResponse.headers.get("etag");
    if (!previousEtag) throw new Error("Expected a response ETag");

    const response = await GET(request({ "if-none-match": previousEtag }), context);

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([4, 5, 6]));
    expect(response.headers.get("etag")).not.toBe(previousEtag);
  });

  test("ignores malformed validators and returns the image", async () => {
    const firstResponse = await GET(request(), context);
    const etag = firstResponse.headers.get("etag");
    if (!etag) throw new Error("Expected a response ETag");

    const response = await GET(request({ "if-none-match": `"unterminated, ${etag}` }), context);

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  test("sanitizes SVG content before serving and calculating its validator", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><rect /></svg>';
    routeMocks.findFirst.mockResolvedValue({ content: Buffer.from(svg), contentType: "image/svg+xml" });

    const response = await GET(request(), context);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).not.toContain("onload");
    expect(body).not.toContain("<script");
    expect(response.headers.get("etag")).toBe(`"${createHash("sha256").update(body).digest("base64url")}"`);
  });

  test("does not serve a deleted image from cache", async () => {
    routeMocks.findFirst.mockResolvedValue(null);

    await expect(GET(request({ "if-none-match": '"previous-etag"' }), context)).rejects.toThrow("Not found");
    expect(routeMocks.notFound).toHaveBeenCalledOnce();
  });
});
