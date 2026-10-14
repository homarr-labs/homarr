import { ORPCError } from "@orpc/server";
import SuperJSON from "superjson";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/response-error";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { getCustomWidgetConfirmation } from "@homarr/custom-widgets/core";
import { hashRuntimeParams } from "@homarr/custom-widgets/server";
import {
  integrationKinds,
  integrationDefs,
  healthMonitoringSystemIntegrationKinds,
  healthMonitoringClusterIntegrationKinds,
  releaseProviderKinds,
} from "@homarr/definitions";
import { anchorNotesListInputSchema, anchorNoteUpdateInputSchema } from "@homarr/integrations/anchor";
import { downloadClientItemSchema } from "@homarr/integrations/downloads";
import {
  radarrReleaseTypes,
  mediaRequestStatusConfiguration,
  wazuhCveOrders,
  wazuhFimEvents,
  wazuhTimelineIntervals,
  wazuhTimeRanges,
  wazuhTopListKinds,
} from "@homarr/integrations/types";
import type { LiveStatsEvent } from "@homarr/integrations/types";
import { paginatedSchema } from "@homarr/validation/common";

import type { SourceAccess, SourceProcedureDescriptor } from "../procedure";
import { sourceProjectionMeta } from "../procedure";
import type { WidgetProcedureResources } from "./-widgets/resources";
import {
  widgetProcedure,
  authenticatedWidgetProcedure,
  oneIntegration,
  manyIntegrations,
  oneWidget,
  manyWidgets,
  settleIntegrationQueries,
  PUBLIC_INTEGRATION_ERROR,
  toPublicIntegrationError,
  boardAccess,
  normalizeAnchorContent,
  isJsonDeltaString,
  assertMockNoteExists,
  BoundedAsyncQueue,
  canAccessAllFeedsAsync,
  restrictUrlsAsync,
  safeFeedLogContext,
  redactFeedFailureMessage,
  assertPlacementChangeAllowed,
  timetableSourceSchema,
  validateTimetableOptionsChangeAsync,
  resolveTimetableBaseUrlAsync,
  mockWazuh,
  settleWazuh,
  itemInputSchema,
  namedRequestInputSchema,
  resolvePlacedDefinitionAsync,
  findRequest,
  getCustomWidgetCacheVersion,
  withRequestLimit,
  getCustomWidgetIntegrationCacheVersion,
  executeRequest,
} from "./-widgets/helpers";

export type { WidgetProcedureResources } from "./-widgets/resources";

type QueryPath = Extract<SourceProcedureDescriptor, { kind: "query" }>["path"];
type MutationPath = Extract<SourceProcedureDescriptor, { kind: "mutation" }>["path"];
const sourceAccess = (protectedAccess: boolean): SourceAccess =>
  protectedAccess ? { kind: "protected" } : { kind: "public" };
const query = <TPath extends QueryPath>(path: TPath, protectedAccess = false) =>
  ({
    path,
    kind: "query",
    access: sourceAccess(protectedAccess),
    demo: "guarded",
  }) as const;
const mutation = <TPath extends MutationPath>(path: TPath, protectedAccess = true) =>
  ({
    path,
    kind: "mutation",
    access: sourceAccess(protectedAccess),
    demo: "guarded",
  }) as const;
const atLocationInput = z.object({ longitude: z.number().min(-180).max(180), latitude: z.number().min(-90).max(90) });
const releaseVersionFilterSchema = z.object({
  prefix: z.string().optional(),
  precision: z.number(),
  suffix: z.string().optional(),
});
const escapeForRegEx = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function formatVersionFilterRegex(filter: z.infer<typeof releaseVersionFilterSchema> | undefined) {
  if (!filter) return undefined;
  return `^${filter.prefix ? escapeForRegEx(filter.prefix) : ""}${"[0-9]+\\.".repeat(filter.precision).slice(0, -2)}${filter.suffix ? escapeForRegEx(filter.suffix) : ""}$`;
}

export const widgetImplementedPaths = [
  "widget.stats.catalog",
  "widget.stats.snapshot",
  "widget.stats.refresh",
  "widget.archiveTeamWarrior.getStatus",
  "widget.beszel.getSystems",
  "widget.beszel.getAlerts",
  "widget.beszel.getSystemStats",
  "widget.beszel.subscribeSystemStats",
  "widget.anchorNotes.listNotes",
  "widget.anchorNotes.getNote",
  "widget.anchorNotes.updateNote",
  "widget.coolify.getInstancesInfo",
  "widget.immich.getServerStats",
  "widget.immich.getAlbum",
  "widget.immich.getAlbumPreview",
  "widget.immich.getAlbums",
  "widget.paperlessNgx.getStats",
  "widget.patchmon.getStats",
  "widget.bazarr.getBadges",
  "widget.notebook.updateContent",
  "widget.weather.atLocation",
  "widget.airQuality.atLocation",
  "widget.app.ping",
  "widget.dnsHole.summary",
  "widget.dnsHole.enable",
  "widget.dnsHole.disable",
  "widget.smartHome.entityState",
  "widget.smartHome.entityDetails",
  "widget.smartHome.switchEntity",
  "widget.smartHome.executeAutomation",
  "widget.stockPrice.getPriceHistory",
  "widget.mediaServer.getCurrentStreams",
  "widget.mediaRelease.getMediaReleases",
  "widget.calendar.findAllEvents",
  "widget.downloads.getJobsAndStatuses",
  "widget.downloads.pause",
  "widget.downloads.pauseItem",
  "widget.downloads.resume",
  "widget.downloads.resumeItem",
  "widget.downloads.deleteItem",
  "widget.mediaRequests.getLatestRequests",
  "widget.mediaRequests.getStats",
  "widget.mediaRequests.answerRequest",
  "widget.mediaOrganizer.getData",
  "widget.rssFeed.getFeeds",
  "widget.indexerManager.getIndexersStatus",
  "widget.indexerManager.testAllIndexers",
  "widget.healthMonitoring.getSystemHealthStatus",
  "widget.healthMonitoring.listStorageVolumes",
  "widget.healthMonitoring.getClusterHealthStatus",
  "widget.mediaTranscoding.getDataAsync",
  "widget.minecraft.getServerStatus",
  "widget.options.getWidgetOptionSettings",
  "widget.options.saveItemOptions",
  "widget.releases.getLatest",
  "widget.networkController.summary",
  "widget.firewall.getFirewallCpuStatus",
  "widget.firewall.getFirewallInterfacesStatus",
  "widget.firewall.getFirewallVersionStatus",
  "widget.firewall.getFirewallMemoryStatus",
  "widget.notifications.deleteNotification",
  "widget.notifications.getNotifications",
  "widget.timetable.getTimetable",
  "widget.timetable.searchStations",
  "widget.tracearr.getDashboard",
  "widget.speedtestTracker.getDashboard",
  "widget.uptimeKuma.getDashboard",
  "widget.audioStats.getStats",
  "widget.umami.getWebsites",
  "widget.umami.getVisitorStats",
  "widget.umami.getEventNames",
  "widget.umami.getTopPages",
  "widget.umami.getTopReferrers",
  "widget.umami.getMultiEventTimeSeries",
  "widget.umami.getActiveVisitors",
  "widget.vpn.getSummaries",
  "widget.ups.getSummaries",
  "widget.traefik.getDashboard",
  "widget.customApi.refresh",
  "widget.customApi.getData",
  "widget.customApi.queryRequest",
  "widget.customApi.executeAction",
  "widget.secrets.setSecret",
  "widget.secrets.deleteSecret",
  "widget.secrets.getConfiguredKinds",
  "widget.wud.getStats",
  "widget.llamacpp.getStats",
  "widget.wazuh.getAgents",
  "widget.wazuh.getAlerts",
  "widget.wazuh.getSummary",
  "widget.wazuh.getTimeline",
  "widget.wazuh.getTopList",
  "widget.wazuh.getVulnerabilities",
  "widget.wazuh.getFim",
  "widget.wazuh.getAuthFailures",
] as const;
export const widgetBindingHeldPaths = widgetImplementedPaths;
export const widgetBindingStatus = "candidate-unmounted-current-authority-physical-runtime-bindings-required" as const;

export function createWidgetProcedures(resources: WidgetProcedureResources) {
  const { mockWidgetData: mock, logger } = resources;
  const { eq, and, or, inArray } = resources.operators;
  const { items, widgetSecrets } = resources.tables;
  return {
    stats: {
      catalog: oneIntegration(resources, query("widget.stats.catalog"), "query", integrationKinds)
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "List available statistics fields for an integration. Obtain integrationId from integration_all. Requires query access to that integration.",
            },
          }),
        )
        .handler(({ context }) => ({
          name: context.integration.name,
          iconUrl: integrationDefs[context.integration.kind].iconUrl,
          metrics: resources.getStatsMetrics(context.integration.kind),
        })),
      snapshot: oneIntegration(resources, query("widget.stats.snapshot"), "query", integrationKinds)
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Read cached integration statistics and their age without contacting the service. Requires integrationId from integration_all and query access.",
            },
          }),
        )
        .handler(async ({ context }) => await context.widgetLease.getStatsSnapshotAsync(context.integration)),
      refresh: oneIntegration(resources, mutation("widget.stats.refresh", false), "query", integrationKinds)
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Refresh read-only integration statistics through a bounded queue. Requires integrationId from integration_all and query access. force bypasses the one-hour freshness window.",
            },
          }),
        )
        .input(z.object({ force: z.boolean().default(false) }))
        .handler(async ({ context, input }) => {
          await context.widgetLease.refreshStatsAsync(context.integration, input.force);
          return await context.widgetLease.getStatsSnapshotAsync(context.integration);
        }),
    },
    archiveTeamWarrior: {
      getStatus: oneWidget(
        resources,
        query("widget.archiveTeamWarrior.getStatus"),
        "query",
        "archiveTeamWarrior",
      ).handler(async ({ context }) => {
        if (context.integration.kind === "mock")
          return { status: mock.archiveTeamWarrior, updatedAt: new Date(mock.timestamp) };
        const { data, timestamp } = await context.widgetLease.requests.archiveTeamWarrior
          .handler({ ...context.integration, kind: "archiveTeamWarrior" }, {})
          .getDataAsync();
        return { status: data, updatedAt: timestamp };
      }),
    },
    beszel: {
      getSystems: manyWidgets(resources, query("widget.beszel.getSystems"), "query", "beszelSystemGrid")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get all Beszel-monitored systems with CPU, memory, disk, GPU, network, temperature, and status. REQUIRED: integrationIds (array of Beszel integration IDs from integration_all)",
            },
          }),
        )
        .handler(async ({ context }) => {
          const integrationIds = context.integrations.map(({ id }) => id);
          const userId = context.principal.kind === "authenticated" ? context.principal.user.id : undefined;
          logger.debug("getSystems called", { userId, integrationIds });
          const results = await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              const { data, timestamp } = await context.widgetLease.requests.beszelSystems
                .handler(integration, {})
                .getDataAsync();
              return {
                integrationId: integration.id,
                integrationName: integration.name,
                systems: data,
                updatedAt: timestamp,
              };
            },
            {
              fallback: (integration, error) => ({
                integrationId: integration.id,
                integrationName: integration.name,
                systems: [],
                updatedAt: new Date(0),
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          );
          logger.debug("getSystems completed", {
            userId,
            integrationIds,
            resultCount: results.length,
            errorCount: results.filter((result) => "error" in result).length,
          });
          return results;
        }),
      getAlerts: manyWidgets(resources, query("widget.beszel.getAlerts"), "query", "beszelAlerts")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get Beszel alerts and optional alert history for all monitored systems. REQUIRED: integrationIds (array of Beszel integration IDs from integration_all). OPTIONAL: includeHistory (default true), maxHistoryItems (default 10)",
            },
          }),
        )
        .input(
          z.object({
            includeHistory: z.boolean().default(true),
            maxHistoryItems: z.number().min(1).max(100).default(10),
          }),
        )
        .handler(async ({ context, input }) => {
          const integrationIds = context.integrations.map(({ id }) => id);
          const userId = context.principal.kind === "authenticated" ? context.principal.user.id : undefined;
          logger.debug("getAlerts called", {
            userId,
            integrationIds,
            includeHistory: input.includeHistory,
            maxHistoryItems: input.maxHistoryItems,
          });
          const results = await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              const alerts = context.widgetLease.requests.beszelAlerts.handler(integration, {
                includeHistory: input.includeHistory,
                maxHistoryItems: input.maxHistoryItems,
              });
              const systems = context.widgetLease.requests.beszelSystems.handler(integration, {});
              const [alertsSettled, systemsSettled] = await Promise.allSettled([
                alerts.getDataAsync(),
                systems.getDataAsync(),
              ]);
              if (alertsSettled.status === "rejected") throw alertsSettled.reason;
              const systemNameMap: Record<string, string> = {};
              if (systemsSettled.status === "fulfilled")
                for (const system of systemsSettled.value.data) systemNameMap[system.id] = system.name;
              return {
                integrationId: integration.id,
                integrationName: integration.name,
                alerts: alertsSettled.value.data.alerts,
                history: alertsSettled.value.data.history,
                systemNameMap,
                updatedAt: alertsSettled.value.timestamp,
              };
            },
            {
              fallback: (integration, error) => ({
                integrationId: integration.id,
                integrationName: integration.name,
                alerts: [],
                history: [],
                systemNameMap: {},
                updatedAt: new Date(0),
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          );
          logger.debug("getAlerts completed", {
            userId,
            integrationIds,
            resultCount: results.length,
            errorCount: results.filter((result) => "error" in result).length,
          });
          return results;
        }),
      getSystemStats: manyWidgets(resources, query("widget.beszel.getSystemStats"), "query", "beszelSystemStats")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get historical Beszel system metrics (CPU, memory, disk, network, temperature) and optional Docker container stats. REQUIRED: integrationIds (pass the single integrationId from the beszel_getSystems entry containing the target system — only the first ID is used), systemId (from beszel_getSystems). OPTIONAL: timePeriod (1m/1h/12h/24h/1w/30d, default 1h), includeDocker (default true)",
            },
          }),
        )
        .input(
          z.object({
            systemId: z.string(),
            timePeriod: z.enum(["1m", "1h", "12h", "24h", "1w", "30d"]).default("1h"),
            includeDocker: z.boolean().default(true),
          }),
        )
        .handler(async ({ context, input }) => {
          const integration = context.integrations[0];
          if (!integration)
            throw new ORPCError("BAD_REQUEST", { message: "At least one Beszel integrationId is required" });
          const userId = context.principal.kind === "authenticated" ? context.principal.user.id : undefined;
          logger.debug("getSystemStats called", {
            userId,
            integrationId: integration.id,
            systemId: input.systemId,
            timePeriod: input.timePeriod,
            includeDocker: input.includeDocker,
          });
          try {
            const { data, timestamp } = await context.widgetLease.requests.beszelStats
              .handler(integration, {
                systemId: input.systemId,
                timePeriod: input.timePeriod,
                includeDocker: input.includeDocker,
              })
              .getDataAsync();
            logger.debug("getSystemStats completed", {
              userId,
              integrationId: integration.id,
              systemId: input.systemId,
            });
            return { integrationId: integration.id, ...data, updatedAt: timestamp };
          } catch (error) {
            logger.warn("getSystemStats failed", {
              userId,
              integrationId: integration.id,
              systemId: input.systemId,
              error,
            });
            return {
              integrationId: integration.id,
              systemStats: [],
              containerStats: [],
              updatedAt: new Date(0),
              error: toPublicIntegrationError(error),
            };
          }
        }),
      subscribeSystemStats: manyWidgets(
        resources,
        {
          path: "widget.beszel.subscribeSystemStats",
          kind: "subscription",
          access: { kind: "public" },
          demo: "guarded",
        },
        "query",
        "beszelSystemStats",
      )
        .input(z.object({ systemId: z.string() }))
        .handler(async function* ({ context, input }) {
          const integration = context.integrations[0];
          if (!integration)
            throw new ORPCError("BAD_REQUEST", { message: "At least one Beszel integrationId is required" });
          const queue = new BoundedAsyncQueue<LiveStatsEvent>(4);
          const controller = new AbortController();
          let emittedEventCount = 0;
          const stop = () => {
            controller.abort();
            void queue.return();
          };
          if (context.signal.aborted) return;
          context.signal.addEventListener("abort", stop, { once: true });
          context.onDispose(stop);
          const userId = context.principal.kind === "authenticated" ? context.principal.user.id : undefined;
          logger.debug("Beszel realtime subscription started", {
            userId,
            integrationIds: context.integrations.map(({ id }) => id),
            systemId: input.systemId,
          });
          try {
            const instance = await context.widgetLease.createIntegrationAsync(integration);
            if (controller.signal.aborted) return;
            void (async () => {
              try {
                if (typeof instance.subscribeRealtimeMetrics !== "function")
                  throw new ORPCError("METHOD_NOT_SUPPORTED", {
                    message: `Integration ${integration.kind} does not support realtime metrics`,
                  });
                await instance.subscribeRealtimeMetrics(
                  input.systemId,
                  (event) => {
                    emittedEventCount += 1;
                    if (emittedEventCount <= 2 || emittedEventCount % 60 === 0)
                      logger.debug("Forwarding Beszel realtime events", {
                        userId,
                        integrationId: integration.id,
                        systemId: input.systemId,
                        eventType: event.type,
                        emittedEventCount,
                        statsCount: Array.isArray(event.record.stats) ? event.record.stats.length : undefined,
                      });
                    queue.push(event);
                  },
                  controller.signal,
                );
                queue.close();
              } catch (error) {
                if (controller.signal.aborted) {
                  queue.close();
                  return;
                }
                logger.warn("Beszel realtime subscription failed", {
                  userId,
                  integrationId: integration.id,
                  systemId: input.systemId,
                  emittedEventCount,
                  error,
                });
                queue.fail(new ORPCError("BAD_GATEWAY", { message: "Live integration request failed", cause: error }));
              }
            })();
            for await (const event of queue) yield event;
          } finally {
            stop();
            context.signal.removeEventListener("abort", stop);
            logger.debug("Beszel realtime subscription stopped", {
              userId,
              integrationId: integration.id,
              systemId: input.systemId,
              emittedEventCount,
            });
          }
        }),
    },
    anchorNotes: {
      listNotes: oneWidget(resources, query("widget.anchorNotes.listNotes"), "query", "anchorNote")
        .input(anchorNotesListInputSchema)
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") {
            const search = input.search?.toLowerCase();
            return mock.anchorNotes
              .filter((note) => !search || note.title.toLowerCase().includes(search))
              .slice(0, input.limit ?? 50);
          }
          return (
            await context.widgetLease.requests.anchorNotesList
              .handler({ ...context.integration, kind: "anchor" }, { ...input, limit: input.limit ?? 50 })
              .getDataAsync()
          ).data;
        }),
      getNote: oneWidget(resources, query("widget.anchorNotes.getNote"), "query", "anchorNote")
        .input(z.object({ noteId: z.string() }))
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") {
            assertMockNoteExists(resources, input.noteId);
            return mock.anchorNote;
          }
          return (
            await context.widgetLease.requests.anchorNote
              .handler({ ...context.integration, kind: "anchor" }, { noteId: input.noteId })
              .getDataAsync()
          ).data;
        }),
      updateNote: oneWidget(resources, mutation("widget.anchorNotes.updateNote"), "interact", "anchorNote")
        .input(anchorNoteUpdateInputSchema)
        .handler(async ({ context, input }) => {
          const normalizedContent = normalizeAnchorContent(input.content);
          const isContentNormalized =
            input.content !== undefined && normalizedContent !== undefined && input.content !== normalizedContent;
          if (context.integration.kind === "mock") {
            assertMockNoteExists(resources, input.noteId);
            return {
              ...mock.anchorNote,
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(normalizedContent !== undefined ? { content: normalizedContent } : {}),
            };
          }
          const instance = await context.widgetLease.createIntegrationAsync({ ...context.integration, kind: "anchor" });
          try {
            const note = await instance.updateNoteAsync({
              noteId: input.noteId,
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(normalizedContent !== undefined ? { content: normalizedContent } : {}),
            });
            context.widgetLease.requests.anchorNotesList.invalidateCache();
            await context.widgetLease.requests.anchorNote.invalidateCacheAsync([context.integration.id]);
            return note;
          } catch (error) {
            if (error instanceof ResponseError && error.statusCode === 400)
              logger.warn("Anchor update note failed validation", {
                noteId: input.noteId,
                integrationId: context.integration.id,
                contentLength: input.content?.length ?? 0,
                contentIsJsonDelta: input.content ? isJsonDeltaString(input.content) : false,
                contentNormalized: isContentNormalized,
              });
            if (error instanceof ResponseError && error.statusCode === 403)
              throw new ORPCError("FORBIDDEN", { message: "You do not have permission to edit this note" });
            if (error instanceof ResponseError && error.statusCode === 404)
              throw new ORPCError("NOT_FOUND", { message: "Note not found" });
            throw error;
          }
        }),
    },
    coolify: {
      getInstancesInfo: manyWidgets(resources, query("widget.coolify.getInstancesInfo"), "query", "coolify").handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              if (integration.kind === "mock")
                return {
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integrationUrl: integration.url,
                  instanceInfo: mock.coolify,
                  updatedAt: new Date(mock.timestamp),
                };
              const { data, timestamp } = await context.widgetLease.requests.coolify
                .handler({ ...integration, kind: "coolify" }, {})
                .getDataAsync();
              return {
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                instanceInfo: data,
                updatedAt: timestamp,
              };
            },
            {
              fallback: (integration, error) => ({
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                instanceInfo: null,
                updatedAt: new Date(0),
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
    },
    immich: {
      getServerStats: oneWidget(
        resources,
        query("widget.immich.getServerStats"),
        "query",
        "immich-serverStats",
      ).handler(async ({ context }) => {
        if (context.integration.kind === "mock") return mock.immichStats;
        return (
          await context.widgetLease.requests.immichStats
            .handler({ ...context.integration, kind: "immich" }, {})
            .getDataAsync()
        ).data;
      }),
      getAlbum: oneWidget(resources, query("widget.immich.getAlbum"), "query", "immich-albumCarousel")
        .input(z.object({ albumId: z.string().optional() }))
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return mock.immichAlbum;
          return (
            await context.widgetLease.requests.immichAlbum
              .handler({ ...context.integration, kind: "immich" }, { albumId: input.albumId })
              .getDataAsync()
          ).data;
        }),
      getAlbumPreview: oneWidget(resources, query("widget.immich.getAlbumPreview"), "query", "immich-albumCarousel")
        .input(z.object({ albumId: z.string().min(1), randomizePhotos: z.boolean() }))
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock")
            return { ...mock.immichAlbum, assets: mock.immichAlbum.assets.slice(0, 1) };
          return (
            await context.widgetLease.requests.immichAlbumPreview
              .handler(
                { ...context.integration, kind: "immich" },
                { albumId: input.albumId, randomizePhotos: input.randomizePhotos },
              )
              .getDataAsync()
          ).data;
        }),
      getAlbums: oneWidget(resources, query("widget.immich.getAlbums"), "query", "immich-albumCarousel")
        .input(z.object({ limit: z.number().int().min(1).max(500).optional() }))
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock")
            return input.limit === undefined ? [...mock.immichAlbums] : mock.immichAlbums.slice(0, input.limit);
          return (
            await context.widgetLease.requests.immichAlbums
              .handler({ ...context.integration, kind: "immich" }, { limit: input.limit })
              .getDataAsync()
          ).data;
        }),
    },
    paperlessNgx: {
      getStats: oneWidget(resources, query("widget.paperlessNgx.getStats"), "query", "paperlessNgx").handler(
        async ({ context }) => {
          if (context.integration.kind === "mock") return mock.paperlessNgx;
          return (
            await context.widgetLease.requests.paperlessNgx
              .handler({ ...context.integration, kind: "paperlessNgx" }, {})
              .getDataAsync()
          ).data;
        },
      ),
    },
    patchmon: {
      getStats: oneWidget(resources, query("widget.patchmon.getStats", true), "query", "patchmon")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get PatchMon host patch statistics including total hosts, hosts needing updates, security update counts, up-to-date hosts, outdated packages, repositories, and OS distribution. REQUIRED: integrationId (single PatchMon integration ID from integration_all). Requires authenticated session (API key or browser login) and integration query access.",
            },
          }),
        )
        .handler(async ({ context }) => {
          if (context.integration.kind === "mock") return mock.patchmon;
          return (
            await context.widgetLease.requests.patchmon
              .handler({ ...context.integration, kind: "patchmon" }, {})
              .getDataAsync()
          ).data;
        }),
    },
    bazarr: {
      getBadges: oneWidget(resources, query("widget.bazarr.getBadges"), "query", "bazarr")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get missing subtitle counts, provider issues, and health warnings for a Bazarr integration. REQUIRED: integrationId from integration_all",
            },
          }),
        )
        .handler(async ({ context }) => {
          if (context.integration.kind === "mock") return mock.bazarr;
          return (
            await context.widgetLease.requests.bazarr
              .handler({ ...context.integration, kind: "bazarr" }, {})
              .getDataAsync()
          ).data;
        }),
    },
    notebook: {
      updateContent: authenticatedWidgetProcedure(resources, mutation("widget.notebook.updateContent"))
        .input(z.object({ itemId: z.string(), content: z.string(), boardId: z.string() }))
        .handler(async ({ context, input }) => {
          await boardAccess(context, resources, input.boardId, "modify");
          const item = await context.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
          if (item?.boardId !== input.boardId)
            throw new ORPCError("NOT_FOUND", { message: "Specified item was not found" });
          const options = SuperJSON.parse<{ content: string }>(item.options);
          options.content = input.content;
          await context.db
            .update(items)
            .set({ options: SuperJSON.stringify(options) })
            .where(eq(items.id, input.itemId));
        }),
    },
    weather: {
      atLocation: widgetProcedure(resources, query("widget.weather.atLocation"))
        .input(atLocationInput)
        .handler(async ({ context, input }) => {
          if (resources.noExternalConnection) return null;
          return (await context.widgetLease.requests.weather.handler(input).getDataAsync()).data;
        }),
    },
    airQuality: {
      atLocation: widgetProcedure(resources, query("widget.airQuality.atLocation"))
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get current and forecast air quality, UV, pollutant, and pollen data for geographic coordinates. REQUIRED: latitude (-90 to 90) and longitude (-180 to 180).",
            },
          }),
        )
        .input(atLocationInput)
        .handler(async ({ context, input }) => {
          if (resources.noExternalConnection) return null;
          return (await context.widgetLease.requests.airQuality.handler(input).getDataAsync()).data;
        }),
    },
    app: {
      ping: widgetProcedure(resources, query("widget.app.ping"))
        .input(z.object({ id: z.string() }))
        .handler(async ({ context, input }) => {
          const settings = await resources.getServerSettingByKeyAsync(context.db, "board");
          if (settings.forceDisableStatus)
            throw new ORPCError("FORBIDDEN", { message: "Ping functionality is disabled by server settings" });
          let canSee = context.principal.kind === "authenticated";
          if (!canSee) {
            const placed = await context.db.query.items.findMany({
              where: or(eq(items.kind, "app"), eq(items.kind, "bookmarks")),
              with: { board: { columns: { isPublic: true } } },
            });
            const appIds = placed
              .filter((item) => item.board.isPublic)
              .flatMap((item) =>
                item.kind === "app"
                  ? [SuperJSON.parse<{ appId: string }>(item.options).appId]
                  : SuperJSON.parse<{ items: string[] }>(item.options).items,
              );
            canSee = appIds.includes(input.id);
          }
          const matchingApps = await context.db.query.apps.findMany({
            where: inArray(resources.tables.apps.id, [input.id]),
          });
          const app = canSee ? matchingApps[0] : undefined;
          if (!app) throw new ORPCError("NOT_FOUND", { message: "App not found" });
          const url = app.pingUrl ?? app.href;
          if (!url) throw new ORPCError("CONFLICT", { message: "No URL to ping configured for this app" });
          return { url, ...(await context.widgetLease.sendPingRequestAsync(url)) };
        }),
    },
    dnsHole: {
      summary: manyWidgets(resources, query("widget.dnsHole.summary"), "query", "dnsHoleSummary")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get DNS blocking statistics from Pi-hole/AdGuard (queries, blocked, percentage). REQUIRED: integrationIds (array of Pi-hole/AdGuard integration IDs from integration_all)",
            },
          }),
        )
        .handler(
          async ({ context }) =>
            await settleIntegrationQueries(
              resources,
              context.integrations,
              async (integration) => {
                const { data, timestamp } = await context.widgetLease.requests.dnsHole
                  .handler(integration, {})
                  .getDataAsync();
                return {
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integration: {
                    id: integration.id,
                    name: integration.name,
                    kind: integration.kind,
                    updatedAt: timestamp,
                  },
                  summary: data,
                };
              },
              {
                fallback: (integration) => ({
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integration: { id: integration.id, name: integration.name, kind: integration.kind },
                  summary: null,
                  error: PUBLIC_INTEGRATION_ERROR,
                }),
                throwOnAllFailures: true,
              },
            ),
        ),
      enable: oneWidget(resources, mutation("widget.dnsHole.enable"), "interact", "dnsHoleControls")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Enable DNS blocking on Pi-hole/AdGuard. REQUIRED: integrationId (single Pi-hole/AdGuard integration ID from integration_all)",
            },
          }),
        )
        .handler(async ({ context }) => {
          const client = await context.widgetLease.createIntegrationAsync(context.integration);
          await client.enableAsync();
          await context.widgetLease.requests.dnsHole.invalidateCacheAsync([context.integration.id]);
        }),
      disable: oneWidget(resources, mutation("widget.dnsHole.disable"), "interact", "dnsHoleControls")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Disable DNS blocking on Pi-hole/AdGuard. REQUIRED: integrationId (single integration ID). OPTIONAL: duration (number of seconds for temporary disable — omit for permanent disable)",
            },
          }),
        )
        .input(z.object({ duration: z.number().optional() }))
        .handler(async ({ context, input }) => {
          const client = await context.widgetLease.createIntegrationAsync(context.integration);
          await client.disableAsync(input.duration);
          await context.widgetLease.requests.dnsHole.invalidateCacheAsync([context.integration.id]);
        }),
    },
    smartHome: {
      entityState: oneWidget(resources, query("widget.smartHome.entityState"), "query", "smartHome-entityState")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get the current state of a Home Assistant entity (light, switch, sensor, etc.). REQUIRED: integrationId (Home Assistant integration ID from integration_all), entityId (e.g. 'light.living_room', 'switch.fan')",
            },
          }),
        )
        .input(z.object({ entityId: z.string() }))
        .handler(
          async ({ context, input }) =>
            (
              await context.widgetLease.requests.smartHome
                .handler(context.integration, { entityId: input.entityId })
                .getDataAsync()
            ).data.state,
        ),
      entityDetails: oneWidget(resources, query("widget.smartHome.entityDetails"), "query", "smartHome-entityState")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get the state, attributes, and update timestamps for a Home Assistant entity. REQUIRED: integrationId (Home Assistant integration ID), entityId (for example 'sensor.temperature')",
            },
          }),
        )
        .input(z.object({ entityId: z.string() }))
        .handler(async ({ context, input }) =>
          resources.toSafeEntityDetails(
            (
              await context.widgetLease.requests.smartHome
                .handler(context.integration, { entityId: input.entityId })
                .getDataAsync()
            ).data,
          ),
        ),
      switchEntity: oneWidget(resources, mutation("widget.smartHome.switchEntity"), "interact", "smartHome-entityState")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Toggle a Home Assistant entity (turn on/off a light, switch, etc.). REQUIRED: integrationId (Home Assistant integration ID from integration_all), entityId (e.g. 'light.living_room')",
            },
          }),
        )
        .input(z.object({ entityId: z.string() }))
        .handler(async ({ context, input }) => {
          const client = await context.widgetLease.createIntegrationAsync(context.integration);
          if (!(await client.triggerToggleAsync(input.entityId)))
            throw new ORPCError("BAD_GATEWAY", { message: "Home Assistant did not toggle the entity" });
          await context.widgetLease.requests.smartHome.invalidateCacheAsync([context.integration.id]);
          return true;
        }),
      executeAutomation: oneWidget(
        resources,
        mutation("widget.smartHome.executeAutomation"),
        "interact",
        "smartHome-executeAutomation",
      )
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Trigger a Home Assistant automation by its ID. REQUIRED: integrationId (Home Assistant integration ID from integration_all), automationId (the automation entity ID)",
            },
          }),
        )
        .input(z.object({ automationId: z.string() }))
        .handler(async ({ context, input }) => {
          const client = await context.widgetLease.createIntegrationAsync(context.integration);
          if (!(await client.triggerAutomationAsync(input.automationId)))
            throw new ORPCError("BAD_GATEWAY", { message: "Home Assistant did not execute the automation" });
          await context.widgetLease.requests.smartHome.invalidateCacheAsync([context.integration.id]);
          return true;
        }),
    },
    stockPrice: {
      getPriceHistory: widgetProcedure(resources, query("widget.stockPrice.getPriceHistory"))
        .input(
          z.object({
            stock: z.string().nonempty(),
            timeRange: z.enum(resources.stockPriceTimeFrames.range),
            timeInterval: z.enum(resources.stockPriceTimeFrames.interval),
          }),
        )
        .handler(
          async ({ context, input }) =>
            await context.widgetLease.requests.stockPrice
              .handler({ stock: input.stock, timeRange: input.timeRange, timeInterval: input.timeInterval })
              .getDataAsync(),
        ),
    },
    mediaServer: {
      getCurrentStreams: manyWidgets(resources, query("widget.mediaServer.getCurrentStreams"), "query", "mediaServer")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get currently active streams from Plex/Jellyfin/Emby/Navidrome media servers. REQUIRED: integrationIds (array of media server integration IDs from integration_all), showOnlyPlaying (boolean — true to filter to actively playing streams only)",
            },
          }),
        )
        .input(z.object({ showOnlyPlaying: z.boolean() }))
        .handler(
          async ({ context, input }) =>
            await settleIntegrationQueries(
              resources,
              context.integrations,
              async (integration) => {
                const { data } = await context.widgetLease.requests.mediaServer
                  .handler(integration, { showOnlyPlaying: input.showOnlyPlaying })
                  .getDataAsync();
                return {
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integrationKind: integration.kind,
                  sessions: data,
                  error: undefined,
                };
              },
              {
                fallback: (integration) => ({
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integrationKind: integration.kind,
                  sessions: [],
                  error: PUBLIC_INTEGRATION_ERROR,
                }),
                throwOnAllFailures: true,
              },
            ),
        ),
    },
    mediaRelease: {
      getMediaReleases: manyWidgets(
        resources,
        query("widget.mediaRelease.getMediaReleases"),
        "query",
        "mediaReleases",
      ).handler(async ({ context }) => {
        const results = await settleIntegrationQueries(
          resources,
          context.integrations,
          async (integration) => {
            const { data, timestamp } = await context.widgetLease.requests.mediaRelease
              .handler(integration, {})
              .getDataAsync();
            return {
              integration: { id: integration.id, name: integration.name, kind: integration.kind, updatedAt: timestamp },
              releases: data,
              error: undefined,
            };
          },
          {
            fallback: (integration) => ({
              integration: { id: integration.id, name: integration.name, kind: integration.kind },
              releases: [],
              error: PUBLIC_INTEGRATION_ERROR,
            }),
            throwOnAllFailures: true,
          },
        );
        return {
          releases: results.flatMap(({ integration, releases }) =>
            releases.map((release) => ({ ...release, integration })),
          ),
          failedIntegrations: results.flatMap(({ integration, error }) =>
            error ? [{ integrationId: integration.id, integrationName: integration.name, error }] : [],
          ),
        };
      }),
    },
    calendar: {
      findAllEvents: manyWidgets(resources, query("widget.calendar.findAllEvents"), "query", "calendar")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get calendar events from calendar-capable integrations. REQUIRED: integrationIds (IDs from integration_all whose kinds include Sonarr, Radarr, Lidarr, Readarr, Home Assistant, Nextcloud, or iCal), year (four-digit number), month (human month number from 1=January through 12=December), releaseType (Radarr filters: 'inCinemas'|'digitalRelease'|'physicalRelease'), showUnmonitored (boolean). Great for 'what's coming out this week/month?'",
            },
          }),
        )
        .input(
          z.object({
            year: z.number().int().min(1970).max(9999),
            month: z.number().int().min(1).max(12),
            releaseType: z.array(z.enum(radarrReleaseTypes)),
            showUnmonitored: z.boolean(),
          }),
        )
        .handler(
          async ({ context, input }) =>
            await settleIntegrationQueries(
              resources,
              context.integrations,
              async (integration) => {
                const { integrationIds: _ids, ...handlerInput } = input;
                const { data } = await context.widgetLease.requests.calendar
                  .handler(integration, handlerInput)
                  .getDataAsync();
                const events = data.filter(
                  (event) =>
                    event.metadata?.type !== "radarr" || input.releaseType.includes(event.metadata.releaseType),
                );
                return {
                  events,
                  integration: { id: integration.id, name: integration.name, kind: integration.kind },
                  error: undefined,
                };
              },
              {
                fallback: (integration) => ({
                  events: [],
                  integration: { id: integration.id, name: integration.name, kind: integration.kind },
                  error: PUBLIC_INTEGRATION_ERROR,
                }),
                throwOnAllFailures: true,
              },
            ),
        ),
    },
    downloads: {
      getJobsAndStatuses: manyWidgets(resources, query("widget.downloads.getJobsAndStatuses"), "query", "downloads")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get active download jobs and queue status from connected download clients (qBittorrent, SABnzbd, Transmission, Deluge, NZBGet). REQUIRED: integrationIds (array of download client integration IDs from integration_all). OPTIONAL: limitPerIntegration (number, default 50). For SABnzbd, includeArchivedHistory includes archived jobs when true and defaults to false; historyWindowDays is a positive whole number of days and defaults to 7. Archived history is scanned in pages of 100, up to 100 pages.",
            },
          }),
        )
        .input(
          z.object({
            limitPerIntegration: z.number().default(50),
            includeArchivedHistory: z.boolean().default(false),
            historyWindowDays: z.number().int().min(1).default(7),
          }),
        )
        .handler(
          async ({ context, input }) =>
            await settleIntegrationQueries(
              resources,
              context.integrations,
              async (integration) => {
                const { data, timestamp } = await context.widgetLease.requests.downloads
                  .handler(integration, {
                    limit: input.limitPerIntegration,
                    includeArchivedHistory: input.includeArchivedHistory,
                    historyWindowDays: input.historyWindowDays,
                  })
                  .getDataAsync();
                return {
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integration: {
                    id: integration.id,
                    name: integration.name,
                    kind: integration.kind,
                    updatedAt: timestamp,
                  },
                  data,
                  error: undefined,
                };
              },
              {
                fallback: (integration) => ({
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integration: { id: integration.id, name: integration.name, kind: integration.kind },
                  data: null,
                  error: PUBLIC_INTEGRATION_ERROR,
                }),
                throwOnAllFailures: true,
              },
            ),
        ),
      pause: manyWidgets(resources, mutation("widget.downloads.pause"), "interact", "downloads")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Pause all download queues across connected download clients. REQUIRED: integrationIds (array of download client integration IDs from integration_all)",
            },
          }),
        )
        .handler(async ({ context }) => {
          const results = await Promise.allSettled(
            context.integrations.map(async (integration) => {
              const instance = await context.widgetLease.createIntegrationAsync(integration);
              await instance.pauseQueueAsync();
            }),
          );
          await context.widgetLease.requests.downloads.invalidateCacheAsync(context.integrations.map(({ id }) => id));
          const failure = results.find((result) => result.status === "rejected");
          if (failure) throw failure.reason;
        }),
      pauseItem: manyWidgets(resources, mutation("widget.downloads.pauseItem"), "interact", "downloads")
        .input(z.object({ item: downloadClientItemSchema }))
        .handler(async ({ context, input }) => {
          const results = await Promise.allSettled(
            context.integrations.map(async (integration) => {
              const instance = await context.widgetLease.createIntegrationAsync(integration);
              await instance.pauseItemAsync(input.item);
            }),
          );
          await context.widgetLease.requests.downloads.invalidateCacheAsync(context.integrations.map(({ id }) => id));
          const failure = results.find((result) => result.status === "rejected");
          if (failure) throw failure.reason;
        }),
      resume: manyWidgets(resources, mutation("widget.downloads.resume"), "interact", "downloads")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Resume all download queues across connected download clients. REQUIRED: integrationIds (array of download client integration IDs from integration_all)",
            },
          }),
        )
        .handler(async ({ context }) => {
          const results = await Promise.allSettled(
            context.integrations.map(async (integration) => {
              const instance = await context.widgetLease.createIntegrationAsync(integration);
              await instance.resumeQueueAsync();
            }),
          );
          await context.widgetLease.requests.downloads.invalidateCacheAsync(context.integrations.map(({ id }) => id));
          const failure = results.find((result) => result.status === "rejected");
          if (failure) throw failure.reason;
        }),
      resumeItem: manyWidgets(resources, mutation("widget.downloads.resumeItem"), "interact", "downloads")
        .input(z.object({ item: downloadClientItemSchema }))
        .handler(async ({ context, input }) => {
          const results = await Promise.allSettled(
            context.integrations.map(async (integration) => {
              const instance = await context.widgetLease.createIntegrationAsync(integration);
              await instance.resumeItemAsync(input.item);
            }),
          );
          await context.widgetLease.requests.downloads.invalidateCacheAsync(context.integrations.map(({ id }) => id));
          const failure = results.find((result) => result.status === "rejected");
          if (failure) throw failure.reason;
        }),
      deleteItem: manyWidgets(resources, mutation("widget.downloads.deleteItem"), "interact", "downloads")
        .input(z.object({ item: downloadClientItemSchema, fromDisk: z.boolean() }))
        .handler(async ({ context, input }) => {
          const results = await Promise.allSettled(
            context.integrations.map(async (integration) => {
              const instance = await context.widgetLease.createIntegrationAsync(integration);
              await instance.deleteItemAsync(input.item, input.fromDisk);
            }),
          );
          await context.widgetLease.requests.downloads.invalidateCacheAsync(context.integrations.map(({ id }) => id));
          const failure = results.find((result) => result.status === "rejected");
          if (failure) throw failure.reason;
        }),
    },
    mediaRequests: {
      getLatestRequests: manyWidgets(
        resources,
        query("widget.mediaRequests.getLatestRequests"),
        "query",
        "mediaRequests-requestList",
      )
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get latest media requests from Overseerr/Jellyseerr with their status (pending, approved, declined, failed, completed). REQUIRED: integrationIds (array of Overseerr/Jellyseerr integration IDs from integration_all). OPTIONAL: statuses (array of statuses to include, must be non-empty) and recentDays (number 0-365; 0 disables the time filter).",
            },
          }),
        )
        .input(resources.mediaRequestListInputSchema)
        .handler(async ({ context, input }) => {
          const results = await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              const { data } = await context.widgetLease.requests.mediaRequestList
                .handler(integration, input)
                .getDataAsync();
              return {
                integration: { id: integration.id, name: integration.name, kind: integration.kind },
                data,
                error: undefined,
              };
            },
            {
              fallback: (integration) => ({
                integration: { id: integration.id, name: integration.name, kind: integration.kind },
                data: [],
                error: PUBLIC_INTEGRATION_ERROR,
              }),
              throwOnAllFailures: true,
            },
          );
          const requests = results
            .flatMap(({ data, integration }) =>
              data.map((request) => ({ ...request, integrationId: integration.id, integration })),
            )
            .toSorted((a, b) =>
              a.status === b.status
                ? b.createdAt.getTime() - a.createdAt.getTime()
                : mediaRequestStatusConfiguration[a.status].position -
                  mediaRequestStatusConfiguration[b.status].position,
            );
          return {
            requests,
            failedIntegrations: results.flatMap(({ integration, error }) =>
              error ? [{ integrationId: integration.id, integrationName: integration.name, error }] : [],
            ),
          };
        }),
      getStats: manyWidgets(resources, query("widget.mediaRequests.getStats"), "query", "mediaRequests-requestStats")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get media request statistics including total counts and top requesters. REQUIRED: integrationIds (array of Overseerr/Jellyseerr integration IDs from integration_all)",
            },
          }),
        )
        .handler(async ({ context }) => {
          const results = await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              const { data } = await context.widgetLease.requests.mediaRequestStats
                .handler(integration, {})
                .getDataAsync();
              return {
                integration: { id: integration.id, name: integration.name, kind: integration.kind },
                data,
                error: undefined,
              };
            },
            {
              fallback: (integration) => ({
                integration: { id: integration.id, name: integration.name, kind: integration.kind },
                data: { stats: null, users: [] },
                error: PUBLIC_INTEGRATION_ERROR,
              }),
              throwOnAllFailures: true,
            },
          );
          return {
            stats: results.flatMap((result) => (result.data.stats ? [result.data.stats] : [])),
            users: results
              .flatMap((result) => result.data.users.map((user) => ({ ...user, integration: result.integration })))
              .toSorted(({ requestCount: a }, { requestCount: b }) => b - a),
            integrations: results.map((result) => result.integration),
            failedIntegrations: results.flatMap(({ integration, error }) =>
              error ? [{ integrationId: integration.id, integrationName: integration.name, error }] : [],
            ),
          };
        }),
      answerRequest: oneWidget(
        resources,
        mutation("widget.mediaRequests.answerRequest"),
        "interact",
        "mediaRequests-requestList",
      )
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Approve or decline a pending media request. REQUIRED: integrationId (single Overseerr/Jellyseerr integration ID), requestId (number from getLatestRequests), answer ('approve' or 'decline')",
            },
          }),
        )
        .input(z.object({ requestId: z.number(), answer: z.enum(["approve", "decline"]) }))
        .handler(async ({ context, input }) => {
          const instance = await context.widgetLease.createIntegrationAsync(context.integration);
          const actions = {
            approve: (id: number) => instance.approveRequestAsync(id),
            decline: (id: number) => instance.declineRequestAsync(id),
          };
          await actions[input.answer](input.requestId);
          context.widgetLease.requests.mediaRequestList.invalidateCache();
          await context.widgetLease.requests.mediaRequestStats.invalidateCacheAsync([context.integration.id]);
          return { success: true };
        }),
    },
    mediaOrganizer: {
      getData: manyWidgets(resources, query("widget.mediaOrganizer.getData"), "query", "mediaMissing")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get missing and queued movies/episodes from Radarr and Sonarr. Requires query (use) access to each integration. REQUIRED: integrationIds (array of Radarr/Sonarr integration IDs from integration_all). OPTIONAL: pageSize (1-50, default 10)",
            },
          }),
        )
        .input(z.object({ pageSize: z.number().min(1).max(50).default(10) }))
        .handler(
          async ({ context, input }) =>
            await settleIntegrationQueries(
              resources,
              context.integrations,
              async (integration) => {
                const { data } = await context.widgetLease.requests.mediaOrganizer
                  .handler(integration, { pageSize: input.pageSize })
                  .getDataAsync();
                return { integrationId: integration.id, integrationName: integration.name, ...data, error: undefined };
              },
              {
                fallback: (integration, error) => ({
                  integrationId: integration.id,
                  integrationName: integration.name,
                  missing: [],
                  missingCount: 0,
                  queued: [],
                  queuedCount: 0,
                  error: toPublicIntegrationError(error),
                }),
                throwOnAllFailures: true,
              },
            ),
        ),
    },
    rssFeed: {
      getFeeds: widgetProcedure(resources, query("widget.rssFeed.getFeeds"))
        .input(
          z.object({
            urls: z.array(z.string()).max(100),
            maximumAmountPosts: z.number(),
            descriptionMaxLength: z.number().int().min(1).max(5000).default(250),
          }),
        )
        .handler(async ({ context, input }) => {
          if (resources.noExternalConnection) return { entries: [], failedFeedCount: 0 };
          const urls = (await canAccessAllFeedsAsync(context, resources))
            ? input.urls
            : await restrictUrlsAsync(context, resources, input.urls);
          const settled = await Promise.allSettled(
            urls.map(
              async (url) =>
                await context.widgetLease.requests.rssFeeds
                  .handler({ url, count: input.maximumAmountPosts, descriptionMaxLength: input.descriptionMaxLength })
                  .getDataAsync(),
            ),
          );
          const failures = settled.filter((result) => result.status === "rejected");
          settled.forEach((result, index) => {
            if (result.status === "rejected")
              logger.warn("RSS feed fetch failed", {
                ...safeFeedLogContext(urls[index] ?? "", index),
                errorType: result.reason instanceof Error ? result.reason.name : typeof result.reason,
                errorMessage:
                  result.reason instanceof Error ? redactFeedFailureMessage(result.reason.message) : undefined,
              });
          });
          if (settled.length > 0 && failures.length === settled.length)
            throw new ORPCError("BAD_GATEWAY", { message: "All RSS feed requests failed" });
          return {
            entries: settled
              .flatMap((result) => (result.status === "fulfilled" ? result.value.data.entries : []))
              .toSorted((a, b) =>
                a.published && b.published ? new Date(b.published).getTime() - new Date(a.published).getTime() : 0,
              )
              .slice(0, input.maximumAmountPosts),
            failedFeedCount: failures.length,
          };
        }),
    },
    indexerManager: {
      getIndexersStatus: manyWidgets(
        resources,
        query("widget.indexerManager.getIndexersStatus"),
        "query",
        "indexerManager",
      ).handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              const { data } = await context.widgetLease.requests.indexerManager
                .handler(integration, {})
                .getDataAsync();
              return {
                integrationId: integration.id,
                integrationName: integration.name,
                indexers: data,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integrationId: integration.id,
                integrationName: integration.name,
                indexers: [],
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
      testAllIndexers: manyWidgets(
        resources,
        mutation("widget.indexerManager.testAllIndexers"),
        "interact",
        "indexerManager",
      ).handler(async ({ context }) => {
        const results = await Promise.allSettled(
          context.integrations.map(async (integration) => {
            const client = await context.widgetLease.createIntegrationAsync(integration);
            await client.testAllAsync().catch((cause: unknown) => {
              throw new ORPCError("INTERNAL_SERVER_ERROR", {
                message: `Failed to test all indexers for ${integration.name} (${integration.id})`,
                cause,
              });
            });
          }),
        );
        await context.widgetLease.requests.indexerManager.invalidateCacheAsync(
          context.integrations.map(({ id }) => id),
        );
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
      }),
    },
    healthMonitoring: {
      getSystemHealthStatus: manyIntegrations(
        resources,
        query("widget.healthMonitoring.getSystemHealthStatus"),
        "query",
        healthMonitoringSystemIntegrationKinds,
      )
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get system health status (CPU, memory, disk, network) from NAS/server monitoring integrations. REQUIRED: integrationIds (array of TrueNAS/Synology/Unraid/Glances/OpenMediaVault/DashDot integration IDs from integration_all)",
            },
          }),
        )
        .handler(
          async ({ context }) =>
            await settleIntegrationQueries(
              resources,
              context.integrations,
              async (integration) => {
                const { data, timestamp } = await context.widgetLease.requests.systemInfo
                  .handler(integration, {})
                  .getDataAsync();
                return {
                  integrationId: integration.id,
                  integrationName: integration.name,
                  healthInfo: data,
                  updatedAt: timestamp,
                };
              },
              {
                fallback: (integration) => ({
                  integrationId: integration.id,
                  integrationName: integration.name,
                  healthInfo: null,
                  error: PUBLIC_INTEGRATION_ERROR,
                }),
                throwOnAllFailures: true,
              },
            ),
        ),
      listStorageVolumes: oneIntegration(resources, query("widget.healthMonitoring.listStorageVolumes"), "query", [
        "synology",
        "openmediavault",
      ])
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "List storage volumes from a Synology DiskStation or OpenMediaVault integration for widget configuration. REQUIRED: integrationId from integration_all (Synology or OpenMediaVault integration only). The caller needs query permission for that integration.",
            },
          }),
        )
        .handler(async ({ context }) => {
          const instance = await context.widgetLease.createIntegrationAsync(context.integration);
          return await instance.listStorageVolumesAsync();
        }),
      getClusterHealthStatus: oneIntegration(
        resources,
        query("widget.healthMonitoring.getClusterHealthStatus"),
        "query",
        healthMonitoringClusterIntegrationKinds,
      )
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get Proxmox cluster health status including nodes, VMs, and resource usage. REQUIRED: integrationId (single Proxmox integration ID from integration_all)",
            },
          }),
        )
        .handler(
          async ({ context }) =>
            (await context.widgetLease.requests.clusterInfo.handler(context.integration, {}).getDataAsync()).data,
        ),
    },
    mediaTranscoding: {
      getDataAsync: oneWidget(resources, query("widget.mediaTranscoding.getDataAsync"), "query", "mediaTranscoding")
        .input(paginatedSchema.pick({ page: true, pageSize: true }))
        .handler(async ({ context, input }) => {
          const { data } = await context.widgetLease.requests.mediaTranscoding
            .handler(context.integration, { pageOffset: (input.page - 1) * input.pageSize, pageSize: input.pageSize })
            .getDataAsync();
          return { integrationId: context.integration.id, data };
        }),
    },
    minecraft: {
      getServerStatus: widgetProcedure(resources, query("widget.minecraft.getServerStatus"))
        .input(z.object({ domain: z.string().nonempty(), isBedrockServer: z.boolean() }))
        .handler(
          async ({ context, input }) =>
            await context.widgetLease.requests.minecraft
              .handler({ isBedrockServer: input.isBedrockServer, domain: input.domain })
              .getDataAsync(),
        ),
    },
    options: {
      getWidgetOptionSettings: widgetProcedure(resources, query("widget.options.getWidgetOptionSettings")).handler(
        async ({ context }) => {
          const settings = await resources.getServerSettingsAsync(context.db);
          return {
            server: {
              board: {
                enableStatusByDefault: settings.board.enableStatusByDefault,
                forceDisableStatus: settings.board.forceDisableStatus,
              },
            },
          };
        },
      ),
      saveItemOptions: authenticatedWidgetProcedure(resources, mutation("widget.options.saveItemOptions"))
        .input(z.object({ itemId: z.string(), boardId: z.string(), newOptions: z.record(z.string(), z.unknown()) }))
        .handler(async ({ context, input }) => {
          await boardAccess(context, resources, input.boardId, "modify");
          const item = await context.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
          if (item?.boardId !== input.boardId)
            throw new ORPCError("NOT_FOUND", { message: "Specified item was not found" });
          const previous = SuperJSON.parse<Record<string, unknown>>(item.options);
          const updated = { ...previous, ...input.newOptions };
          if (item.kind === "timetable") await validateTimetableOptionsChangeAsync(context, updated, previous);
          assertPlacementChangeAllowed(
            context.principal.kind === "authenticated" && context.principal.user.permissions.includes("admin"),
            item,
            previous,
            updated,
          );
          await context.db
            .update(items)
            .set({ options: SuperJSON.stringify(updated) })
            .where(eq(items.id, input.itemId));
        }),
    },
    releases: {
      getLatest: widgetProcedure(resources, query("widget.releases.getLatest"))
        .input(
          z.object({
            itemId: z.string().optional(),
            repositories: z.array(
              z.object({
                id: z.string().optional(),
                provider: z.enum(releaseProviderKinds),
                identifier: z.string(),
                versionFilter: releaseVersionFilterSchema.optional(),
                providerUrl: z.string().url().optional(),
              }),
            ),
          }),
        )
        .handler(async ({ context, input }) => {
          const tokens = new Map<string, string>();
          const saved = new Map<string, { providerUrl?: string }>();
          if (input.itemId) {
            try {
              const item = await context.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
              if (item && item.kind === "releases") {
                await boardAccess(context, resources, item.boardId, "view");
                const options = SuperJSON.parse<{
                  repositories?: Array<{ provider?: string; identifier: string; providerUrl?: string }>;
                }>(item.options);
                const repos = options.repositories;
                if (repos)
                  for (const repo of repos) {
                    if (repo.provider && repo.identifier)
                      saved.set(`${repo.provider}:${repo.identifier}`, {
                        providerUrl: repo.providerUrl,
                      });
                  }
                const secrets = await context.db.query.widgetSecrets.findMany({
                  where: eq(widgetSecrets.itemId, input.itemId),
                });
                for (const secret of secrets) {
                  try {
                    tokens.set(secret.kind, resources.codec.decryptSecret(secret.value));
                  } catch (error) {
                    logger.warn("Failed to decrypt widget secret", { itemId: input.itemId, kind: secret.kind, error });
                  }
                }
              }
            } catch (error) {
              logger.warn("Failed to load release widget tokens", { itemId: input.itemId, error });
            }
          }
          return await Promise.all(
            input.repositories.map(async (repository) => {
              const id = repository.id ?? repository.identifier;
              const savedRepo = saved.get(`${repository.provider}:${repository.identifier}`);
              try {
                const response = await context.widgetLease.requests.releases
                  .handler({
                    id,
                    provider: repository.provider,
                    identifier: repository.identifier,
                    versionRegex: formatVersionFilterRegex(repository.versionFilter),
                    providerUrl: savedRepo?.providerUrl ?? repository.providerUrl,
                    token: savedRepo ? tokens.get(repository.provider) : undefined,
                  })
                  .getDataAsync();
                const data = response.data.success
                  ? response.data
                  : {
                      success: false as const,
                      error: { code: response.data.error.code, message: "Release provider request failed" },
                    };
                if (!response.data.success)
                  logger.warn("Release provider request failed", {
                    repositoryId: id,
                    provider: repository.provider,
                    error: response.data.error,
                  });
                return { id, provider: repository.provider, timestamp: response.timestamp, ...data };
              } catch (error) {
                logger.warn("Release provider request failed", {
                  repositoryId: id,
                  provider: repository.provider,
                  error,
                });
                return {
                  id,
                  provider: repository.provider,
                  timestamp: new Date(),
                  success: false as const,
                  error: { code: "unexpected" as const, message: "Release provider request failed" },
                };
              }
            }),
          );
        }),
    },
    networkController: {
      summary: manyWidgets(
        resources,
        query("widget.networkController.summary"),
        "query",
        "networkControllerSummary",
      ).handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              const { data, timestamp } = await context.widgetLease.requests.networkController
                .handler(integration, {})
                .getDataAsync();
              return {
                integrationId: integration.id,
                integrationName: integration.name,
                integration: { id: integration.id, name: integration.name, kind: integration.kind },
                summary: data,
                updatedAt: timestamp,
              };
            },
            {
              fallback: (integration) => ({
                integrationId: integration.id,
                integrationName: integration.name,
                integration: { id: integration.id, name: integration.name, kind: integration.kind },
                summary: null,
                error: PUBLIC_INTEGRATION_ERROR,
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
    },
    firewall: {
      getFirewallCpuStatus: manyWidgets(
        resources,
        query("widget.firewall.getFirewallCpuStatus"),
        "query",
        "firewall",
      ).handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              if (integration.kind === "mock")
                return {
                  integration: {
                    id: integration.id,
                    name: integration.name,
                    kind: integration.kind,
                    updatedAt: new Date(mock.timestamp),
                  },
                  summary: mock.firewallCpu,
                  error: undefined,
                };
              const { data, timestamp } = await context.widgetLease.requests.firewallCpu
                .handler({ ...integration, kind: "opnsense" }, {})
                .getDataAsync();
              return {
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: timestamp,
                },
                summary: data,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: new Date(0),
                },
                summary: { total: 0 },
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
      getFirewallInterfacesStatus: manyWidgets(
        resources,
        query("widget.firewall.getFirewallInterfacesStatus"),
        "query",
        "firewall",
      ).handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              if (integration.kind === "mock")
                return {
                  integration: {
                    id: integration.id,
                    name: integration.name,
                    kind: integration.kind,
                    updatedAt: new Date(mock.timestamp),
                  },
                  summary: mock.firewallInterfaces,
                  error: undefined,
                };
              const { data, timestamp } = await context.widgetLease.requests.firewallInterfaces
                .handler({ ...integration, kind: "opnsense" }, {})
                .getDataAsync();
              return {
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: timestamp,
                },
                summary: data,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: new Date(0),
                },
                summary: [],
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
      getFirewallVersionStatus: manyWidgets(
        resources,
        query("widget.firewall.getFirewallVersionStatus"),
        "query",
        "firewall",
      ).handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              if (integration.kind === "mock")
                return {
                  integration: {
                    id: integration.id,
                    name: integration.name,
                    kind: integration.kind,
                    updatedAt: new Date(mock.timestamp),
                  },
                  summary: mock.firewallVersion,
                  error: undefined,
                };
              const { data, timestamp } = await context.widgetLease.requests.firewallVersion
                .handler({ ...integration, kind: "opnsense" }, {})
                .getDataAsync();
              return {
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: timestamp,
                },
                summary: data,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: new Date(0),
                },
                summary: { version: "Unknown" },
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
      getFirewallMemoryStatus: manyWidgets(
        resources,
        query("widget.firewall.getFirewallMemoryStatus"),
        "query",
        "firewall",
      ).handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              if (integration.kind === "mock")
                return {
                  integration: {
                    id: integration.id,
                    name: integration.name,
                    kind: integration.kind,
                    updatedAt: new Date(mock.timestamp),
                  },
                  summary: mock.firewallMemory,
                  error: undefined,
                };
              const { data, timestamp } = await context.widgetLease.requests.firewallMemory
                .handler({ ...integration, kind: "opnsense" }, {})
                .getDataAsync();
              return {
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: timestamp,
                },
                summary: data,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: new Date(0),
                },
                summary: { used: 0, total: 0, percent: 0 },
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
    },
    notifications: {
      deleteNotification: oneIntegration(resources, mutation("widget.notifications.deleteNotification"), "interact", [
        "gotify",
      ])
        .input(
          z.object({
            notificationId: z
              .string()
              .regex(/^[1-9]\d*$/)
              .max(20),
          }),
        )
        .handler(async ({ context, input }) => {
          const integration = await context.widgetLease.createIntegrationAsync(context.integration);
          await integration.deleteNotificationAsync(input.notificationId);
          await context.widgetLease.requests.notifications.invalidateCacheAsync([context.integration.id]);
        }),
      getNotifications: manyWidgets(
        resources,
        query("widget.notifications.getNotifications"),
        "query",
        "notifications",
      ).handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              const { data, timestamp } = await context.widgetLease.requests.notifications
                .handler(integration, {})
                .getDataAsync();
              return {
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: timestamp,
                },
                data,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: new Date(0),
                },
                data: [],
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
    },
    timetable: {
      getTimetable: widgetProcedure(resources, query("widget.timetable.getTimetable"))
        .input(
          timetableSourceSchema.extend({
            stationId: z.string().min(1).max(200),
            limit: z.number().int().min(1).max(100),
          }),
        )
        .handler(async ({ context, input }) => {
          const source = await resolveTimetableBaseUrlAsync(context, resources, input);
          const { itemId: _itemId, boardId: _boardId, ...handlerInput } = input;
          return (
            await context.widgetLease.requests.timetableGet.handler({ ...handlerInput, ...source }).getDataAsync()
          ).data;
        }),
      searchStations: widgetProcedure(resources, query("widget.timetable.searchStations"))
        .input(timetableSourceSchema.extend({ query: z.string().max(200) }))
        .handler(async ({ context, input }) => {
          const source = await resolveTimetableBaseUrlAsync(context, resources, input, true);
          const { itemId: _itemId, boardId: _boardId, ...handlerInput } = input;
          return (
            await context.widgetLease.requests.timetableSearch.handler({ ...handlerInput, ...source }).getDataAsync()
          ).data;
        }),
    },
    tracearr: {
      getDashboard: manyWidgets(resources, query("widget.tracearr.getDashboard"), "query", "tracearr").handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              if (integration.kind === "mock")
                return {
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integrationUrl: integration.url,
                  dashboard: mock.tracearr,
                  updatedAt: new Date(mock.timestamp),
                  error: undefined,
                };
              const { data, timestamp } = await context.widgetLease.requests.tracearr
                .handler({ ...integration, kind: "tracearr" }, {})
                .getDataAsync();
              return {
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                dashboard: data,
                updatedAt: timestamp,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                dashboard: null,
                updatedAt: new Date(0),
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
    },
    speedtestTracker: {
      getDashboard: manyWidgets(
        resources,
        query("widget.speedtestTracker.getDashboard"),
        "query",
        "speedtestTracker",
      ).handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              if (integration.kind === "mock")
                return {
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integrationUrl: integration.url,
                  dashboard: mock.speedtestTracker,
                  updatedAt: new Date(mock.timestamp),
                  error: undefined,
                };
              const { data, timestamp } = await context.widgetLease.requests.speedtestTracker
                .handler({ ...integration, kind: "speedtestTracker" }, {})
                .getDataAsync();
              return {
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                dashboard: data,
                updatedAt: timestamp,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                dashboard: null,
                updatedAt: new Date(0),
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
    },
    uptimeKuma: {
      getDashboard: manyWidgets(resources, query("widget.uptimeKuma.getDashboard"), "query", "uptimeKuma").handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              if (integration.kind === "mock")
                return {
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integrationUrl: integration.url,
                  dashboard: mock.uptimeKuma,
                  updatedAt: new Date(mock.timestamp),
                  error: undefined,
                };
              const { data, timestamp } = await context.widgetLease.requests.uptimeKuma
                .handler({ ...integration, kind: "uptimeKuma" }, {})
                .getDataAsync();
              return {
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                dashboard: data,
                updatedAt: timestamp,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                dashboard: null,
                updatedAt: new Date(0),
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
    },
    audioStats: {
      getStats: oneWidget(resources, query("widget.audioStats.getStats"), "query", "audioStats").handler(
        async ({ context }) => {
          const { kind } = context.integration;
          if (kind === "mock") return { kind: "navidrome" as const, data: mock.audioStats };
          const fetchByKind = {
            navidrome: async () =>
              (
                await context.widgetLease.requests.navidrome
                  .handler({ ...context.integration, kind: "navidrome" }, {})
                  .getDataAsync()
              ).data,
            audiobookshelf: async () =>
              (
                await context.widgetLease.requests.audiobookshelf
                  .handler({ ...context.integration, kind: "audiobookshelf" }, {})
                  .getDataAsync()
              ).data,
          };
          return { kind, data: await fetchByKind[kind]() };
        },
      ),
    },
    umami: {
      getWebsites: oneWidget(resources, query("widget.umami.getWebsites"), "query", "umami").handler(
        async ({ context }) => {
          if (context.integration.kind === "mock") return mock.umamiWebsites;
          try {
            const instance = await context.widgetLease.createIntegrationAsync({
              ...context.integration,
              kind: "umami",
            });
            return await instance.getWebsitesAsync();
          } catch (error) {
            logger.warn(new Error("Failed to load websites", { cause: error }));
            return [];
          }
        },
      ),
      getVisitorStats: manyWidgets(resources, query("widget.umami.getVisitorStats"), "query", "umami")
        .input(z.object({ websiteId: z.string(), timeFrame: z.string(), eventName: z.string().optional() }))
        .handler(
          async ({ context, input }) =>
            await settleIntegrationQueries(resources, context.integrations, async (integration) => {
              if (integration.kind === "mock")
                return {
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integrationUrl: integration.url,
                  visitorStats: { ...mock.umamiVisitorStats, timeFrame: input.timeFrame },
                  updatedAt: new Date(mock.timestamp),
                };
              const { data, timestamp } = await context.widgetLease.requests.umami
                .handler(
                  { ...integration, kind: "umami" },
                  { websiteId: input.websiteId, timeFrame: input.timeFrame, eventName: input.eventName },
                )
                .getDataAsync();
              return {
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                visitorStats: data,
                updatedAt: timestamp,
              };
            }),
        ),
      getEventNames: oneWidget(resources, query("widget.umami.getEventNames"), "query", "umami")
        .input(z.object({ websiteId: z.string() }))
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return mock.umamiEventNames;
          try {
            return (
              await context.widgetLease.requests.umamiEventNames
                .handler({ ...context.integration, kind: "umami" }, { websiteId: input.websiteId })
                .getDataAsync()
            ).data;
          } catch (error) {
            logger.warn(
              new ErrorWithMetadata("Failed to load event names", { websiteId: input.websiteId }, { cause: error }),
            );
            return [];
          }
        }),
      getTopPages: oneWidget(resources, query("widget.umami.getTopPages"), "query", "umami")
        .input(z.object({ websiteId: z.string(), timeFrame: z.string(), limit: z.number().int().min(1).max(500) }))
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return mock.umamiTopPages.slice(0, input.limit);
          try {
            return (
              await context.widgetLease.requests.umamiTopPages
                .handler(
                  { ...context.integration, kind: "umami" },
                  { websiteId: input.websiteId, timeFrame: input.timeFrame, limit: input.limit },
                )
                .getDataAsync()
            ).data;
          } catch (error) {
            logger.warn(
              new ErrorWithMetadata(
                "Failed to load top pages",
                {
                  websiteId: input.websiteId,
                  timeFrame: input.timeFrame,
                  limit: input.limit,
                },
                { cause: error },
              ),
            );
            return [];
          }
        }),
      getTopReferrers: oneWidget(resources, query("widget.umami.getTopReferrers"), "query", "umami")
        .input(z.object({ websiteId: z.string(), timeFrame: z.string(), limit: z.number().int().min(1).max(500) }))
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return mock.umamiTopReferrers.slice(0, input.limit);
          try {
            return (
              await context.widgetLease.requests.umamiTopReferrers
                .handler(
                  { ...context.integration, kind: "umami" },
                  { websiteId: input.websiteId, timeFrame: input.timeFrame, limit: input.limit },
                )
                .getDataAsync()
            ).data;
          } catch (error) {
            logger.warn(
              new ErrorWithMetadata(
                "Failed to load top referrers",
                {
                  websiteId: input.websiteId,
                  timeFrame: input.timeFrame,
                  limit: input.limit,
                },
                { cause: error },
              ),
            );
            return [];
          }
        }),
      getMultiEventTimeSeries: oneWidget(resources, query("widget.umami.getMultiEventTimeSeries"), "query", "umami")
        .input(z.object({ websiteId: z.string(), timeFrame: z.string(), eventNames: z.array(z.string()) }))
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock")
            return mock.umamiEventSeries.filter((series) => input.eventNames.includes(series.eventName));
          try {
            const sortedNames = [...input.eventNames].toSorted();
            return (
              await context.widgetLease.requests.umamiMultiEvent
                .handler(
                  { ...context.integration, kind: "umami" },
                  { websiteId: input.websiteId, timeFrame: input.timeFrame, eventNames: sortedNames },
                )
                .getDataAsync()
            ).data;
          } catch (error) {
            logger.warn(
              new ErrorWithMetadata(
                "Failed to load multi-event time series",
                {
                  websiteId: input.websiteId,
                  timeFrame: input.timeFrame,
                  eventNames: JSON.stringify(input.eventNames),
                },
                { cause: error },
              ),
            );
            return [];
          }
        }),
      getActiveVisitors: oneWidget(resources, query("widget.umami.getActiveVisitors"), "query", "umami")
        .input(z.object({ websiteId: z.string() }))
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return 7;
          try {
            return (
              await context.widgetLease.requests.umamiActiveVisitors
                .handler({ ...context.integration, kind: "umami" }, { websiteId: input.websiteId })
                .getDataAsync()
            ).data;
          } catch (error) {
            logger.warn(
              new ErrorWithMetadata("Failed to load active visitors", { websiteId: input.websiteId }, { cause: error }),
            );
            return 0;
          }
        }),
    },
    vpn: {
      getSummaries: manyWidgets(resources, query("widget.vpn.getSummaries"), "query", "vpn").handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              if (integration.kind === "mock")
                return {
                  integration: {
                    id: integration.id,
                    name: integration.name,
                    kind: integration.kind,
                    updatedAt: new Date(mock.timestamp),
                  },
                  summary: mock.vpn,
                  error: undefined,
                };
              const { data, timestamp } = await context.widgetLease.requests.vpn
                .handler({ ...integration, kind: "gluetun" }, {})
                .getDataAsync();
              return {
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: timestamp,
                },
                summary: data,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integration: {
                  id: integration.id,
                  name: integration.name,
                  kind: integration.kind,
                  updatedAt: new Date(0),
                },
                summary: null,
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
    },
    ups: {
      getSummaries: manyWidgets(resources, query("widget.ups.getSummaries"), "query", "ups").handler(
        async ({ context }) =>
          await settleIntegrationQueries(
            resources,
            context.integrations,
            async (integration) => {
              const { data, timestamp } = await context.widgetLease.requests.ups
                .handler(integration, {})
                .getDataAsync();
              return {
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                summaries: data,
                updatedAt: timestamp,
                error: undefined,
              };
            },
            {
              fallback: (integration, error) => ({
                integrationId: integration.id,
                integrationName: integration.name,
                integrationUrl: integration.url,
                summaries: [],
                updatedAt: new Date(0),
                error: toPublicIntegrationError(error),
              }),
              throwOnAllFailures: true,
            },
          ),
      ),
    },
    traefik: {
      getDashboard: manyWidgets(resources, query("widget.traefik.getDashboard"), "query", "traefik")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Retrieve Traefik dashboard data, including routers, services, middlewares, and entry points, for the given integration IDs.",
            },
          }),
        )
        .handler(
          async ({ context }) =>
            await settleIntegrationQueries(
              resources,
              context.integrations,
              async (integration) => {
                if (integration.kind === "mock")
                  return {
                    integrationId: integration.id,
                    integrationName: integration.name,
                    integrationUrl: integration.url,
                    dashboard: mock.traefik,
                    updatedAt: new Date(mock.timestamp),
                    error: undefined,
                  };
                const { data, timestamp } = await context.widgetLease.requests.traefik
                  .handler({ ...integration, kind: "traefik" }, {})
                  .getDataAsync();
                return {
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integrationUrl: integration.url,
                  dashboard: data,
                  updatedAt: timestamp,
                  error: undefined,
                };
              },
              {
                fallback: (integration, error) => ({
                  integrationId: integration.id,
                  integrationName: integration.name,
                  integrationUrl: integration.url,
                  dashboard: null,
                  updatedAt: new Date(0),
                  error: toPublicIntegrationError(error),
                }),
                throwOnAllFailures: true,
              },
            ),
        ),
    },
    customApi: {
      refresh: widgetProcedure(resources, mutation("widget.customApi.refresh", false))
        .input(itemInputSchema)
        .handler(async ({ context, input }) => {
          const resolved = await resolvePlacedDefinitionAsync(context, resources, input.itemId);
          context.widgetLease.invalidateCustomWidgetResponseCache([
            `custom-jsx:${resolved.item.id}:${getCustomWidgetCacheVersion(resolved.stored)}:`,
          ]);
        }),
      getData: widgetProcedure(resources, query("widget.customApi.getData"))
        .input(itemInputSchema)
        .handler(async ({ context, input }) => {
          const resolved = await resolvePlacedDefinitionAsync(context, resources, input.itemId);
          const loadRequests = Object.entries(resolved.definition.requests).filter(
            ([, request]) => request.kind === "query" && request.trigger === "load",
          );
          const entries = await Promise.all(
            loadRequests.map(async ([requestId, request]) => {
              try {
                const response = await executeRequest(context, resources, resolved, { id: requestId, ...request }, {});
                return [
                  requestId,
                  {
                    sourceId: request.source,
                    sourceCacheVersion: response.sourceCacheVersion,
                    data: response.data,
                    status: {
                      loading: false,
                      ok: response.ok,
                      status: response.status,
                      statusText: response.statusText,
                      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
                    },
                  },
                ] as const;
              } catch (error) {
                return [
                  requestId,
                  {
                    sourceId: request.source,
                    sourceCacheVersion:
                      resolved.definition.sources[request.source]?.type === "integration" ? "unavailable" : "",
                    data: null,
                    status: {
                      loading: false,
                      ok: false,
                      status: 0,
                      error: error instanceof Error ? error.message : "Request failed",
                    },
                  },
                ] as const;
              }
            }),
          );
          const versions = new Map<string, string>();
          for (const [, result] of entries) {
            if (!result.sourceCacheVersion) continue;
            if (result.sourceCacheVersion === "unavailable" && versions.has(result.sourceId)) continue;
            versions.set(result.sourceId, result.sourceCacheVersion);
          }
          const loadSourceIds = new Set(loadRequests.map(([, request]) => request.source));
          const manualSourceIds = new Set<string>();
          for (const request of Object.values(resolved.definition.requests)) {
            if (request.kind !== "query" || request.trigger !== "manual" || loadSourceIds.has(request.source)) continue;
            if (resolved.definition.sources[request.source]?.type !== "integration") continue;
            manualSourceIds.add(request.source);
          }
          const manualVersions = await Promise.all(
            [...manualSourceIds].map(async (sourceId) => {
              const source = resolved.definition.sources[sourceId];
              if (source?.type !== "integration") return [sourceId, "unavailable"] as const;
              try {
                return [
                  sourceId,
                  await withRequestLimit(context, resolved, "metadata", () =>
                    getCustomWidgetIntegrationCacheVersion(context, resources, source),
                  ),
                ] as const;
              } catch {
                return [sourceId, "unavailable"] as const;
              }
            }),
          );
          for (const [sourceId, version] of manualVersions) versions.set(sourceId, version);
          const integrationCacheKey = [...versions]
            .toSorted(([left], [right]) => left.localeCompare(right))
            .map(([sourceId, version]) => `${sourceId}:${version}`)
            .join(":");
          return {
            type: "customJsx" as const,
            template: resolved.definition.template,
            queryCacheKey: `${getCustomWidgetCacheVersion(resolved.stored)}:${hashRuntimeParams(resolved.configuration)}:${integrationCacheKey}`,
            data: Object.fromEntries(entries.map(([id, result]) => [id, result.data])),
            status: Object.fromEntries(entries.map(([id, result]) => [id, result.status])),
            options: resolved.configuration,
            requestCapabilities: Object.entries(resolved.definition.requests).map(([id, request]) => ({
              id,
              kind: request.kind,
              method: request.method,
              trigger: request.trigger,
              minimumBoardPermission: request.permission,
              confirmation: getCustomWidgetConfirmation(request),
              invalidates: request.invalidates ?? [],
            })),
          };
        }),
      queryRequest: widgetProcedure(resources, query("widget.customApi.queryRequest"))
        .input(namedRequestInputSchema)
        .handler(async ({ context, input }) => {
          const resolved = await resolvePlacedDefinitionAsync(context, resources, input.itemId);
          const request = findRequest(resolved, input.requestId, "query");
          if (request.trigger !== "manual")
            throw new ORPCError("BAD_REQUEST", { message: "Load queries cannot be invoked manually" });
          const response = await executeRequest(context, resources, resolved, request, input.params);
          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
          };
        }),
      executeAction: authenticatedWidgetProcedure(resources, mutation("widget.customApi.executeAction"))
        .input(namedRequestInputSchema.extend({ confirmed: z.boolean().optional() }))
        .handler(async ({ context, input }) => {
          const resolved = await resolvePlacedDefinitionAsync(context, resources, input.itemId);
          const request = findRequest(resolved, input.requestId, "action");
          if ((request.confirmation !== undefined || request.method === "DELETE") && input.confirmed !== true)
            throw new ORPCError("PRECONDITION_FAILED", { message: "This action requires confirmation" });
          const response = await executeRequest(context, resources, resolved, request, input.params);
          if (response.ok && request.invalidates?.length)
            context.widgetLease.invalidateCustomWidgetResponseCache(
              request.invalidates.flatMap((requestId) => [
                `custom-jsx:${resolved.item.id}:${getCustomWidgetCacheVersion(resolved.stored)}:${requestId}:`,
                `custom-widget:options:${resolved.stored.id}:${getCustomWidgetCacheVersion(resolved.stored)}:${requestId}:`,
              ]),
            );
          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
            invalidates: request.invalidates ?? [],
          };
        }),
    },
    secrets: {
      setSecret: authenticatedWidgetProcedure(resources, mutation("widget.secrets.setSecret"))
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Set an authentication token for a release provider on a specific releases widget. Requires modify permission on the widget's board. Use widget_secrets_getConfiguredKinds to check existing tokens",
            },
          }),
        )
        .input(z.object({ itemId: z.string(), kind: z.enum(releaseProviderKinds), value: z.string().min(1).max(4096) }))
        .handler(async ({ context, input }) => {
          const item = await context.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
          if (!item || item.kind !== "releases") throw new ORPCError("NOT_FOUND");
          await boardAccess(context, resources, item.boardId, "modify");
          const row = {
            itemId: input.itemId,
            kind: input.kind,
            value: resources.codec.encryptSecret(input.value),
            updatedAt: new Date(),
          };
          await resources.handleTransactionsAsync(context.db, {
            async handleAsync(db, schema) {
              await db.transaction(async (tx) => {
                await tx
                  .delete(schema.widgetSecrets)
                  .where(and(eq(schema.widgetSecrets.itemId, input.itemId), eq(schema.widgetSecrets.kind, input.kind)));
                await tx.insert(schema.widgetSecrets).values(row);
              });
            },
            handleSync(db) {
              db.transaction((tx) => {
                tx.delete(widgetSecrets)
                  .where(and(eq(widgetSecrets.itemId, input.itemId), eq(widgetSecrets.kind, input.kind)))
                  .run();
                tx.insert(widgetSecrets).values(row).run();
              });
            },
          });
        }),
      deleteSecret: authenticatedWidgetProcedure(resources, mutation("widget.secrets.deleteSecret"))
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Remove an authentication token for a release provider from a specific releases widget. Requires modify permission on the widget's board",
            },
          }),
        )
        .input(z.object({ itemId: z.string(), kind: z.enum(releaseProviderKinds) }))
        .handler(async ({ context, input }) => {
          const item = await context.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
          if (!item || item.kind !== "releases") throw new ORPCError("NOT_FOUND");
          await boardAccess(context, resources, item.boardId, "modify");
          await context.db
            .delete(widgetSecrets)
            .where(and(eq(widgetSecrets.itemId, input.itemId), eq(widgetSecrets.kind, input.kind)));
        }),
      getConfiguredKinds: authenticatedWidgetProcedure(resources, query("widget.secrets.getConfiguredKinds", true))
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "List which release provider kinds have tokens configured for a releases widget. Returns an array of provider kind strings (e.g. github, gitlab, dockerHub). Requires modify permission on the widget's board",
            },
          }),
        )
        .input(z.object({ itemId: z.string() }))
        .handler(async ({ context, input }) => {
          const item = await context.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
          if (!item || item.kind !== "releases") throw new ORPCError("NOT_FOUND");
          await boardAccess(context, resources, item.boardId, "modify");
          try {
            const secrets = await context.db.query.widgetSecrets.findMany({
              where: eq(widgetSecrets.itemId, input.itemId),
              columns: { kind: true },
            });
            return secrets.map(({ kind }) => kind);
          } catch {
            const kinds: string[] = [];
            return kinds;
          }
        }),
    },
    wud: {
      getStats: oneWidget(resources, query("widget.wud.getStats"), "query", "wud")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Returns monitored-container counts and available updates from a What's Up Docker integration, or mock statistics from a mock integration. REQUIRED: integrationId from integration_all. The caller needs query permission for that integration.",
            },
          }),
        )
        .handler(async ({ context }) => {
          if (context.integration.kind === "mock") return { stats: mock.wud, updatedAt: new Date(mock.timestamp) };
          const { data, timestamp } = await context.widgetLease.requests.wud
            .handler({ ...context.integration, kind: "wud" }, {})
            .getDataAsync();
          return { stats: data, updatedAt: timestamp };
        }),
    },
    llamacpp: {
      getStats: oneWidget(resources, query("widget.llamacpp.getStats"), "query", "llamacpp")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Returns health, loaded model and Prometheus metrics (generation speed, token counts, request queue) from a llama.cpp (llama-server) integration. REQUIRED: integrationId from integration_all. The caller needs query permission for that integration.",
            },
          }),
        )
        .handler(async ({ context }) => {
          if (context.integration.kind === "mock") return { stats: mock.llamacpp, updatedAt: new Date(mock.timestamp) };
          const { data, timestamp } = await context.widgetLease.requests.llamacpp
            .handler({ ...context.integration, kind: "llamacpp" }, {})
            .getDataAsync();
          return { stats: data, updatedAt: timestamp };
        }),
    },
    wazuh: {
      getAgents: oneWidget(resources, query("widget.wazuh.getAgents"), "query", "wazuhAgents")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get Wazuh agent counts and the full agent list (status, IP, OS, version, last keepalive, groups). REQUIRED: integrationId (single Wazuh integration ID from integration_all).",
            },
          }),
        )
        .handler(async ({ context }) => {
          if (context.integration.kind === "mock") return mockWazuh(resources, mock.wazuhAgents);
          const integration = { ...context.integration, kind: "wazuh" as const };
          return await settleWazuh(resources, "getAgents", integration, () =>
            context.widgetLease.requests.wazuhAgents.handler(integration, {}).getDataAsync(),
          );
        }),
      getAlerts: oneWidget(resources, query("widget.wazuh.getAlerts"), "query", "wazuhAlerts")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get recent Wazuh alerts at or above a rule level. Requires indexer credentials on the integration. REQUIRED: integrationId (single Wazuh integration ID from integration_all).",
            },
          }),
        )
        .input(
          z.object({
            minLevel: z.number().int().min(0).max(16).default(7),
            limit: z.number().int().min(1).max(100).default(20),
            hours: z.number().int().min(1).max(720).default(24),
          }),
        )
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return mockWazuh(resources, mock.wazuhAlerts);
          const integration = { ...context.integration, kind: "wazuh" as const };
          return await settleWazuh(resources, "getAlerts", integration, () =>
            context.widgetLease.requests.wazuhAlerts
              .handler(integration, { minLevel: input.minLevel, limit: input.limit, hours: input.hours })
              .getDataAsync(),
          );
        }),
      getSummary: oneWidget(resources, query("widget.wazuh.getSummary"), "query", "wazuhSummary")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get Wazuh alert counts by severity for a time range compared with the previous period, plus manager version and indexer health. REQUIRED: integrationId (single Wazuh integration ID from integration_all).",
            },
          }),
        )
        .input(z.object({ range: z.enum(wazuhTimeRanges).default("24h") }))
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return mockWazuh(resources, mock.wazuhSummary);
          const integration = { ...context.integration, kind: "wazuh" as const };
          return await settleWazuh(resources, "getSummary", integration, () =>
            context.widgetLease.requests.wazuhSummary.handler(integration, { range: input.range }).getDataAsync(),
          );
        }),
      getTimeline: oneWidget(resources, query("widget.wazuh.getTimeline"), "query", "wazuhTimeline")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get a histogram of Wazuh alerts over time split by severity (low, medium, high, critical). Requires indexer credentials on the integration. REQUIRED: integrationId (single Wazuh integration ID from integration_all).",
            },
          }),
        )
        .input(
          z.object({
            range: z.enum(wazuhTimeRanges).default("24h"),
            interval: z.enum(wazuhTimelineIntervals).default("auto"),
            minLevel: z.number().int().min(0).max(16).default(0),
          }),
        )
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return mockWazuh(resources, mock.wazuhTimeline);
          const integration = { ...context.integration, kind: "wazuh" as const };
          return await settleWazuh(resources, "getTimeline", integration, () =>
            context.widgetLease.requests
              .getWazuhTimelineRequestHandler(input.range)
              .handler(integration, input)
              .getDataAsync(),
          );
        }),
      getTopList: oneWidget(resources, query("widget.wazuh.getTopList"), "query", "wazuhTopList")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get the top Wazuh rules, agents, source IPs, MITRE ATT&CK tactics or techniques by alert count. Requires indexer credentials on the integration. REQUIRED: integrationId (single Wazuh integration ID from integration_all).",
            },
          }),
        )
        .input(
          z.object({
            kind: z.enum(wazuhTopListKinds).default("rules"),
            range: z.enum(wazuhTimeRanges).default("24h"),
            limit: z.number().int().min(1).max(50).default(8),
            minLevel: z.number().int().min(0).max(16).default(0),
          }),
        )
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock")
            return mockWazuh(resources, { ...mock.wazuhTopList, kind: input.kind });
          const integration = { ...context.integration, kind: "wazuh" as const };
          return await settleWazuh(resources, "getTopList", integration, () =>
            context.widgetLease.requests.wazuhTopList.handler(integration, input).getDataAsync(),
          );
        }),
      getVulnerabilities: oneWidget(
        resources,
        query("widget.wazuh.getVulnerabilities"),
        "query",
        "wazuhVulnerabilities",
      )
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get Wazuh vulnerability counts by severity, the top CVEs and the most vulnerable agents. Requires indexer credentials on the integration. REQUIRED: integrationId (single Wazuh integration ID from integration_all).",
            },
          }),
        )
        .input(
          z.object({
            cveLimit: z.number().int().min(1).max(50).default(8),
            agentLimit: z.number().int().min(1).max(50).default(5),
            cveOrder: z.enum(wazuhCveOrders).default("score"),
            minSeverity: z.enum(["all", "medium", "high", "critical"]).default("all"),
          }),
        )
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return mockWazuh(resources, mock.wazuhVulnerabilities);
          const integration = { ...context.integration, kind: "wazuh" as const };
          return await settleWazuh(resources, "getVulnerabilities", integration, () =>
            context.widgetLease.requests.wazuhVulnerabilities.handler(integration, input).getDataAsync(),
          );
        }),
      getFim: oneWidget(resources, query("widget.wazuh.getFim"), "query", "wazuhFim")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get recent Wazuh file integrity monitoring (syscheck) events with counts per event type. Requires indexer credentials on the integration. REQUIRED: integrationId (single Wazuh integration ID from integration_all).",
            },
          }),
        )
        .input(
          z.object({
            range: z.enum(wazuhTimeRanges).default("24h"),
            event: z.enum(wazuhFimEvents).default("all"),
            limit: z.number().int().min(1).max(100).default(20),
            includeRegistry: z.boolean().default(true),
          }),
        )
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return mockWazuh(resources, mock.wazuhFim);
          const integration = { ...context.integration, kind: "wazuh" as const };
          return await settleWazuh(resources, "getFim", integration, () =>
            context.widgetLease.requests.wazuhFim.handler(integration, input).getDataAsync(),
          );
        }),
      getAuthFailures: oneWidget(resources, query("widget.wazuh.getAuthFailures"), "query", "wazuhAuthFailures")
        .meta(
          sourceProjectionMeta({
            mcp: {
              enabled: true,
              description:
                "Get failed-login and brute-force alert counts per agent with hourly series and top source IPs. Requires indexer credentials on the integration. REQUIRED: integrationId (single Wazuh integration ID from integration_all).",
            },
          }),
        )
        .input(
          z.object({
            hours: z.number().int().min(1).max(168).default(24),
            limit: z.number().int().min(1).max(25).default(6),
          }),
        )
        .handler(async ({ context, input }) => {
          if (context.integration.kind === "mock") return mockWazuh(resources, mock.wazuhAuthFailures);
          const integration = { ...context.integration, kind: "wazuh" as const };
          return await settleWazuh(resources, "getAuthFailures", integration, () =>
            context.widgetLease.requests.wazuhAuthFailures.handler(integration, input).getDataAsync(),
          );
        }),
    },
  };
}
