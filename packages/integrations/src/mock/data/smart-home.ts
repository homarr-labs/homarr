import { toServiceCall } from "../../homeassistant/homeassistant-actions";
import { SmartHomeActionNotSupportedError } from "../../homeassistant/homeassistant-errors";
import { supportsSmartHomeAction } from "../../interfaces/smart-home/smart-home-capabilities";

import type { ISmartHomeIntegration } from "../../interfaces/smart-home/smart-home-integration";
import type {
  SmartHomeAction,
  SmartHomeCatalog,
  SmartHomeEntity,
  SmartHomeEntityPatch,
  SmartHomeEntitySelection,
  SmartHomeForecastDay,
  SmartHomeHistorySeries,
  SmartHomeSnapshot,
} from "../../interfaces/smart-home/smart-home-types";
import { SMART_HOME_ENTITY_LIMIT, SmartHomeSelectionLimitError } from "../../interfaces/smart-home/smart-home-types";
import {
  mockSmartHomeAreas,
  mockSmartHomeEntities,
  mockSmartHomeForecasts,
  mockSmartHomeFloors,
  mockSmartHomeHistory,
} from "./smart-home-fixtures";
import { applySmartHomeAction } from "../../interfaces/smart-home/smart-home-optimistic";
import type { SmartHomeMockState, SmartHomeMockStateEntry } from "./smart-home-state";

const LIVE_INTERVAL_MS = 6_000;

export class SmartHomeMockService implements ISmartHomeIntegration {
  private readonly entities = new Map(mockSmartHomeEntities.map((entity) => [entity.id, entity]));
  private readonly listeners = new Set<(patch: SmartHomeEntityPatch) => void>();
  private readonly revisions = new Map<string, number>();
  private liveTimer: NodeJS.Timeout | undefined;
  private tick = 0;
  private simulating = false;

  constructor(
    private readonly sharedState?: SmartHomeMockState,
    private readonly onLiveError?: (error: unknown) => void,
  ) {}

  public async getSnapshotAsync(selection: SmartHomeEntitySelection): Promise<SmartHomeSnapshot> {
    await this.refreshSharedStateAsync();
    const entities = this.select(selection);
    const usedAreas = new Set([...entities.map((entity) => entity.areaId), ...(selection.areaIds ?? [])]);
    return await Promise.resolve({
      entities,
      areas: mockSmartHomeAreas.filter((area) => usedAreas.has(area.id)),
      updatedAt: Date.now(),
    });
  }

  public async getCatalogAsync(): Promise<SmartHomeCatalog> {
    return await Promise.resolve({
      entities: [...this.entities.values()]
        .map((entity) => ({
          id: entity.id,
          domain: entity.domain,
          name: entity.name,
          areaId: entity.areaId,
          icon: entity.icon,
          deviceClass: entity.deviceClass,
          hidden: false,
        }))
        .toSorted((left, right) => left.name.localeCompare(right.name)),
      areas: mockSmartHomeAreas,
      floors: mockSmartHomeFloors,
    });
  }

  public async getHistoryAsync(entityIds: string[], hours: number, samples: number): Promise<SmartHomeHistorySeries[]> {
    const end = Date.now();
    const start = end - hours * 3_600_000;
    return await Promise.resolve(
      entityIds.map((entityId) => {
        const values = mockSmartHomeHistory.get(entityId) ?? [];
        if (values.length < 2) return { entityId, points: [] };
        const points = Array.from({ length: samples }, (_, index) => {
          const position = (index / (samples - 1)) * (values.length - 1);
          const lower = values[Math.floor(position)] ?? 0;
          const upper = values[Math.ceil(position)] ?? lower;
          const value = lower + (upper - lower) * (position - Math.floor(position));
          return {
            time: Math.round(start + ((end - start) * index) / (samples - 1)),
            value: Math.round(value * 10) / 10,
          };
        });
        return { entityId, points };
      }),
    );
  }

  public async getForecastAsync(entityId: string, _type: "daily" | "hourly"): Promise<SmartHomeForecastDay[]> {
    return await Promise.resolve(mockSmartHomeForecasts.get(entityId) ?? []);
  }

  public async executeActionAsync(entityId: string, action: SmartHomeAction): Promise<void> {
    const entity = this.entities.get(entityId);
    if (!entity) throw new Error(`Entity ${entityId} was not found`);
    if (!toServiceCall(entityId, action) || !supportsSmartHomeAction(entity, action)) {
      throw new SmartHomeActionNotSupportedError(entityId, action.type);
    }
    if (this.sharedState) {
      const entry = await this.sharedState.updateAsync(entity, (current) => applySmartHomeAction(current, action));
      this.updateShared(entry);
      return;
    }
    this.update(applySmartHomeAction(entity, action));
    return await Promise.resolve();
  }

  public async subscribeEntitiesAsync(
    selection: SmartHomeEntitySelection,
    onPatch: (patch: SmartHomeEntityPatch) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) return;
    const unsubscribeShared = await this.sharedState?.subscribeAsync((entry) => this.updateShared(entry));
    try {
      await this.refreshSharedStateAsync();
    } catch (error) {
      unsubscribeShared?.();
      throw error;
    }
    if (signal.aborted) {
      unsubscribeShared?.();
      return;
    }
    const initial = this.select(selection);
    const watched = new Set([...initial.map((entity) => entity.id), ...(selection.entityIds ?? [])]);
    const listener = (patch: SmartHomeEntityPatch) => {
      const changed = patch.changed.filter((entity) => watched.has(entity.id));
      if (changed.length > 0) onPatch({ changed, removed: [] });
    };
    this.listeners.add(listener);
    this.startLive();
    const missing = (selection.entityIds ?? []).filter((id) => !this.entities.has(id));
    onPatch({ changed: initial, removed: missing });
    await new Promise<void>((resolve) => {
      const stop = () => {
        unsubscribeShared?.();
        this.listeners.delete(listener);
        if (this.listeners.size === 0) this.stopLive();
        resolve();
      };
      if (signal.aborted) {
        stop();
        return;
      }
      signal.addEventListener("abort", stop, { once: true });
    });
  }

  private select(selection: SmartHomeEntitySelection) {
    const all = [...this.entities.values()];
    const explicit = (selection.entityIds ?? []).flatMap((id) => {
      const entity = this.entities.get(id);
      return entity ? [entity] : [];
    });
    const domains = selection.domains?.length ? new Set(selection.domains) : null;
    const areaIds = selection.areaIds?.length ? new Set(selection.areaIds) : null;
    const excludedIds = new Set(selection.excludedEntityIds ?? []);
    const includeAll = !areaIds && (selection.entityIds ?? []).length === 0;
    const ambientIds = mockSmartHomeAreas
      .filter((area) => areaIds?.has(area.id))
      .flatMap((area) => [area.temperatureEntityId, area.humidityEntityId]);
    const implicit = all.filter((entity) => {
      if (excludedIds.has(entity.id)) return false;
      if (domains && !domains.has(entity.domain)) return false;
      if (areaIds) return (entity.areaId !== null && areaIds.has(entity.areaId)) || ambientIds.includes(entity.id);
      return includeAll;
    });
    const selected = [...new Map([...explicit, ...implicit].map((entity) => [entity.id, entity])).values()];
    if (selected.length > SMART_HOME_ENTITY_LIMIT) throw new SmartHomeSelectionLimitError(selected.length);
    return selected;
  }

  private update(entity: SmartHomeEntity) {
    this.entities.set(entity.id, entity);
    this.listeners.forEach((listener) => listener({ changed: [entity], removed: [] }));
  }

  private updateShared({ entity, revision }: SmartHomeMockStateEntry) {
    if (!this.entities.has(entity.id) || revision <= (this.revisions.get(entity.id) ?? 0)) return;
    this.revisions.set(entity.id, revision);
    this.update(entity);
  }

  private async refreshSharedStateAsync() {
    if (!this.sharedState) return;
    const entries = await this.sharedState.readAsync([...this.entities.keys()]);
    entries.forEach((entry) => this.updateShared(entry));
  }

  private startLive() {
    if (this.liveTimer) return;
    this.liveTimer = setInterval(() => {
      void this.simulateAsync().catch((error: unknown) => this.onLiveError?.(error));
    }, LIVE_INTERVAL_MS);
    this.liveTimer.unref();
  }

  private stopLive() {
    clearInterval(this.liveTimer);
    this.liveTimer = undefined;
  }

  private async simulateAsync() {
    if (this.simulating) return;
    this.simulating = true;
    try {
      await this.refreshSharedStateAsync();
      await this.simulateEntitiesAsync();
    } finally {
      this.simulating = false;
    }
  }

  private async simulateEntitiesAsync() {
    this.tick++;
    const now = Date.now();
    const outside = this.entities.get("sensor.outside_temperature");
    if (outside) {
      const value = 14.2 + Math.sin(this.tick / 10) * 0.4;
      await this.updateSimulatedAsync(outside, (current) => {
        if (now - current.lastUpdated < LIVE_INTERVAL_MS - 1000) return current;
        return { ...current, state: value.toFixed(1), lastUpdated: now, lastChanged: now };
      });
    }

    const tv = this.entities.get("media_player.living_room_tv");
    if (tv?.state === "playing") {
      await this.updateSimulatedAsync(tv, (current) => {
        if (current.state !== "playing") return current;
        const playbackNow = Date.now();
        if (playbackNow - (current.attributes.mediaPositionUpdatedAt ?? 0) < LIVE_INTERVAL_MS - 1000) return current;
        const duration = current.attributes.mediaDuration ?? 596;
        const elapsed = Math.max(0, (playbackNow - (current.attributes.mediaPositionUpdatedAt ?? playbackNow)) / 1000);
        const position = ((current.attributes.mediaPosition ?? 0) + elapsed) % duration;
        return {
          ...current,
          attributes: { ...current.attributes, mediaPosition: position, mediaPositionUpdatedAt: playbackNow },
        };
      });
    }
  }

  private async updateSimulatedAsync(entity: SmartHomeEntity, update: (current: SmartHomeEntity) => SmartHomeEntity) {
    if (!this.sharedState) {
      this.update(update(entity));
      return;
    }
    this.updateShared(await this.sharedState.updateAsync(entity, update));
  }
}
