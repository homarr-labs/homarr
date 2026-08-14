// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { AssistantImage } from "./assistant-image";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const containers: HTMLDivElement[] = [];

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  for (const container of containers.splice(0)) container.remove();
});

const renderImage = async () => {
  const container = document.createElement("div");
  containers.push(container);
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      createElement(
        MantineProvider,
        undefined,
        createElement(AssistantImage, {
          source: "https://cdn.example.com/homarr.png",
          alt: "Homarr icon",
          loadingLabel: "Loading image",
          failedLabel: "Image could not be loaded",
          retryLabel: "Retry image",
        }),
      ),
    );
  });
  return { container, root };
};

describe("AssistantImage", () => {
  test("shows an accessible loading state and reveals the responsive image after loading", async () => {
    const { container, root } = await renderImage();
    expect(container.querySelector("output")?.getAttribute("aria-label")).toBe("Loading image");

    const image = container.querySelector("img");
    expect(image?.getAttribute("alt")).toBe("Homarr icon");
    expect(image?.getAttribute("referrerpolicy")).toBe("no-referrer");
    await act(async () => image?.dispatchEvent(new Event("load")));

    expect(container.querySelector("output")).toBeNull();
    expect(container.querySelector("figure")?.getAttribute("data-image-state")).toBe("loaded");
    await act(async () => root.unmount());
  });

  test("replaces a broken image with a recoverable error and retries it", async () => {
    const { container, root } = await renderImage();
    const firstImage = container.querySelector("img") as HTMLImageElement;
    await act(async () => firstImage.dispatchEvent(new Event("error")));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Image could not be loaded");
    const retry = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Retry image"),
    );
    await act(async () => retry?.click());

    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("output")).not.toBeNull();
    expect(container.querySelector("img")).not.toBe(firstImage);
    await act(async () => root.unmount());
  });
});
