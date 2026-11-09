import z from "zod";

import { createKeyedFingerprint, decryptSecret, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { db, eq } from "@homarr/db";
import { integrations, integrationSecrets } from "@homarr/db/schema";
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
  SmartHomeActionReceipt,
  SmartHomeArea,
  SmartHomeCatalog,
  SmartHomeEntity,
  SmartHomeEntityPatch,
  SmartHomeEntitySelection,
  SmartHomeForecastDay,
  SmartHomeHistorySeries,
  SmartHomeSnapshot,
} from "../interfaces/smart-home/smart-home-types";
import { SMART_HOME_ENTITY_LIMIT, SmartHomeSelectionLimitError } from "../interfaces/smart-home/smart-home-types";
import type { CalendarEvent } from "../types";
import { toServiceCall } from "./homeassistant-actions";
import { HomeAssistantConnection } from "./homeassistant-connection";
import { SmartHomeActionNotSupportedError, SmartHomeEntityNotFoundError } from "./homeassistant-errors";
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

const CAMERA_REFRESH_MS = 10_000;

const actionResultSchema = z.object({ context: z.object({ id: z.string().min(1) }) });

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

export { SmartHomeActionNotSupportedError, SmartHomeEntityNotFoundError } from "./homeassistant-errors";

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

  public async executeActionAsync(entityId: string, action: SmartHomeAction): Promise<SmartHomeActionReceipt | void> {
    const connection = this.getConnection();
    const current = (await connection.getStatesAsync()).get(entityId);
    if (!current) throw new SmartHomeEntityNotFoundError(entityId);
    const entity = normalizeEntity(current, { areaId: null });
    if (!supportsSmartHomeAction(entity, action)) throw new SmartHomeActionNotSupportedError(entityId, action.type);

    const resolved = resolveAction(entity, action);
    if (!supportsSmartHomeAction(entity, resolved)) throw new SmartHomeActionNotSupportedError(entityId, action.type);
    const serviceCall = toServiceCall(entityId, resolved);
    if (!serviceCall) throw new SmartHomeActionNotSupportedError(entityId, action.type);

    const result = await connection.sendAsync({
      type: "call_service",
      domain: serviceCall.domain,
      service: serviceCall.service,
      service_data: serviceCall.data,
      target: { entity_id: entityId },
    });
    const receipt = actionResultSchema.safeParse(result);
    if (receipt.success) return { contextId: receipt.data.context.id };
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
    const present = new Set<string>();
    let watched: ReadonlySet<string> | null = null;
    let states: ReadonlyMap<string, RawEntityState> | null = null;
    let areas: SmartHomeArea[] = [];
    let lookup = createRegistryLookup(null);
    let lookupRevision = 0;
    let registryDirty = false;
    let refreshing = false;
    let draining = false;
    let settled = false;
    let announced = false;
    const done = Promise.withResolvers<void>();
    const settle = (error?: unknown) => {
      if (settled) return;
      settled = true;
      if (error === undefined) done.resolve();
      else done.reject(error);
    };

    const drainAsync = async () => {
      while (pendingChanged.size > 0 || pendingRemoved.size > 0) {
        if (settled || refreshing) return;
        const revision = lookupRevision;
        const entries = [...pendingChanged];
        const removed = [...pendingRemoved];
        const changed = await this.toEntitiesAsync(
          entries.map(([, raw]) => raw),
          lookup,
        );
        if (settled) return;
        if (revision !== lookupRevision || refreshing) continue;
        const stillRemoved = removed.filter((id) => pendingRemoved.has(id));
        const stillChanged = changed.filter((entity) => !pendingRemoved.has(entity.id));
        for (const [id, raw] of entries) {
          if (pendingChanged.get(id) === raw) pendingChanged.delete(id);
        }
        stillRemoved.forEach((id) => pendingRemoved.delete(id));
        announced = true;
        onPatch({ changed: stillChanged, removed: stillRemoved });
      }
    };
    const scheduleDrain = () => {
      if (draining || settled || !watched || refreshing) return;
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
    const reconcileSelection = (metadataChanged: boolean) => {
      if (!states) return;
      const ids = resolveSnapshotIds(states, lookup, areas, selection);
      const selected = new Set(ids);
      watched = new Set([...ids, ...(selection.entityIds ?? [])]);
      for (const id of present) {
        if (selected.has(id)) continue;
        pendingChanged.delete(id);
        pendingRemoved.add(id);
      }
      for (const id of ids) {
        const raw = states.get(id);
        if (raw && (metadataChanged || !present.has(id))) pendingChanged.set(id, raw);
        pendingRemoved.delete(id);
      }
      present.clear();
      ids.forEach((id) => present.add(id));
      if (metadataChanged) {
        for (const id of selection.entityIds ?? []) {
          if (!states.has(id)) pendingRemoved.add(id);
        }
      }
    };
    const refreshRegistry = () => {
      registryDirty = true;
      if (!states || refreshing || settled) return;
      refreshing = true;
      const refreshAsync = async () => {
        while (registryDirty) {
          if (settled) return;
          registryDirty = false;
          const registry = await connection.getRegistryAsync();
          if (settled) return;
          if (registryDirty) continue;
          lookup = createRegistryLookup(registry);
          areas = normalizeAreas(registry);
          lookupRevision++;
          reconcileSelection(true);
          if (!announced && pendingChanged.size === 0 && pendingRemoved.size === 0) {
            announced = true;
            onPatch({ changed: [], removed: [] });
          }
        }
      };
      void refreshAsync().then(
        () => {
          refreshing = false;
          scheduleDrain();
        },
        (error: unknown) => {
          refreshing = false;
          settle(error);
        },
      );
    };

    const unsubscribe = connection.subscribeStates({
      onChange: (change) => {
        if (!watched || !states || settled) return;
        try {
          reconcileSelection(false);
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
        } catch (error) {
          settle(error);
        }
      },
      onRegistryChange: refreshRegistry,
      onError: (error) => settle(error),
    });
    const onAbort = () => settle();
    signal.addEventListener("abort", onAbort, { once: true });

    try {
      states = await connection.getStatesAsync();
      if (!settled) refreshRegistry();
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
      integrationId: this.integration.id,
      url,
      token,
      isConfigurationCurrentAsync: async () => await this.isConfigurationCurrentAsync(),
    });
  }

  private async isConfigurationCurrentAsync() {
    const current = await db.query.integrations.findFirst({
      where: eq(integrations.id, this.integration.id),
      columns: { url: true, kind: true },
      with: {
        secrets: {
          where: eq(integrationSecrets.kind, "apiKey"),
          columns: { value: true },
        },
      },
    });
    if (!current || current.kind !== "homeAssistant" || current.url !== this.integration.url) return false;
    const token = current.secrets[0]?.value;
    return token !== undefined && decryptSecret(token) === this.getSecretValue("apiKey");
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
  const excludedIds = new Set(selection.excludedEntityIds ?? []);
  const includeAll = explicit.length === 0 && !areaIds && (selection.entityIds ?? []).length === 0;

  const implicit = [...states.keys()].filter((id) => {
    const context = lookup(id);
    if (context.hidden) return false;
    if (excludedIds.has(id)) return false;
    if (domains && !domains.has(getEntityDomain(id))) return false;
    if (areaIds) return context.areaId !== null && areaIds.has(context.areaId);
    return includeAll;
  });

  return [...new Set([...explicit, ...implicit])];
};

const resolveSnapshotIds = (
  states: ReadonlyMap<string, RawEntityState>,
  lookup: (entityId: string) => EntityRegistryContext,
  areas: SmartHomeArea[],
  selection: SmartHomeEntitySelection,
) => {
  const excludedIds = new Set(selection.excludedEntityIds ?? []);
  const domains = new Set(selection.domains ?? []);
  const ambientIds = areas
    .filter((area) => selection.areaIds?.includes(area.id))
    .flatMap((area) => [area.temperatureEntityId, area.humidityEntityId])
    .filter(
      (id): id is string =>
        id !== null &&
        states.has(id) &&
        !lookup(id).hidden &&
        !excludedIds.has(id) &&
        (domains.size === 0 || domains.has(getEntityDomain(id))),
    );
  const ids = [...new Set([...resolveSelection(states, lookup, selection), ...ambientIds])];
  if (ids.length > SMART_HOME_ENTITY_LIMIT) throw new SmartHomeSelectionLimitError(ids.length);
  return ids;
};
