// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FloatingTip } from "./floating-tip";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
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
  await act(async () => root.unmount());
  host.remove();
  document.body.querySelectorAll("[data-portal]").forEach((portal) => portal.remove());
  vi.useRealTimers();
});

describe("FloatingTip", () => {
  it("shows after the configured delay and auto-dismisses", async () => {
    await act(async () =>
      root.render(
        <MantineProvider>
          <FloatingTip opened showDelay={2_000} dismissAfter={3_000} transitionDuration={0}>
            Select several apps
          </FloatingTip>
        </MantineProvider>,
      ),
    );

    expect(document.body.textContent).not.toContain("Select several apps");

    await act(async () => vi.advanceTimersByTime(2_000));
    expect(document.body.textContent).toContain("Select several apps");

    await act(async () => vi.advanceTimersByTime(3_000));
    expect(document.body.textContent).not.toContain("Select several apps");
  });

  it("provides an accessible close button and remembers dismissal", async () => {
    const onDismiss = vi.fn();
    const renderTip = (opened: boolean) =>
      root.render(
        <MantineProvider>
          <FloatingTip
            opened={opened}
            showDelay={0}
            transitionDuration={0}
            closable
            closeButtonLabel="Dismiss tip"
            rememberDismissal
            storageKey="selection"
            onDismiss={onDismiss}
          >
            Select several apps
          </FloatingTip>
        </MantineProvider>,
      );

    await act(async () => renderTip(true));
    await act(async () => vi.advanceTimersByTime(0));

    const closeButton = document.body.querySelector<HTMLButtonElement>('button[aria-label="Dismiss tip"]');
    expect(closeButton).not.toBeNull();
    await act(async () => closeButton?.click());

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem("homarr:floating-tip:selection")).toBe("dismissed");

    await act(async () => renderTip(false));
    await act(async () => renderTip(true));
    await act(async () => vi.advanceTimersByTime(0));
    expect(document.body.textContent).not.toContain("Select several apps");
  });
});
