import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { loadWidgetResources } = vi.hoisted(() => ({ loadWidgetResources: vi.fn().mockResolvedValue({}) }));
vi.mock("@homarr/widgets/manifest", () => ({ loadWidgetResources }));
vi.mock("@homarr/widgets/widget-styles", () => ({ WidgetStyles: () => null }));

import { WidgetResourcePreload } from "./_widget-resource-preload";

let root: Root;
beforeEach(() => {
  loadWidgetResources.mockClear();
  document.body.innerHTML =
    '<section data-grid-item-type="item" data-kind="rssFeed"><span>Cached feed</span></section><section data-grid-item-type="item" data-kind="calendar"><span data-homarr-widget-client-only>Calendar</span></section>';
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  for (const element of document.querySelectorAll("section")) {
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 2000, 300, 300));
  }
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
});

test("preloads offscreen cached content without starting browser-only offscreen widgets", () => {
  act(() => root.render(<WidgetResourcePreload kinds={["rssFeed", "calendar"]} />));
  expect(loadWidgetResources.mock.calls).toEqual([["rssFeed"]]);
});

test("starts browser-only modules when their placeholders are visible", () => {
  const element = document.querySelector('[data-kind="calendar"]');
  if (!element) throw new Error("Missing fixture");
  vi.mocked(element.getBoundingClientRect).mockReturnValue(new DOMRect(0, 0, 300, 300));
  act(() => root.render(<WidgetResourcePreload kinds={["rssFeed", "calendar"]} />));
  expect(loadWidgetResources.mock.calls).toEqual([["rssFeed"], ["calendar"]]);
});
