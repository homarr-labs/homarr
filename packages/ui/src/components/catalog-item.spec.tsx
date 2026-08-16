// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogItem, getCatalogKeyboardDirection } from "./catalog-item";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
});

describe("CatalogItem", () => {
  it("uses one native button surface with selected and status semantics", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <CatalogItem label="Sonarr" status="Ready" selected onSelect={onSelect}>
            Sonarr
          </CatalogItem>
        </MantineProvider>,
      ),
    );

    const button = host.querySelector("button");
    expect(button?.type).toBe("button");
    expect(button?.getAttribute("aria-label")).toBe("Sonarr, Ready");
    expect(button?.getAttribute("aria-pressed")).toBe("true");

    await act(async () => button?.click());
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("exposes busy state and blocks duplicate selection", async () => {
    const onSelect = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <CatalogItem label="Weather" busy onSelect={onSelect}>
            Weather
          </CatalogItem>
        </MantineProvider>,
      ),
    );

    const button = host.querySelector("button");
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute("aria-busy")).toBe("true");

    await act(async () => button?.click());
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("normalizes grid navigation keys for catalog roving focus", () => {
    expect(getCatalogKeyboardDirection("ArrowRight")).toBe("next");
    expect(getCatalogKeyboardDirection("ArrowDown")).toBe("next");
    expect(getCatalogKeyboardDirection("ArrowLeft")).toBe("previous");
    expect(getCatalogKeyboardDirection("Home")).toBe("first");
    expect(getCatalogKeyboardDirection("End")).toBe("last");
    expect(getCatalogKeyboardDirection("Enter")).toBeNull();
  });

  it("moves focus only for navigation keys", async () => {
    const onSelect = vi.fn();
    const onMoveFocus = vi.fn();
    await act(async () =>
      root.render(
        <MantineProvider>
          <CatalogItem label="Sonarr" onSelect={onSelect} onMoveFocus={onMoveFocus}>
            Sonarr
          </CatalogItem>
        </MantineProvider>,
      ),
    );

    const button = host.querySelector("button");
    await act(async () => button?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(onMoveFocus).toHaveBeenCalledWith("next");

    await act(async () => button?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    await act(async () => button?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })));
    expect(onMoveFocus).toHaveBeenCalledOnce();
  });

  it("moves focus between enabled sibling catalog items by default", async () => {
    await act(async () =>
      root.render(
        <MantineProvider>
          <div>
            <CatalogItem label="First" onSelect={vi.fn()}>
              First
            </CatalogItem>
            <CatalogItem label="Disabled" disabled onSelect={vi.fn()}>
              Disabled
            </CatalogItem>
            <CatalogItem label="Last" onSelect={vi.fn()}>
              Last
            </CatalogItem>
          </div>
        </MantineProvider>,
      ),
    );

    const [first, , last] = host.querySelectorAll("button");
    first?.focus();
    await act(async () => first?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(document.activeElement).toBe(last);

    await act(async () => last?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true })));
    expect(document.activeElement).toBe(first);
  });
});
