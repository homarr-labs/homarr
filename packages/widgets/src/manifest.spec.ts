import type { QueryKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { widgetIntegrationSupport, widgetKinds as definedWidgetKinds } from "@homarr/definitions";

import {
  createRetryableLoader,
  loadAllWidgetDefinitions,
  loadWidgetComponent,
  loadWidgetDefinition,
  loadWidgetModule,
  loadWidgetResources,
  reduceWidgetOptionsWithDefinition,
  widgetKinds,
} from "./manifest";
import { widgetQueryRefetchIntervals } from "./refetch-intervals";
import { widgetCatalogIcons } from "./catalog";
import { getWidgetQueryKeys } from "./definition";

const serializePollingPolicy = (entry: { queryKey: QueryKey; intervalSeconds: number | null }) => JSON.stringify(entry);

describe("widget manifest promise stability", () => {
  it("returns the same module promise for every render", () => {
    expect(loadWidgetModule("clock")).toBe(loadWidgetModule("clock"));
  });

  it("returns the same derived definition promise for every render", () => {
    expect(loadWidgetDefinition("clock")).toBe(loadWidgetDefinition("clock"));
  });

  it("returns stable component and combined resource promises", () => {
    expect(loadWidgetComponent("clock")).toBe(loadWidgetComponent("clock"));
    expect(loadWidgetResources("clock")).toBe(loadWidgetResources("clock"));
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
        const canonicalComponent = await module.componentLoader();
        const component = await loadWidgetComponent(kind);
        const resources = await loadWidgetResources(kind);
        expect(definitions.get(kind)).toBe(module.definition);
        expect(component.default).toBe(canonicalComponent.default);
        expect(component.default).toBeDefined();
        expect(resources.definition).toBe(module.definition);
        expect(resources.Component).toBe(component.default);
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

  it("keeps the lightweight integration support map aligned with widget definitions", async () => {
    const definitions = await loadAllWidgetDefinitions();

    for (const kind of widgetKinds) {
      const definition = definitions.get(kind);
      const supportedIntegrations =
        definition && "supportedIntegrations" in definition ? (definition.supportedIntegrations ?? []) : [];
      expect([...(widgetIntegrationSupport[kind] ?? [])].toSorted()).toEqual([...supportedIntegrations].toSorted());
    }
  });

  it("keeps the lightweight catalog icons aligned with widget definitions", async () => {
    const definitions = await loadAllWidgetDefinitions();

    for (const kind of widgetKinds) {
      expect(widgetCatalogIcons[kind]).toBe(definitions.get(kind)?.icon);
    }
  });

  it("declares the real query prefix for widget kinds that share a router", async () => {
    const definitions = await loadAllWidgetDefinitions();
    const expectedQueryKeys = new Map([
      ["anchorNote", [["widget", "anchorNotes"]]],
      ["beszelAlerts", [["widget", "beszel", "getAlerts"]]],
      ["clock", [["widget", "weather", "atLocation"]]],
      ["mediaMissing", [["widget", "mediaOrganizer", "getData"]]],
      ["mediaRequests-requestList", [["widget", "mediaRequests", "getLatestRequests"]]],
      ["mediaRequests-requestStats", [["widget", "mediaRequests", "getStats"]]],
      ["smartHome-entityState", [["widget", "smartHome"]]],
    ] as const);

    for (const [kind, queryKey] of expectedQueryKeys) {
      expect(definitions.get(kind)?.queryKey).toEqual(queryKey);
    }
  });

  it("keeps the client polling policy aligned with widget definitions", async () => {
    const definitions = await loadAllWidgetDefinitions();
    type PollingPolicy = { queryKey: QueryKey; intervalSeconds: number | null };
    const expectedByQueryKey = new Map<string, PollingPolicy>();

    for (const kind of widgetKinds) {
      const definition = definitions.get(kind);
      if (definition?.refetchInterval === undefined) continue;

      for (const queryKey of getWidgetQueryKeys(definition, kind)) {
        const path = queryKey[0];
        if (!Array.isArray(path) || (path[0] !== "widget" && path[0] !== "docker")) continue;
        const entry = { queryKey, intervalSeconds: definition.refetchInterval } as const;
        const serializedQueryKey = JSON.stringify(entry.queryKey);
        const existing = expectedByQueryKey.get(serializedQueryKey);
        expect(existing?.intervalSeconds ?? entry.intervalSeconds).toBe(entry.intervalSeconds);
        expectedByQueryKey.set(serializedQueryKey, entry);
      }
    }

    expect(widgetQueryRefetchIntervals.map(serializePollingPolicy).toSorted()).toEqual(
      [...expectedByQueryKey.values()].map(serializePollingPolicy).toSorted(),
    );
  });

  it("does not poll integration handlers faster than their cache can refresh", async () => {
    const definitions = await loadAllWidgetDefinitions();
    const cachedWidgetKinds = [
      "dnsHoleControls",
      "dnsHoleSummary",
      "downloads",
      "firewall",
      "healthMonitoring",
      "mediaServer",
      "systemDisks",
      "systemResources",
      "tracearr",
    ] as const;

    for (const kind of cachedWidgetKinds) {
      expect(definitions.get(kind)?.refetchInterval).toBe(10);
    }
  });
});
