// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  eq: vi.fn((_column: unknown, value: unknown) => value),
}));

vi.mock("@homarr/db", () => ({
  db: { query: { medias: { findFirst: routeMocks.findFirst } } },
  eq: routeMocks.eq,
}));
vi.mock("@homarr/db/schema", () => ({ medias: { id: "id" } }));

import { GET } from "./route";

const video = { content: Buffer.from("0123456789"), contentType: "video/mp4" };

const requestAsync = (id: string, headers: Record<string, string> = {}) =>
  GET(new NextRequest(`http://localhost/api/user-medias/${id}`, { headers }), {
    params: Promise.resolve({ id }),
  });

describe("GET /api/user-medias/[id]", () => {
  beforeEach(() => {
    routeMocks.findFirst.mockReset();
    routeMocks.findFirst.mockResolvedValue(video);
  });

  test("looks a video up by the id in front of its extension", async () => {
    await requestAsync("abc.mp4");

    expect(routeMocks.eq).toHaveBeenLastCalledWith(expect.anything(), "abc");
  });

  test("sends the whole file and advertises byte ranges", async () => {
    const response = await requestAsync("abc.mp4");

    expect(response.status).toBe(200);
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(await response.text()).toBe("0123456789");
  });

  test.each([
    ["bytes=2-5", "2345", "bytes 2-5/10"],
    ["bytes=7-", "789", "bytes 7-9/10"],
    ["bytes=-3", "789", "bytes 7-9/10"],
    ["bytes=8-100", "89", "bytes 8-9/10"],
  ])("answers %s with the requested bytes", async (range, body, contentRange) => {
    const response = await requestAsync("abc.mp4", { range });

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(contentRange);
    expect(response.headers.get("Content-Length")).toBe(body.length.toString());
    expect(await response.text()).toBe(body);
  });

  test("rejects a range past the end", async () => {
    const response = await requestAsync("abc.mp4", { range: "bytes=10-" });

    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */10");
  });

  test("sends the whole file for a range it does not support", async () => {
    const response = await requestAsync("abc.mp4", { range: "bytes=0-1,4-5" });

    expect(response.status).toBe(200);
  });

  test("sends the requested bytes when If-Range matches the current ETag", async () => {
    const etag = (await requestAsync("abc.mp4")).headers.get("ETag") ?? "";

    const response = await requestAsync("abc.mp4", { range: "bytes=2-5", "if-range": etag });

    expect(response.status).toBe(206);
  });

  test("sends the whole file when If-Range no longer matches", async () => {
    const response = await requestAsync("abc.mp4", { range: "bytes=2-5", "if-range": '"outdated"' });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("0123456789");
  });

  test("ignores ranges on an empty file", async () => {
    routeMocks.findFirst.mockResolvedValue({ content: Buffer.alloc(0), contentType: "video/mp4" });

    const response = await requestAsync("abc.mp4", { range: "bytes=-1" });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Range")).toBeNull();
  });

  test("still answers a matching ETag with 304", async () => {
    const first = await requestAsync("abc.mp4");
    const etag = first.headers.get("ETag") ?? "";

    const response = await requestAsync("abc.mp4", { "if-none-match": etag });

    expect(response.status).toBe(304);
  });

  test("always sends a sanitized SVG whole", async () => {
    routeMocks.findFirst.mockResolvedValue({
      content: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      contentType: "image/svg+xml",
    });

    const response = await requestAsync("logo", { range: "bytes=0-3" });

    expect(response.status).toBe(200);
    expect(response.headers.get("Accept-Ranges")).toBeNull();
  });
});
