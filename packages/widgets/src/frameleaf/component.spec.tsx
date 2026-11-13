// @vitest-environment jsdom
import { act } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import FrameleafWidget from "./component";

vi.mock("@homarr/translation/client", () => ({ useI18n: () => (key: string) => key }));
let host: HTMLDivElement;
let root: Root;
let itemId: string;
let sequence = 0;
const fetchAsync = vi.fn();
const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();
const metadata = () =>
  Response.json({
    total: 2,
    caption: "Synthetic",
    imageUrl: "/api/integrations/frameleaf/widget/image?binding=test",
    libraryUrl: "https://library.example.test",
  });
const jpeg = () =>
  new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { headers: { "content-type": "image/jpeg" } });
const limited = (seconds: string) =>
  Response.json({ error: "rateLimit" }, { status: 429, headers: { "retry-after": seconds } });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
  vi.stubGlobal("fetch", fetchAsync);
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
  fetchAsync.mockReset();
  createObjectURL.mockReset().mockImplementation(() => `blob:synthetic-${++sequence}`);
  revokeObjectURL.mockReset();
  itemId = `widget-${++sequence}`;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function render() {
  const props = { itemId, options: { albumId: "00000000-0000-4000-8000-000000000001" }, height: 300 } as ComponentProps<
    typeof FrameleafWidget
  >;
  await act(() =>
    root.render(
      <MantineProvider env="test">
        <FrameleafWidget {...props} />
      </MantineProvider>,
    ),
  );
}
async function advance(milliseconds: number) {
  await act(() => vi.advanceTimersByTimeAsync(milliseconds));
}
async function click(text: string) {
  const button = [...host.querySelectorAll("button")].find((element) => element.textContent === text);
  if (!button) throw new Error(`Missing ${text} button`);
  await act(() => button.click());
}

test.each(["120", "Fri, 13 Nov 2026 12:02:00 GMT"])(
  "waits for rendition Retry-After %s across polling and remounts",
  async (retryAfter) => {
    fetchAsync
      .mockResolvedValueOnce(metadata())
      .mockResolvedValueOnce(limited(retryAfter))
      .mockImplementation(async (url: string) => (url.includes("/image?") ? jpeg() : metadata()));
    await render();
    expect(fetchAsync).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain("rateLimit");
    expect(host.querySelector("img")).toBeNull();
    await advance(30000);
    await act(() => root.unmount());
    root = createRoot(host);
    await render();
    await advance(89999);
    expect(fetchAsync).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(fetchAsync).toHaveBeenCalledTimes(4);
    expect(fetchAsync.mock.calls[2]?.[0]).toContain("page=1");
    expect(host.querySelector("img")?.src).toMatch(/^blob:/);
    expect(fetchAsync.mock.calls[1]?.[1]).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
    });
  },
);

test("playing cannot advance or retry a rate-limited rendition before its deadline", async () => {
  fetchAsync
    .mockResolvedValueOnce(metadata())
    .mockResolvedValueOnce(jpeg())
    .mockResolvedValueOnce(metadata())
    .mockResolvedValueOnce(limited("120"))
    .mockImplementation(async (url: string) => (url.includes("/image?") ? jpeg() : metadata()));
  await render();
  await click("play");
  expect(host.textContent).toContain("rateLimit");
  await advance(119999);
  expect(fetchAsync).toHaveBeenCalledTimes(4);
  await advance(1);
  expect(fetchAsync.mock.calls[4]?.[0]).toContain("page=1");
  await advance(30000);
  expect(fetchAsync.mock.calls[6]?.[0]).toContain("page=2");
});

test("long cooldowns are scheduled in safe timer chunks without early retries", async () => {
  fetchAsync.mockResolvedValueOnce(metadata()).mockResolvedValueOnce(limited("3000000"));
  await render();
  await advance(2147483647);
  expect(fetchAsync).toHaveBeenCalledTimes(2);
  await advance(1000);
  expect(fetchAsync).toHaveBeenCalledTimes(2);
});

test("releases every downloaded image URL when replaced or unmounted", async () => {
  fetchAsync.mockImplementation(async (url: string) => (url.includes("/image?") ? jpeg() : metadata()));
  await render();
  const first = host.querySelector("img")?.src;
  expect(first).toMatch(/^blob:/);
  await advance(30000);
  const second = host.querySelector("img")?.src;
  expect(second).not.toBe(first);
  expect(revokeObjectURL).toHaveBeenCalledWith(first);
  await act(() => root.unmount());
  root = createRoot(host);
  expect(revokeObjectURL).toHaveBeenCalledWith(second);
});

test("an interrupted image download never creates a late object URL", async () => {
  let finishBlob: ((blob: Blob) => void) | undefined;
  const pendingBlob = new Promise<Blob>((resolve) => {
    finishBlob = resolve;
  });
  fetchAsync.mockResolvedValueOnce(metadata()).mockResolvedValueOnce({ ok: true, blob: () => pendingBlob });
  await render();
  expect(fetchAsync).toHaveBeenCalledTimes(2);
  await act(() => root.unmount());
  root = createRoot(host);
  await act(async () => {
    finishBlob?.(new Blob(["synthetic"], { type: "image/jpeg" }));
  });
  expect(createObjectURL).not.toHaveBeenCalled();
});

test.each(["next", "poll"])("%s keeps keyboard focus while a replacement image is pending", async (action) => {
  let finish: ((response: Response) => void) | undefined;
  fetchAsync
    .mockResolvedValueOnce(metadata())
    .mockResolvedValueOnce(jpeg())
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(jpeg());
  await render();
  const previousImage = host.querySelector("img")?.src;
  const button = [...host.querySelectorAll("button")].find((element) => element.textContent === "next");
  if (!button) throw new Error("Missing next button");
  button.focus();
  if (action === "next") await click("next");
  else await advance(30000);
  expect(document.activeElement).toBe(button);
  expect(button.isConnected).toBe(true);
  expect(host.querySelector("img")).toBeNull();
  expect(revokeObjectURL).toHaveBeenCalledWith(previousImage);
  await act(async () => finish?.(metadata()));
  expect(document.activeElement).toBe(button);
  expect(host.querySelector("img")?.src).toMatch(/^blob:/);
});

test("permission denial during replacement removes the previous photo, counts and controls", async () => {
  fetchAsync
    .mockResolvedValueOnce(metadata())
    .mockResolvedValueOnce(jpeg())
    .mockResolvedValueOnce(Response.json({ error: "consent" }, { status: 403 }));
  await render();
  const previousImage = host.querySelector("img")?.src;
  await advance(30000);
  expect(host.querySelector("img")).toBeNull();
  expect(host.querySelector("button")).toBeNull();
  expect(host.textContent).toContain("privateOnly");
  expect(host.textContent).not.toContain("count");
  expect(revokeObjectURL).toHaveBeenCalledWith(previousImage);
});
