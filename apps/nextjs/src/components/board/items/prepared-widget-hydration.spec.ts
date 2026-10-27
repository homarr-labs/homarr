import { act, createElement, Suspense, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useIsHydrated } from "@homarr/common";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createPreparedWidgetHydration, usePreparedWidgetHydration } from "./prepared-widget-hydration";

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

  test("an offscreen browser-only placeholder keeps its runtime idle and resumes on interaction", async () => {
    document.body.innerHTML =
      '<section data-grid-item-id="cached-widget"><span data-homarr-widget-client-only>Calendar</span></section>';
    const element = document.querySelector("section");
    if (!element) throw new Error("Missing fixture");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 2000, 300, 300));
    const hydration = createPreparedWidgetHydration("cached-widget");
    const onReady = vi.fn();
    hydration.subscribe(onReady);
    expect(hydration.isReady()).toBe(false);
    const cleanup = hydration.observe("cached-widget");
    element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(onReady).toHaveBeenCalledOnce();
    expect(hydration.isReady()).toBe(true);
    cleanup?.();
  });
});

test("hydrates the cached shell while an offscreen browser runtime remains inactive", async () => {
  const settled = vi.fn();
  const runtime = vi.fn(() => createElement("span", null, "Live browser data"));
  const Shell = () => {
    const active = usePreparedWidgetHydration("cached-widget", true);
    const hydrated = useIsHydrated();
    useLayoutEffect(() => {
      settled();
    }, []);
    let content: ReactNode = createElement("span", { "data-homarr-widget-client-only": true }, "Calendar");
    if (hydrated && active) content = createElement(runtime);
    return createElement("section", { "data-grid-item-id": "cached-widget" }, content);
  };
  const app = createElement(Suspense, { fallback: "Blocked shell" }, createElement(Shell));
  const host = document.createElement("div");
  host.innerHTML = renderToString(app);
  document.body.append(host);
  const element = host.querySelector("section");
  if (!element) throw new Error("Missing fixture");
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 2000, 300, 300));
  let root: Root | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(host, app);
    });
    expect(settled).toHaveBeenCalledOnce();
    expect(runtime).not.toHaveBeenCalled();
    act(() => {
      element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });
    expect(runtime).toHaveBeenCalledOnce();
    expect(host.textContent).toBe("Live browser data");
  } finally {
    act(() => root?.unmount());
  }
});
