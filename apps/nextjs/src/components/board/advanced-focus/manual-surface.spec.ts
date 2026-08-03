// @vitest-environment jsdom

import { act, createElement, Fragment, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AdvancedFocusManualSurface } from "./manual-surface";

const sourceRect = { left: 100, top: 120, width: 240, height: 160 };
const rect = { left: 40, top: 80, width: 640, height: 480 };
const closePosition = { left: 688, top: 80 };

describe("AdvancedFocusManualSurface", () => {
  let host: HTMLDivElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    host?.remove();
    document.querySelectorAll("[data-portal]").forEach((portal) => portal.remove());
    vi.unstubAllGlobals();
  });

  test("portals dialog semantics, traps focus, closes from the backdrop, and restores focus", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
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
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    const Harness = () => {
      const [opened, setOpened] = useState(false);
      const contentRef = useRef<HTMLDivElement>(null);

      return createElement(
        Fragment,
        null,
        createElement("button", { type: "button", onClick: () => setOpened(true) }, "Open advanced view"),
        createElement(
          AdvancedFocusManualSurface,
          {
            opened,
            phase: "visible",
            id: "advanced-focus-test",
            label: "Test widget advanced view",
            closeLabel: "Close advanced view",
            rect,
            closePosition,
            sourceRect,
            radius: "md",
            contentRef,
            onClose: () => setOpened(false),
          },
          createElement("button", { type: "button" }, "First widget action"),
          createElement("button", { type: "button" }, "Last widget action"),
        ),
      );
    };

    await act(async () => root?.render(createElement(MantineProvider, null, createElement(Harness))));
    const trigger = document.querySelector<HTMLButtonElement>("button");
    expect(trigger).not.toBeNull();
    trigger?.focus();
    await act(async () => trigger?.click());
    await act(async () => await new Promise((resolve) => setTimeout(resolve, 20)));

    const dialog = document.querySelector<HTMLElement>("[role='dialog']");
    const closeButton = dialog?.querySelector<HTMLButtonElement>("[aria-label='Close advanced view']");
    const actions = dialog?.querySelectorAll<HTMLButtonElement>("button");
    expect(dialog?.id).toBe("advanced-focus-test");
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.closest("[data-portal]")).not.toBeNull();
    expect(dialog?.closest(".grid-stack-item")).toBeNull();
    expect(document.getElementById(dialog?.getAttribute("aria-labelledby") ?? "")?.textContent).toBe(
      "Test widget advanced view",
    );
    expect(document.activeElement).toBe(closeButton);

    const lastAction = actions?.item((actions?.length ?? 1) - 1);
    lastAction?.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(closeButton);
    closeButton?.focus();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(lastAction);

    const backdrop = document.querySelector<HTMLElement>("[data-advanced-focus-overlay]");
    await act(async () => backdrop?.click());
    await act(async () => await new Promise((resolve) => setTimeout(resolve, 20)));
    expect(document.activeElement).toBe(trigger);
  });
});
