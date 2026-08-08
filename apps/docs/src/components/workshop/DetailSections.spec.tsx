// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScreenshotGallery } from "./DetailSections";

vi.mock("@docusaurus/theme-common", () => ({ useColorMode: () => ({ colorMode: "light" }) }));

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
});

async function render(urls: string[]) {
  await act(async () => root.render(<ScreenshotGallery urls={urls} title="Gallery" />));
}

describe("ScreenshotGallery", () => {
  it("resets an out-of-range selection when screenshots shrink", async () => {
    await render(["/one.png", "/two.png", "/three.png"]);
    const thirdThumbnail = host.querySelector<HTMLButtonElement>('button[aria-label="Show screenshot 3"]');
    if (!thirdThumbnail) throw new Error("Third screenshot thumbnail was not rendered");
    await act(async () => thirdThumbnail.click());
    expect(host.querySelector<HTMLImageElement>('img[alt="Gallery screenshot 3"]')?.src).toContain("/three.png");

    await render(["/one.png"]);
    expect(host.querySelector<HTMLImageElement>('img[alt="Gallery screenshot 1"]')?.src).toContain("/one.png");
    expect(host.querySelector('img[alt="Gallery screenshot 3"]')).toBeNull();
  });
});
