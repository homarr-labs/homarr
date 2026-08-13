// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { FeatureStateWorkbench } from "./_feature-state-workbench";
import { catalogStateFixtures, responseStateFixtures } from "./_feature-state-fixtures";
import { getResponseContractFixtureResultsAsync } from "./_response-contract-fixtures";

vi.mock("@homarr/translation/client", () => ({
  useScopedI18n: () => (key: string) =>
    ({
      "catalog.state.needsSetup.label": "Service needing setup",
      "catalog.state.needsSetup.status": "Needs setup",
      "catalog.interaction.loading": "Loading",
      "catalog.interaction.disabled": "Disabled",
      "response.state.failure.label": "Failure",
      "response.state.failure.title": "Response rejected",
      "response.contractPassed": "Fixture contract passed",
      "catalog.loadingAriaLabel": "Loading catalog item",
      "catalog.loading": "Loading",
    })[key] ?? key,
}));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
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
  vi.unstubAllGlobals();
});

const clickControl = async (label: string) => {
  const control = [...host.querySelectorAll<HTMLElement>("label")].find((element) =>
    element.textContent?.includes(label),
  );
  await act(async () => control?.click());
};

describe("FeatureStateWorkbench", () => {
  test("keeps stable catalog and response fixtures covered by the parser contract", async () => {
    expect(catalogStateFixtures.map((fixture) => fixture.id)).toEqual(["ready", "needsSetup", "noConnection", "error"]);
    expect(responseStateFixtures.map((fixture) => fixture.id)).toEqual(["loading", "success", "failure"]);
    expect(await getResponseContractFixtureResultsAsync()).toEqual([
      { name: "success", passed: true, message: undefined },
      { name: "failure", passed: true, message: undefined },
    ]);
  });

  test("renders setup, busy, disabled, and rejected states with native semantics", async () => {
    const responseResults = await getResponseContractFixtureResultsAsync();
    await act(async () =>
      root.render(
        <MantineProvider>
          <FeatureStateWorkbench responseResults={responseResults} />
        </MantineProvider>,
      ),
    );

    await clickControl("Needs setup");
    let catalogButton = host.querySelector<HTMLButtonElement>('button[aria-label^="Service needing setup"]');
    expect(catalogButton?.getAttribute("aria-label")).toBe("Service needing setup, Needs setup");

    await clickControl("Loading");
    catalogButton = host.querySelector<HTMLButtonElement>('button[aria-label^="Service needing setup"]');
    expect(catalogButton?.disabled).toBe(true);
    expect(catalogButton?.getAttribute("aria-busy")).toBe("true");
    expect(host.querySelector('[aria-label="Loading catalog item"]')).not.toBeNull();

    await clickControl("Disabled");
    expect(host.querySelector<HTMLButtonElement>('button[aria-label^="Service needing setup"]')?.disabled).toBe(true);

    await clickControl("Failure");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Response rejected");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Fixture contract passed");
  });
});
