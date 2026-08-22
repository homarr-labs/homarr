// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, test, vi } from "vitest";

import { WidgetQueryLoadingState } from "./query-state-indicator";

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string) => {
    if (key === "loading") return "Loading widget data";
    return key;
  },
}));

const matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

describe("WidgetQueryLoadingState", () => {
  let host: HTMLDivElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    host?.remove();
    vi.unstubAllGlobals();
  });

  test("announces the loading state to assistive technology", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", matchMedia);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    await act(async () => root?.render(createElement(MantineProvider, null, createElement(WidgetQueryLoadingState))));

    expect(host.querySelector("output")?.textContent).toContain("Loading widget data");
  });
});
