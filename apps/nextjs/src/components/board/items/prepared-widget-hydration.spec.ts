import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createPreparedWidgetHydration } from "./prepared-widget-hydration";

beforeEach(() => {
  vi.stubGlobal("CSS", { escape: (value: string) => value });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
});
afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("prepared Widget hydration", () => {
  test("meaningful cached content is immediately ready even below the viewport", () => {
    document.body.innerHTML = '<section data-grid-item-id="cached-widget"><div>Cached value: 42</div></section>';
    const element = document.querySelector("section");
    if (!element) throw new Error("Missing fixture");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 2000, 300, 300));
    const hydration = createPreparedWidgetHydration("cached-widget");
    expect(hydration.isReady()).toBe(true);
  });

  test("an offscreen browser-only placeholder skips restoration and resumes on interaction", async () => {
    document.body.innerHTML =
      '<section data-grid-item-id="cached-widget"><span data-homarr-widget-client-only>Calendar</span></section>';
    const element = document.querySelector("section");
    if (!element) throw new Error("Missing fixture");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 2000, 300, 300));
    const hydration = createPreparedWidgetHydration("cached-widget");
    const skipRestoration = vi.fn();
    expect(hydration.isReady()).toBe(false);
    const cleanup = hydration.observe("cached-widget", skipRestoration);
    expect(skipRestoration).toHaveBeenCalledOnce();
    element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await hydration.completion;
    expect(hydration.isReady()).toBe(true);
    cleanup?.();
  });
});
