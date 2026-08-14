import type { ReactNode } from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TourTarget, TourTargetsProvider } from "./tour-target";

vi.mock("@gfazioli/mantine-onboarding-tour", () => ({
  OnboardingTour: {
    Target: ({ children }: { children: ReactNode }) => children,
  },
}));

const mountedRoots: Array<ReturnType<typeof createRoot>> = [];

beforeAll(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, writable: true });
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

afterEach(async () => {
  await act(async () => {
    for (const root of mountedRoots.splice(0)) root.unmount();
  });
});

const renderTargetAsync = async (enabled: boolean) => {
  const host = document.createElement("div");
  const root = createRoot(host);
  mountedRoots.push(root);

  await act(async () => {
    root.render(
      createElement(
        MantineProvider,
        null,
        createElement(TourTargetsProvider, {
          enabled,
          children: createElement(TourTarget, { id: "example", children: createElement("button", null, "Target") }),
        }),
      ),
    );
  });
  return host;
};

describe("TourTarget", () => {
  it("keeps a stable route-transition marker while a tour is active", async () => {
    const host = await renderTargetAsync(true);
    expect(host.querySelector('[data-tour-target="example"] button')?.textContent).toBe("Target");
  });

  it("adds no wrapper for users without an active tour", async () => {
    const host = await renderTargetAsync(false);
    expect(host.querySelector("[data-tour-target]")).toBeNull();
    expect(host.querySelector("button")?.parentElement).toBe(host);
  });
});
