import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { BeszelSystemStatsRecord } from "@homarr/integrations/types";
import type * as ChartModule from "./chart";

import { BeszelStatsView } from "./stats-view";
import type { BeszelStatsVisibility } from "./stats-view";

const systemStats: BeszelSystemStatsRecord[] = [
  {
    id: "gpu-sample",
    system: "llama01",
    type: "1m",
    created: "2026-07-11T13:51:30.000Z",
    updated: "2026-07-11T13:51:30.000Z",
    stats: {
      cpu: 0,
      m: 0,
      mu: 0,
      mp: 0,
      mb: 0,
      s: 0,
      su: 0,
      d: 0,
      du: 0,
      dp: 0,
      g: { "0": { n: "RTX 3090", u: 10, mu: 1024, p: 150 } },
    },
  },
];

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    widget: {
      beszel: {
        getSystemStats: { useQuery: () => ({ data: { systemStats, containerStats: [] } }) },
      },
    },
  },
}));

vi.mock("@homarr/translation/client", () => ({ useScopedI18n: () => (key: string) => key }));
vi.mock("./use-live-stats", () => ({ useLiveStats: () => ({ data: undefined }) }));
vi.mock("./chart", async (importOriginal) => {
  const actual = await importOriginal<typeof ChartModule>();
  return {
    ...actual,
    BeszelChartPanel: ({ title }: { title: string }) => createElement("div", { "data-chart": title }),
  };
});

const hiddenCharts: BeszelStatsVisibility = {
  cpu: false,
  memory: false,
  disk: false,
  diskIO: false,
  network: false,
  gpuUsage: false,
  gpuMemory: false,
  gpuPower: false,
  dockerCpu: false,
  dockerMemory: false,
  dockerNetwork: false,
};

const roots: ReturnType<typeof createRoot>[] = [];

const setGpuStats = (gpu: BeszelSystemStatsRecord["stats"]["g"]) => {
  const sample = systemStats[0];
  if (!sample) throw new Error("Expected a GPU test sample");
  sample.stats.g = gpu;
};

afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  setGpuStats({ "0": { n: "RTX 3090", u: 10, mu: 1024, p: 150 } });
});

const renderStatsView = async (visibility: BeszelStatsVisibility) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(
      createElement(
        MantineProvider,
        null,
        createElement(BeszelStatsView, {
          integrationIds: ["beszel"],
          systemId: "llama01",
          timePeriod: "1h",
          visibility,
          columns: 1,
        }),
      ),
    );
  });
  return container;
};

describe("BeszelStatsView GPU charts", () => {
  test("renders only the GPU charts enabled by widget options", async () => {
    const container = await renderStatsView({ ...hiddenCharts, gpuUsage: true, gpuPower: true });

    expect(container.querySelector('[data-chart="chart.gpuUsage.title"]')).not.toBeNull();
    expect(container.querySelector('[data-chart="chart.gpuPower.title"]')).not.toBeNull();
    expect(container.querySelector('[data-chart="chart.gpuMemory.title"]')).toBeNull();
  });

  test("does not render GPU charts for a non-GPU system", async () => {
    setGpuStats(undefined);
    const container = await renderStatsView({ ...hiddenCharts, gpuUsage: true, gpuMemory: true, gpuPower: true });

    expect(container.querySelectorAll("[data-chart]")).toHaveLength(0);
  });

  test("does not render optional GPU charts when Beszel does not report their metrics", async () => {
    setGpuStats({ "0": { n: "RTX 3090", u: 10 } });
    const container = await renderStatsView({ ...hiddenCharts, gpuMemory: true, gpuPower: true });

    expect(container.querySelector('[data-chart="chart.gpuMemory.title"]')).toBeNull();
    expect(container.querySelector('[data-chart="chart.gpuPower.title"]')).toBeNull();
  });
});
