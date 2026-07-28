import type { QueryKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { widgetKinds as definedWidgetKinds } from "@homarr/definitions";

import {
  createRetryableLoader,
  loadAllWidgetDefinitions,
  loadWidgetDefinition,
  loadWidgetModule,
  reduceWidgetOptionsWithDefinition,
  widgetKinds,
} from "./manifest";
import { widgetQueryRefetchIntervals } from "./refetch-intervals";

describe("widget manifest promise stability", () => {
  it("returns the same module promise for every render", () => {
    expect(loadWidgetModule("clock")).toBe(loadWidgetModule("clock"));
  });

  it("returns the same derived definition promise for every render", () => {
    expect(loadWidgetDefinition("clock")).toBe(loadWidgetDefinition("clock"));
  });

  it("returns the same all-definitions promise for every modal render", () => {
    expect(loadAllWidgetDefinitions()).toBe(loadAllWidgetDefinitions());
  });

  it("retries a failed loader instead of retaining its rejected promise", async () => {
    let attempts = 0;
    const loader = createRetryableLoader(
      new Map([
        [
          "example",
          () => {
            attempts += 1;
            if (attempts === 1) return Promise.reject(new Error("temporary failure"));
            return Promise.resolve("loaded");
          },
        ],
      ]),
    );

    await expect(loader("example")).rejects.toThrow("temporary failure");
    await expect(loader("example")).resolves.toBe("loaded");
    expect(attempts).toBe(2);
  });

  it("covers every declared widget kind", () => {
    expect(new Set(widgetKinds)).toEqual(new Set(definedWidgetKinds));
  });

  it("loads matching definitions and component loaders for every widget", async () => {
    const definitions = await loadAllWidgetDefinitions();

    await Promise.all(
      widgetKinds.map(async (kind) => {
        const module = await loadWidgetModule(kind);
        const component = await module.componentLoader();
        expect(definitions.get(kind)).toBe(module.definition);
        expect(component.default).toBeDefined();
      }),
    );
  }, 30_000);

  it("preserves every widget option default", async () => {
    const definitions = await loadAllWidgetDefinitions();
    const settings = { enableStatusByDefault: true, forceDisableStatus: false };

    for (const definition of definitions.values()) {
      const options = definition.createOptions(settings);
      const reduced = reduceWidgetOptionsWithDefinition(definition, settings);
      expect(Object.keys(reduced)).toEqual(Object.keys(options));
      expect(Object.values(reduced).every((value) => value !== undefined)).toBe(true);
    }
  });

  it("keeps the client polling policy aligned with widget definitions", async () => {
    const definitions = await loadAllWidgetDefinitions();
    type PollingPolicy = { queryKey: QueryKey; intervalSeconds: number | null };
    const expectedByQueryKey = new Map<string, PollingPolicy>();

    for (const kind of widgetKinds) {
      const definition = definitions.get(kind);
      if (definition?.refetchInterval === undefined) continue;

      const entry = {
        queryKey: definition.queryKey ?? [["widget", kind]],
        intervalSeconds: definition.refetchInterval,
      } as const;
      const serializedQueryKey = JSON.stringify(entry.queryKey);
      const existing = expectedByQueryKey.get(serializedQueryKey);
      expect(existing?.intervalSeconds ?? entry.intervalSeconds).toBe(entry.intervalSeconds);
      expectedByQueryKey.set(serializedQueryKey, entry);
    }

    const serializePolicy = (entry: PollingPolicy) => JSON.stringify(entry);
    expect(widgetQueryRefetchIntervals.map(serializePolicy).toSorted()).toEqual(
      [...expectedByQueryKey.values()].map(serializePolicy).toSorted(),
    );
  });
});
