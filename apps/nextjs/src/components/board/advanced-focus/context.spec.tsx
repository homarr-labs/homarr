// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { EditModeProvider } from "@homarr/boards/edit-mode";

import { BoardAdvancedFocusProvider, useAdvancedFocus } from "./context";

const sourceRect = {
  left: 20,
  top: 30,
  right: 220,
  bottom: 150,
  width: 200,
  height: 120,
  x: 20,
  y: 30,
  toJSON: () => undefined,
};

describe("BoardAdvancedFocusProvider preview interaction", () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let focus: ReturnType<typeof useAdvancedFocus>;

  const Harness = () => {
    focus = useAdvancedFocus();
    return createElement(
      "div",
      null,
      createElement("div", { "data-testid": "source" }),
      createElement("div", { "data-advanced-focus-surface": true, "data-testid": "surface" }),
      createElement(
        "div",
        { "data-portal": true },
        createElement("button", { role: "menuitem", "data-testid": "portalled-menu-item" }),
      ),
      createElement("div", { "data-testid": "outside" }),
    );
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: vi.fn(() => []),
    });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    await act(async () =>
      root.render(
        createElement(
          MantineProvider,
          null,
          createElement(
            EditModeProvider,
            null,
            createElement(BoardAdvancedFocusProvider, null, createElement(Harness)),
          ),
        ),
      ),
    );

    const source = host.querySelector<HTMLElement>("[data-testid='source']");
    if (!source) throw new Error("Expected source fixture");
    vi.spyOn(source, "getBoundingClientRect").mockReturnValue(sourceRect);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    document.querySelectorAll("[data-portal]").forEach((portal) => portal.remove());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const startPreview = async () => {
    const source = host.querySelector<HTMLElement>("[data-testid='source']");
    if (!source) throw new Error("Expected source fixture");
    await act(async () => {
      window.dispatchEvent(new MouseEvent("pointermove", { clientX: 48, clientY: 52 }));
      focus.hover("widget-1", source);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });
  };

  test("shows pointer-following hold feedback for the full 500 ms delay", async () => {
    await startPreview();

    const indicator = document.querySelector<HTMLElement>("[data-advanced-focus-hold-indicator]");
    expect(indicator?.style.getPropertyValue("--advanced-focus-pointer-x")).toBe("48px");
    expect(indicator?.style.getPropertyValue("--advanced-focus-pointer-y")).toBe("52px");
    expect(focus.active).toBeNull();

    await act(async () => vi.advanceTimersByTime(499));
    expect(focus.active).toBeNull();
    expect(document.querySelector("[data-advanced-focus-hold-indicator]")).not.toBeNull();

    await act(async () => vi.advanceTimersByTime(1));
    expect(focus.active?.itemId).toBe("widget-1");
    expect(focus.active?.activation).toBe("preview");
    expect(document.querySelector("[data-advanced-focus-hold-indicator]")).toBeNull();
  });

  test("does not show hold feedback when Shift is pressed without a hovered source", async () => {
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" })));
    expect(document.querySelector("[data-advanced-focus-hold-indicator]")).toBeNull();

    await act(async () => vi.advanceTimersByTime(500));
    expect(focus.active).toBeNull();
  });

  test("cancels the hold feedback and activation when Shift is released early", async () => {
    await startPreview();

    await act(async () => vi.advanceTimersByTime(250));
    await act(async () => window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" })));
    expect(document.querySelector("[data-advanced-focus-hold-indicator]")).toBeNull();

    await act(async () => vi.advanceTimersByTime(250));
    expect(focus.active).toBeNull();
  });

  test("promotes a Shift preview to a persistent view with Shift+Control", async () => {
    await startPreview();
    await act(async () => vi.advanceTimersByTime(500));
    expect(focus.active?.activation).toBe("preview");

    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Control", ctrlKey: true, shiftKey: true, cancelable: true }),
      ),
    );
    expect(focus.active?.activation).toBe("manual");

    await act(async () => window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" })));
    expect(focus.active?.activation).toBe("manual");
  });

  test("promotes a Shift preview to a persistent view with Shift+Meta", async () => {
    await startPreview();
    await act(async () => vi.advanceTimersByTime(500));

    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Meta", metaKey: true, shiftKey: true, cancelable: true }),
      ),
    );
    expect(focus.active?.activation).toBe("manual");
  });

  test("opens a persistent view when the keep-open modifiers are held before the delay", async () => {
    const source = host.querySelector<HTMLElement>("[data-testid='source']");
    if (!source) throw new Error("Expected source fixture");
    await act(async () => {
      focus.hover("widget-1", source);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Control", ctrlKey: true }));
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Shift", ctrlKey: true, shiftKey: true, cancelable: true }),
      );
    });

    await act(async () => vi.advanceTimersByTime(500));
    expect(focus.active?.activation).toBe("manual");
  });

  test("cancels the hold feedback and activation when the source is left early", async () => {
    await startPreview();

    await act(async () => vi.advanceTimersByTime(250));
    await act(async () => focus.leave("widget-1"));
    expect(document.querySelector("[data-advanced-focus-hold-indicator]")).toBeNull();

    await act(async () => vi.advanceTimersByTime(250));
    expect(focus.active).toBeNull();
  });

  test("keeps the preview open across the source-to-portal gap and closes after leaving both", async () => {
    await startPreview();
    await act(async () => vi.advanceTimersByTime(500));

    await act(async () => focus.leave("widget-1"));
    await act(async () => vi.advanceTimersByTime(40));
    const surface = host.querySelector<HTMLElement>("[data-testid='surface']");
    if (!surface) throw new Error("Expected surface fixture");
    await act(async () =>
      surface.dispatchEvent(new MouseEvent("pointerover", { bubbles: true, clientX: 300, clientY: 200 })),
    );
    await act(async () => vi.advanceTimersByTime(80));
    expect(focus.active?.phase).toBe("visible");

    const outside = host.querySelector<HTMLElement>("[data-testid='outside']");
    if (!outside) throw new Error("Expected outside fixture");
    await act(async () =>
      outside.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 500, clientY: 500 })),
    );
    await act(async () => vi.advanceTimersByTime(79));
    expect(focus.active?.phase).toBe("visible");
    await act(async () => vi.advanceTimersByTime(1));
    expect(focus.active?.phase).toBe("closing");
    await act(async () => vi.advanceTimersByTime(180));
    expect(focus.active).toBeNull();
  });

  test("keeps the preview open while a widget-owned portalled popup is hovered", async () => {
    await startPreview();
    await act(async () => vi.advanceTimersByTime(500));

    await act(async () => focus.leave("widget-1"));
    await act(async () => vi.advanceTimersByTime(40));
    const menuItem = host.querySelector<HTMLElement>("[data-testid='portalled-menu-item']");
    if (!menuItem) throw new Error("Expected portalled menu fixture");
    await act(async () =>
      menuItem.dispatchEvent(new MouseEvent("pointerover", { bubbles: true, clientX: 320, clientY: 210 })),
    );
    await act(async () => vi.advanceTimersByTime(80));

    expect(focus.active?.phase).toBe("visible");
  });
});
