import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { IntegrationKind, IntegrationKindByCategory } from "@homarr/definitions";
import type { IntegrationInput } from "@homarr/integrations";
import { downloadClientItemSchema } from "@homarr/integrations/downloads";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { LiveStatsEvent } from "@homarr/integrations/types";
import {
  beszelAlertsRequestHandler,
  beszelStatsRequestHandler,
  beszelSystemsRequestHandler,
} from "@homarr/request-handler/beszel";
import { downloadClientRequestHandler } from "@homarr/request-handler/downloads";
import { mediaServerRequestHandler } from "@homarr/request-handler/media-server";

import { BoundedAsyncQueue } from "../../widgets/bounded-async-queue";

type NativeIntegration = IntegrationInput & { kind: IntegrationKind; appId?: string | null };
type CapabilityKind = "query" | "action" | "subscription";
export const NATIVE_WIDGET_CAPABILITIES_VERSION = 1;
export const nativeWidgetCapabilities = {
  "beszel.systems": { kind: "query", integrations: ["beszel"] },
  "beszel.stats": { kind: "query", integrations: ["beszel"] },
  "beszel.containers": { kind: "query", integrations: ["beszel"] },
  "beszel.alerts": { kind: "query", integrations: ["beszel"] },
  "beszel.live": { kind: "subscription", integrations: ["beszel"] },
  "downloads.queue": { kind: "query", integrations: getIntegrationKindsByCategory("downloadClient") },
  "downloads.pause": { kind: "action", integrations: getIntegrationKindsByCategory("downloadClient") },
  "downloads.resume": { kind: "action", integrations: getIntegrationKindsByCategory("downloadClient") },
  "downloads.pauseItem": { kind: "action", integrations: getIntegrationKindsByCategory("downloadClient") },
  "downloads.resumeItem": { kind: "action", integrations: getIntegrationKindsByCategory("downloadClient") },
  "downloads.deleteItem": { kind: "action", integrations: getIntegrationKindsByCategory("downloadClient") },
  "media.sessions": { kind: "query", integrations: getIntegrationKindsByCategory("mediaService") },
  "sonarr.calendar": { kind: "query", integrations: ["sonarr"] },
  "sonarr.missing": { kind: "query", integrations: ["sonarr"] },
  "sonarr.queue": { kind: "query", integrations: ["sonarr"] },
  "sonarr.searchEpisodes": { kind: "action", integrations: ["sonarr"] },
} as const satisfies Record<string, { kind: CapabilityKind; integrations: readonly IntegrationKind[] }>;

export type NativeWidgetCapability = keyof typeof nativeWidgetCapabilities;

export function getNativeWidgetCapability(capability: string) {
  if (!Object.hasOwn(nativeWidgetCapabilities, capability))
    throw new Error(`Unknown integration capability: ${capability}`);
  return nativeWidgetCapabilities[capability as NativeWidgetCapability];
}

function assertCapability(integration: NativeIntegration, capability: string) {
  const metadata = getNativeWidgetCapability(capability);
  const kinds: readonly IntegrationKind[] = metadata.integrations;
  if (!kinds.includes(integration.kind))
    throw new Error(`Integration ${integration.kind} does not support ${capability}`);
  return metadata;
}

const systemInput = z.object({ systemId: z.string().min(1) });
const statsInput = systemInput.extend({
  timePeriod: z.enum(["1m", "1h", "12h", "24h", "1w", "30d"]).default("1h"),
  includeDocker: z.boolean().default(true),
});
const alertsInput = z.object({
  includeHistory: z.boolean().default(true),
  maxHistoryItems: z.number().int().min(1).max(1000).default(50),
});
const queueInput = z.object({ limit: z.number().int().min(1).max(1000).default(50) });
const itemInput = z.object({ item: downloadClientItemSchema, fromDisk: z.boolean().default(false) });

/** Call after resolving a named connection and checking native query/interact access on the server. */
export async function invokeNativeWidgetCapability(
  integration: NativeIntegration,
  capability: string,
  input: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  signal?.throwIfAborted();
  const metadata = assertCapability(integration, capability);
  if (metadata.kind === "subscription") throw new Error("Use the subscription bridge for streaming capabilities");
  if (integration.kind === "beszel") {
    const connection = { ...integration, appId: integration.appId ?? null, kind: "beszel" as const };
    if (capability === "beszel.systems") return beszelSystemsRequestHandler.handler(connection, {}).getDataAsync();
    if (capability === "beszel.stats")
      return beszelStatsRequestHandler.handler(connection, statsInput.parse(input ?? {})).getDataAsync();
    if (capability === "beszel.alerts")
      return beszelAlertsRequestHandler.handler(connection, alertsInput.parse(input ?? {})).getDataAsync();
    if (capability === "beszel.containers") {
      const instance = await createIntegrationAsync(connection);
      return instance.getContainersAsync(systemInput.parse(input).systemId);
    }
  }
  if (capability === "media.sessions") {
    const connection = { ...integration, appId: integration.appId ?? null } as IntegrationInput & {
      kind: IntegrationKindByCategory<"mediaService">;
      appId: string | null;
    };
    const values = z.object({ showOnlyPlaying: z.boolean().default(false) }).parse(input ?? {});
    return mediaServerRequestHandler.handler(connection, values).getDataAsync();
  }
  if (integration.kind === "sonarr") {
    const instance = await createIntegrationAsync({ ...integration, kind: "sonarr" });
    if (capability === "sonarr.searchEpisodes") {
      const { episodeIds } = z
        .object({ episodeIds: z.array(z.number().int().positive()).min(1).max(100) })
        .parse(input);
      return instance.searchEpisodesAsync(episodeIds, signal);
    }
    if (capability === "sonarr.calendar") {
      const values = z
        .object({ start: z.coerce.date(), end: z.coerce.date(), includeUnmonitored: z.boolean().default(false) })
        .parse(input);
      if (values.start > values.end) throw new Error("Calendar start must precede the end");
      return instance.getCalendarEventsAsync(values.start, values.end, values.includeUnmonitored);
    }
    const { limit } = queueInput.parse(input ?? {});
    if (capability === "sonarr.missing") return instance.getMissingAsync(limit);
    if (capability === "sonarr.queue") return instance.getMediaQueueAsync(limit);
  }
  if (capability.startsWith("downloads.")) {
    const connection = { ...integration, appId: integration.appId ?? null } as IntegrationInput & {
      kind: IntegrationKindByCategory<"downloadClient">;
      appId: string | null;
    };
    if (capability === "downloads.queue")
      return downloadClientRequestHandler.handler(connection, queueInput.parse(input ?? {})).getDataAsync();
    const instance = await createIntegrationAsync(connection);
    try {
      if (capability === "downloads.pause") await instance.pauseQueueAsync();
      else if (capability === "downloads.resume") await instance.resumeQueueAsync();
      else {
        const values = itemInput.parse(input);
        if (capability === "downloads.pauseItem") await instance.pauseItemAsync(values.item);
        else if (capability === "downloads.resumeItem") await instance.resumeItemAsync(values.item);
        else if (capability === "downloads.deleteItem") await instance.deleteItemAsync(values.item, values.fromDisk);
      }
      return { ok: true };
    } finally {
      await downloadClientRequestHandler.invalidateCacheAsync([integration.id]);
    }
  }
  throw new Error(`Unsupported integration capability: ${capability}`);
}

export async function* subscribeNativeWidgetCapability(
  integration: NativeIntegration,
  capability: string,
  input: unknown,
  signal: AbortSignal,
): AsyncGenerator<unknown> {
  signal.throwIfAborted();
  assertCapability(integration, capability);
  if (integration.kind !== "beszel" || capability !== "beszel.live")
    throw new Error(`Unsupported subscription capability: ${capability}`);
  const { systemId } = systemInput.parse(input);
  const instance = await createIntegrationAsync({ ...integration, kind: "beszel" });
  const controller = new AbortController();
  const queue = new BoundedAsyncQueue<LiveStatsEvent>(4);
  const stop = () => {
    controller.abort();
    void queue.return();
  };
  signal.addEventListener("abort", stop, { once: true });
  if (signal.aborted) stop();
  const streaming = instance
    .subscribeRealtimeMetrics(systemId, (event) => queue.push(event), controller.signal)
    .then(
      () => queue.close(),
      (error: unknown) => {
        if (!controller.signal.aborted) queue.fail(error);
      },
    );
  try {
    for await (const event of queue) yield event;
  } finally {
    stop();
    signal.removeEventListener("abort", stop);
    await streaming;
  }
}
