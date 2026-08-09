// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import { startAdvancedFocusEntrance } from "./entrance";

describe("startAdvancedFocusEntrance", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  test("moves the persistent portal before releasing its source-frame animation", () => {
    let releaseFrame: FrameRequestCallback | undefined;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        releaseFrame = callback;
        return 7;
      }),
    );

    const compactHost = document.createElement("div");
    const previewHost = document.createElement("div");
    const portalTarget = document.createElement("div");
    const surface = document.createElement("div");
    surface.classList.add("surface-ready");
    portalTarget.append(surface);
    compactHost.append(portalTarget);
    document.body.append(compactHost, previewHost);

    expect(startAdvancedFocusEntrance(portalTarget, previewHost, surface, "surface-ready")).toBe(7);
    expect(portalTarget.parentElement).toBe(previewHost);
    expect(surface.classList.contains("surface-ready")).toBe(false);

    releaseFrame?.(0);
    expect(surface.classList.contains("surface-ready")).toBe(true);
  });

  test("does not release a detached surface", () => {
    let releaseFrame: FrameRequestCallback | undefined;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        releaseFrame = callback;
        return 8;
      }),
    );

    const previewHost = document.createElement("div");
    const portalTarget = document.createElement("div");
    const surface = document.createElement("div");
    portalTarget.append(surface);
    document.body.append(previewHost);

    startAdvancedFocusEntrance(portalTarget, previewHost, surface, "surface-ready");
    portalTarget.remove();
    releaseFrame?.(0);

    expect(surface.classList.contains("surface-ready")).toBe(false);
  });
});
