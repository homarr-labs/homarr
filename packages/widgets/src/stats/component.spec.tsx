// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { WidgetComponentProps } from "../definition";
import StatsWidget from "./component";

const fixture = vi.hoisted(() => ({ snapshot: {} as Record<string, unknown> }));
vi.mock("@homarr/translation/client", () => ({ useI18n: () => (key: string) => key }));
vi.mock("@homarr/boards/context", () => ({ useRequiredBoard: () => ({ itemRadius: "md" }) }));
vi.mock("../runtime-hooks", () => ({ useWidgetRuntimeActions: () => undefined }));
vi.mock("./table", () => ({ StatsTable: () => null }));
vi.mock("@homarr/api/client", () => {
  const utils = { widget: { stats: { snapshot: { getData: () => fixture.snapshot } } } };
  const api = {
    widget: {
      stats: {
        catalog: () => ({
          data: {
            name: "Source",
            metrics: [
              { key: "healthy", label: "Healthy", unit: "count" },
              { key: "failed", label: "Failed", unit: "count" },
            ],
          },
        }),
        snapshot: () => ({ data: fixture.snapshot }),
      },
    },
  };
  return {
    clientApi: { useUtils: () => utils, useQueries: (callback: (value: typeof api) => unknown) => callback(api) },
  };
});

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  fixture.snapshot = {
    values: { healthy: 42, failed: 3 },
    updatedAt: Date.now(),
    retryAt: Date.now() + 60_000,
    error: false,
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function openFailedMetric() {
  const props = {
    integrationIds: ["source"],
    width: 500,
    options: {
      entries: [
        { id: "healthy", integrationId: "source", metric: "healthy" },
        { id: "failed", integrationId: "source", metric: "failed" },
      ],
      table: false,
      rows: false,
      plain: false,
      showIcon: false,
    },
  } as WidgetComponentProps<"stats">;
  await act(() =>
    root.render(
      <MantineProvider env="test">
        <StatsWidget {...props} />
      </MantineProvider>,
    ),
  );
  const button = host.querySelector<HTMLButtonElement>('button[aria-label^="Failed:"]');
  expect(button).not.toBeNull();
  await act(async () => {
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return Array.from(document.querySelectorAll("dl > div")).map((row) => [
    row.querySelector("dt")?.textContent,
    row.querySelector("dd")?.textContent,
  ]);
}

test("renders persisted snapshots written before metric availability was added", async () => {
  expect(await openFailedMetric()).toEqual([
    ["Failed", "3"],
    ["Healthy", "42"],
  ]);
});

test("opening a failed metric preserves healthy sibling values in its details", async () => {
  fixture.snapshot.unavailableMetrics = ["failed"];
  expect(await openFailedMetric()).toEqual([
    ["Failed", "unavailable"],
    ["Healthy", "42"],
  ]);
});
