import z from "zod";

import { createKeyedFingerprint, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { ImageProxy } from "@homarr/image-proxy";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../http-auth";
import type { ICalendarIntegration } from "../interfaces/calendar/calendar-integration";
import type { ISmartHomeIntegration } from "../interfaces/smart-home/smart-home-integration";
import { supportsSmartHomeAction } from "../interfaces/smart-home/smart-home-capabilities";
import type {
  SmartHomeAction,
  SmartHomeArea,
  SmartHomeCatalog,
  SmartHomeEntity,
  SmartHomeEntityPatch,
  SmartHomeEntitySelection,
  SmartHomeForecastDay,
  SmartHomeHistorySeries,
  SmartHomeSnapshot,
} from "../interfaces/smart-home/smart-home-types";
import type { CalendarEvent } from "../types";
import { toServiceCall } from "./homeassistant-actions";
import { HomeAssistantConnection } from "./homeassistant-connection";
import { bucketHistory } from "./homeassistant-history";
import {
  createCatalog,
  createRegistryLookup,
  getEntityDomain,
  normalizeAreas,
  normalizeEntity,
} from "./homeassistant-normalize";
import type { EntityRegistryContext } from "./homeassistant-normalize";
import type { RawEntityState } from "./homeassistant-types";
import { calendarEventSchema, calendarsSchema, historyResultSchema } from "./homeassistant-types";

const MAX_SNAPSHOT_ENTITIES = 400;
const CAMERA_REFRESH_MS = 10_000;

const forecastResultSchema = z.object({
  response: z.record(
    z.string(),
    z.object({
      forecast: z.array(
        z.object({
          datetime: z.string(),
          condition: z.string().nullish(),
          temperature: z.number().nullish(),
          templow: z.number().nullish(),
          precipitation_probability: z.number().nullish(),
        }),
      ),
    }),
  ),
});

export class SmartHomeActionNotSupportedError extends Error {
  public constructor(entityId: string, actionType: string) {
    super(`Action ${actionType} is not supported for ${entityId}`);
    this.name = "SmartHomeActionNotSupportedError";
  }
}

export class SmartHomeEntityNotFoundError extends Error {
  public constructor(entityId: string) {
    super(`Entity ${entityId} was not found`);
    this.name = "SmartHomeEntityNotFoundError";
  }
}

export class HomeAssistantIntegration extends Integration implements ISmartHomeIntegration, ICalendarIntegration {
  public async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return { headers: this.getAuthHeaders() };
  }

  public async getEntityStatsAsync() {
    const states = [...(await this.getConnection().getStatesAsync()).values()];
    return {
      entities: states.length,
      unavailable: states.filter((entity) => entity.state === "unavailable").length,
      lightsOn: states.filter((entity) => entity.entityId.startsWith("light.") && entity.state === "on").length,
      peopleHome: states.filter((entity) => entity.entityId.startsWith("person.") && entity.state === "home").length,
    };
  }

  public async getSnapshotAsync(selection: SmartHomeEntitySelection): Promise<SmartHomeSnapshot> {
    const connection = this.getConnection();
    const [states, registry] = await Promise.all([connection.getStatesAsync(), connection.getRegistryAsync()]);
    const lookup = createRegistryLookup(registry);
    const areas = normalizeAreas(registry);
    const ids = resolveSnapshotIds(states, lookup, areas, selection);
    const entities = await this.toEntitiesAsync(
      ids.flatMap((id) => {
        const raw = states.get(id);
        return raw ? [raw] : [];
      }),
      lookup,
    );
    const usedAreas = new Set([...entities.map((entity) => entity.areaId), ...(selection.areaIds ?? [])]);
    return {
      entities,
      areas: areas.filter((area) => usedAreas.has(area.id)),
      updatedAt: Date.now(),
    };
  }

  public async getCatalogAsync(): Promise<SmartHomeCatalog> {
    const connection = this.getConnection();
    const [states, registry] = await Promise.all([connection.getStatesAsync(), connection.getRegistryAsync()]);
    return createCatalog(states.values(), registry);
  }

  public async getHistoryAsync(entityIds: string[], hours: number, samples: number): Promise<SmartHomeHistorySeries[]> {
    if (entityIds.length === 0) return [];
    const end = Date.now();
    const start = end - hours * 3_600_000;
    const result = await this.getConnection().sendAsync({
      type: "history/history_during_period",
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      entity_ids: entityIds,
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false,
    });
    const history = historyResultSchema.parse(result);
    return entityIds.map((entityId) => ({
      entityId,
      points: bucketHistory(
        (history[entityId] ?? []).map((item) => ({ state: item.s, time: (item.lu ?? item.lc ?? 0) * 1000 })),
        { start, end, samples },
      ),
    }));
  }

  public async getForecastAsync(entityId: string, type: "daily" | "hourly"): Promise<SmartHomeForecastDay[]> {
    const result = await this.getConnection().sendAsync({
      type: "call_service",
      domain: "weather",
      service: "get_forecasts",
      service_data: { type },
      target: { entity_id: entityId },
      return_response: true,
    });
    const forecast = forecastResultSchema.parse(result).response[entityId]?.forecast ?? [];
    return forecast.map((item) => ({
      time: Date.parse(item.datetime),
      condition: item.condition ?? "unknown",
      temperatureHigh: item.temperature ?? null,
      temperatureLow: item.templow ?? null,
      precipitationProbability: item.precipitation_probability ?? null,
    }));
  }

  public async executeActionAsync(entityId: string, action: SmartHomeAction): Promise<void> {
    const connection = this.getConnection();
    const current = (await connection.getStatesAsync()).get(entityId);
    if (!current) throw new SmartHomeEntityNotFoundError(entityId);
    const entity = normalizeEntity(current, { areaId: null });
    if (!supportsSmartHomeAction(entity, action)) throw new SmartHomeActionNotSupportedError(entityId, action.type);

    const resolved = resolveAction(entity, action);
    if (!supportsSmartHomeAction(entity, resolved)) throw new SmartHomeActionNotSupportedError(entityId, action.type);
    const serviceCall = toServiceCall(entityId, resolved);
    if (!serviceCall) throw new SmartHomeActionNotSupportedError(entityId, action.type);

    await connection.sendAsync({
      type: "call_service",
      domain: serviceCall.domain,
      service: serviceCall.service,
      service_data: serviceCall.data,
      target: { entity_id: entityId },
    });
  }

  public async subscribeEntitiesAsync(
    selection: SmartHomeEntitySelection,
    onPatch: (patch: SmartHomeEntityPatch) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) return;
    const connection = this.getConnection();
    const pendingChanged = new Map<string, RawEntityState>();
    const pendingRemoved = new Set<string>();
    let watched: ReadonlySet<string> | null = null;
    let lookup = createRegistryLookup(null);
    let draining = false;
    let settled = false;
    const done = Promise.withResolvers<void>();
    const settle = (error?: unknown) => {
      if (settled) return;
      settled = true;
      if (error === undefined) done.resolve();
      else done.reject(error);
    };

    const drainAsync = async () => {
      while (pendingChanged.size > 0 || pendingRemoved.size > 0) {
        if (settled) return;
        const raws = [...pendingChanged.values()];
        const removed = [...pendingRemoved];
        pendingChanged.clear();
        pendingRemoved.clear();
        const changed = await this.toEntitiesAsync(raws, lookup);
        if (settled) return;
        onPatch({ changed, removed });
      }
    };
    const scheduleDrain = () => {
      if (draining || settled || !watched) return;
      draining = true;
      drainAsync().then(
        () => {
          draining = false;
          if (pendingChanged.size > 0 || pendingRemoved.size > 0) scheduleDrain();
        },
        (error: unknown) => {
          draining = false;
          settle(error);
        },
      );
    };

    const unsubscribe = connection.subscribeStates({
      onChange: (change) => {
        if (!watched) return;
        for (const raw of change.changed) {
          if (!watched.has(raw.entityId)) continue;
          pendingChanged.set(raw.entityId, raw);
          pendingRemoved.delete(raw.entityId);
        }
        for (const id of change.removed) {
          if (!watched.has(id)) continue;
          pendingChanged.delete(id);
          pendingRemoved.add(id);
        }
        scheduleDrain();
      },
      onError: (error) => settle(error),
    });
    const onAbort = () => settle();
    signal.addEventListener("abort", onAbort, { once: true });

    try {
      const [states, registry] = await Promise.all([connection.getStatesAsync(), connection.getRegistryAsync()]);
      if (!settled) {
        lookup = createRegistryLookup(registry);
        const ids = resolveSnapshotIds(states, lookup, normalizeAreas(registry), selection);
        watched = new Set(ids);
        for (const id of ids) {
          const raw = states.get(id);
          if (raw) pendingChanged.set(id, raw);
        }
        for (const id of selection.entityIds ?? []) {
          if (!states.has(id)) pendingRemoved.add(id);
        }
        scheduleDrain();
      }
    } catch (error) {
      settle(error);
    }

    try {
      await done.promise;
    } finally {
      unsubscribe();
      signal.removeEventListener("abort", onAbort);
    }
  }

  public async getCalendarEventsAsync(start: Date, end: Date): Promise<CalendarEvent[]> {
    const calendarsResponse = await this.getAsync("/api/calendars");
    if (!calendarsResponse.ok) throw new ResponseError(calendarsResponse);
    const calendars = await calendarsSchema.parseAsync(await calendarsResponse.json());

    return await Promise.all(
      calendars.map(async (calendar) => {
        const response = await this.getAsync(`/api/calendars/${calendar.entity_id}`, { start, end });
        if (!response.ok) throw new ResponseError(response);
        return await z.array(calendarEventSchema).parseAsync(await response.json());
      }),
    ).then((events) =>
      events.flat().map(
        (event): CalendarEvent => ({
          title: event.summary,
          subTitle: null,
          description: event.description,
          startDate: "date" in event.start ? new Date(`${event.start.date}T00:00:00`) : new Date(event.start.dateTime),
          endDate: "date" in event.end ? new Date(`${event.end.date}T00:00:00`) : new Date(event.end.dateTime),
          image: null,
          indicatorColor: "#18bcf2",
          links: [],
          location: event.location,
        }),
      ),
    );
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/config"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    await HomeAssistantConnection.testAsync(
      this.webSocketUrl("/api/websocket"),
      this.getSecretValue("apiKey"),
      input.options,
    );

    return {
      success: true,
    };
  }

  private getConnection() {
    const url = this.webSocketUrl("/api/websocket");
    const token = this.getSecretValue("apiKey");
    return HomeAssistantConnection.acquire({
      key: `${this.integration.id}:${createKeyedFingerprint(`${url.toString()}\n${token}`)}`,
      url,
      token,
    });
  }

  private async toEntitiesAsync(
    raws: RawEntityState[],
    lookup: (entityId: string) => EntityRegistryContext,
  ): Promise<SmartHomeEntity[]> {
    const imageProxy = new ImageProxy();
    return await Promise.all(
      raws.map(async (raw) => {
        const entity = normalizeEntity(raw, lookup(raw.entityId));
        const pictureUrl = await this.getPictureUrlAsync(raw, imageProxy).catch(() => undefined);
        if (!pictureUrl) return entity;
        return { ...entity, attributes: { ...entity.attributes, pictureUrl } };
      }),
    );
  }

  private async getPictureUrlAsync(raw: RawEntityState, imageProxy: ImageProxy) {
    const picture = raw.attributes.entity_picture;
    if (typeof picture !== "string" || picture.length === 0) return undefined;
    if (raw.state === "unavailable") return undefined;

    const source = new URL(picture, this.integration.url);
    source.searchParams.delete("token");
    if (getEntityDomain(raw.entityId) === "camera") {
      source.searchParams.set("width", "640");
      source.searchParams.set("homarr", Math.floor(raw.lastUpdated / CAMERA_REFRESH_MS).toString());
    }
    const sameOrigin = source.origin === new URL(this.integration.url).origin;
    return await imageProxy.createImageAsync(source.toString(), sameOrigin ? this.getAuthHeaders() : undefined);
  }

  private async getAsync(path: `/api/${string}`, queryParams?: Record<string, string | Date | number | boolean>) {
    return await fetchWithTrustedCertificatesAsync(this.url(path, queryParams), {
      headers: this.getAuthHeaders(),
    });
  }

  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
    };
  }
}

const momentaryDomains = new Set(["scene", "button", "input_button"]);

const resolveAction = (entity: SmartHomeEntity, action: SmartHomeAction): SmartHomeAction => {
  if (action.type !== "toggle") return action;
  const { domain, state } = entity;
  if (domain === "climate") {
    if (state !== "off") return { type: "setHvacMode", value: "off" };
    const modes = entity.attributes.hvacModes ?? [];
    const value =
      ["heat_cool", "heat", "cool"].find((mode) => modes.includes(mode)) ?? modes.find((mode) => mode !== "off");
    if (value) return { type: "setHvacMode", value };
  }
  if (domain === "lock") return state === "locked" ? { type: "unlock" } : { type: "lock" };
  if (momentaryDomains.has(domain)) return { type: "trigger" };
  return action;
};

const resolveSelection = (
  states: ReadonlyMap<string, RawEntityState>,
  lookup: (entityId: string) => EntityRegistryContext,
  selection: SmartHomeEntitySelection,
) => {
  const explicit = (selection.entityIds ?? []).filter((id) => states.has(id));
  const domains = selection.domains && selection.domains.length > 0 ? new Set(selection.domains) : null;
  const areaIds = selection.areaIds && selection.areaIds.length > 0 ? new Set(selection.areaIds) : null;
  const includeAll = explicit.length === 0 && !areaIds && (selection.entityIds ?? []).length === 0;

  const implicit = [...states.keys()].filter((id) => {
    const context = lookup(id);
    if (context.hidden) return false;
    if (domains && !domains.has(getEntityDomain(id))) return false;
    if (areaIds) return context.areaId !== null && areaIds.has(context.areaId);
    return includeAll;
  });

  return [...new Set([...explicit, ...implicit])].slice(0, MAX_SNAPSHOT_ENTITIES);
};

const resolveSnapshotIds = (
  states: ReadonlyMap<string, RawEntityState>,
  lookup: (entityId: string) => EntityRegistryContext,
  areas: SmartHomeArea[],
  selection: SmartHomeEntitySelection,
) => {
  const ambientIds = areas
    .filter((area) => selection.areaIds?.includes(area.id))
    .flatMap((area) => [area.temperatureEntityId, area.humidityEntityId])
    .filter((id): id is string => id !== null && states.has(id) && !lookup(id).hidden);
  return [...new Set([...resolveSelection(states, lookup, selection), ...ambientIds])];
};
