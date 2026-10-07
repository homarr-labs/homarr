import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import { widgetKinds, integrationKinds, widgetDefaultSizes, widgetIntegrationConfigs } from "@homarr/definitions";
import type { WidgetKind, WidgetIntegrationConfig } from "@homarr/definitions";

import { createTRPCRouter, publicProcedure } from "../trpc";
import generated from "./widget-catalog.json";
import generatedDiscovery from "./discovery-routes.json";

const jsonObject = z.record(z.string(), z.unknown());
const optionSchema = z.object({
  type: z.string(),
  defaultValue: z.unknown(),
  schema: jsonObject,
  choices: z.array(z.unknown()).optional(),
  timeZones: z.array(z.string()).optional(),
  presets: z.array(z.unknown()).optional(),
  step: z.number().optional(),
  storedUnit: z.string().optional(),
  maxValues: z.number().optional(),
  discovery: z.array(z.object({ method: z.string(), path: z.string(), valueMapping: z.string() })).optional(),
  constraints: z.array(z.string()).optional(),
});
interface CatalogOption extends z.infer<typeof optionSchema> {
  generatedDefaultIds?: boolean;
}
export const widgetOptionCatalog = generated as Record<WidgetKind, { options: Record<string, CatalogOption> }>;

export const widgetDiscoverySources: Record<string, [string, string][]> = {
  "app.appId": [["app.selectable", "id"]],
  "bookmarks.items": [["app.selectable", "id; direct bookmarks use url:<HTTP(S) URL>"]],
  "anchorNote.noteId": [["widget.anchorNotes.listNotes", "id from the selected Anchor integration"]],
  "dockerContainers.endpointIds": [["docker.getEndpoints", "id"]],
  "timetable.station": [["widget.timetable.searchStations", "{value: station.id, label: station.name}"]],
  "immich-albumCarousel.albumId": [["widget.immich.getAlbums", "album.id; all selects every photo"]],
  "beszelSystemStats.systemId": [["widget.beszel.getSystems", "integrationId:system.id"]],
  "healthMonitoring.visibleStorageVolumes": [
    [
      "widget.healthMonitoring.listStorageVolumes",
      "integrationId:volumeName; remove any existing prefix before adding the integrationId",
    ],
  ],
  "systemDisks.visibleStorageVolumes": [
    [
      "widget.healthMonitoring.listStorageVolumes",
      "integrationId:volumeName; remove any existing prefix before adding the integrationId",
    ],
  ],
  "umami.websiteId": [["widget.umami.getWebsites", "id"]],
  "umami.eventName": [["widget.umami.getEventNames", "event name"]],
  "umami.eventNames": [["widget.umami.getEventNames", "event names"]],
  "customApi.definitionId": [["customWidget.available", "id"]],
  "customApi.configuration": [
    ["customWidget.get", "definition configuration fields"],
    ["customWidget.optionRequest", "configuration-specific dynamic choices"],
  ],
};

function discoveryFor(key: string) {
  const routes: Record<string, { method: string; path: string }> = generatedDiscovery;
  return widgetDiscoverySources[key]?.map(([name, valueMapping]) => {
    const route = routes[name];
    if (!route) throw new Error(`Missing widget discovery route ${name}; regenerate the OpenAPI specification`);
    return { ...route, valueMapping };
  });
}

const summarySchema = z.object({
  kind: z.enum(widgetKinds),
  optionsPath: z.string(),
  optionCount: z.number(),
  defaultSize: z.object({ width: z.number(), height: z.number() }),
  supportedIntegrations: z.array(z.enum(integrationKinds)),
  integrationsRequired: z.boolean(),
  maxIntegrations: z.number().nullable(),
});

export const widgetCatalogRouter = createTRPCRouter({
  list: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/widgets",
        tags: ["widgets"],
        protect: false,
        summary: "List all widget kinds and configuration links",
      },
      mcp: {
        enabled: true,
        description:
          "Discover every widget kind, integration requirements and option catalog. Use widgetCatalog_getOptions for full option defaults, constraints and dynamic choice endpoints.",
      },
    })
    .input(z.void())
    .output(z.array(summarySchema))
    .query(() =>
      widgetKinds.map((kind) => {
        const integration = (widgetIntegrationConfigs as Partial<Record<WidgetKind, WidgetIntegrationConfig>>)[kind];
        return {
          kind,
          optionsPath: `/api/widgets/${encodeURIComponent(kind)}/options`,
          optionCount: Object.keys(widgetOptionCatalog[kind].options).length,
          defaultSize: widgetDefaultSizes[kind] ?? { width: 1, height: 1 },
          supportedIntegrations: integration?.supportedIntegrations ?? [],
          integrationsRequired: !!integration && integration.integrationsRequired !== false,
          maxIntegrations: integration?.maxIntegrations ?? null,
        };
      }),
    ),
  getOptions: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/widgets/{kind}/options",
        tags: ["widgets"],
        protect: false,
        summary: "Get every configurable option for one widget",
      },
      mcp: {
        enabled: true,
        description:
          "Get all options for a widget kind from widgetCatalog_list: types, current defaults, all fixed choices, validation bounds, units and dynamic discovery endpoints. Includes hidden options. Configure board items through board_addItem/updateItem.",
      },
    })
    .input(z.object({ kind: z.enum(widgetKinds) }))
    .output(
      z.object({
        kind: z.enum(widgetKinds),
        options: z.record(z.string(), optionSchema),
        constraints: z.array(z.string()),
      }),
    )
    .query(async ({ ctx, input }) => {
      const options = structuredClone(widgetOptionCatalog[input.kind].options);
      for (const [key, option] of Object.entries(options)) {
        const discovery = discoveryFor(`${input.kind}.${key}`);
        if (discovery) option.discovery = discovery;
        if (option.generatedDefaultIds && Array.isArray(option.defaultValue)) {
          option.defaultValue = option.defaultValue.map((entry: Record<string, unknown>) => ({
            ...entry,
            id: createId(),
          }));
        }
        if (option.type === "timezoneList") option.constraints = ["IDs and timeZone values must each be unique."];
        if (option.type === "dateTimeEventList") option.constraints = ["Event IDs must be unique."];
      }
      if (input.kind === "app" && options.pingEnabled)
        options.pingEnabled.defaultValue = (await getServerSettingByKeyAsync(ctx.db, "board")).enableStatusByDefault;
      const constraints: string[] = [];
      if (input.kind === "patchmon")
        constraints.push(
          "When enableThresholdColors and useCustomThresholds are true, warning and critical thresholds using percent mode must be integers from 0 to 100.",
        );
      return { kind: input.kind, options, constraints };
    }),
});
