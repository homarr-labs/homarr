"use client";

import { createContext, createElement, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useTiks } from "@rexa-developer/tiks/react";
import { supportsSmartHomeAction } from "@homarr/integrations/types";

import { prototypeAreas, prototypeEntities } from "./fixtures";
import type {
  HaAction,
  HaArea,
  HaEntity,
  PrototypeActionResult,
  PrototypeEntityError,
  PrototypeInteractionBlock,
} from "./types";

export type PrototypeEntityMap = Record<string, HaEntity>;

type EntityMap = PrototypeEntityMap;

export interface PrototypeEntitySource {
  subscribe: (listener: () => void) => () => void;
  getEntities: () => PrototypeEntityMap;
  getAreas: () => readonly HaArea[];
  isPending: (entityId: string) => boolean;
  getError: (entityId: string) => PrototypeEntityError | null;
  run: (entityId: string, action: HaAction) => Promise<PrototypeActionResult>;
}

interface StoreState {
  entities: EntityMap;
  pending: Record<string, boolean>;
}

const SIMULATED_SETTLE_MS = 350;
const SCOPE_KEY_SEPARATOR = "\u001f";

let state: StoreState = {
  entities: Object.fromEntries(prototypeEntities.map((entity) => [entity.id, entity])),
  pending: {},
};
const listeners = new Set<() => void>();
const latestRequestByEntity = new Map<string, number>();
let requestSequence = 0;

const emit = (next: StoreState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toggleState = (entity: HaEntity): Partial<HaEntity> => {
  if (entity.domain === "cover" || entity.domain === "valve") {
    const opening = entity.state === "closed";
    return { state: opening ? "open" : "closed", attributes: { ...entity.attributes, position: opening ? 100 : 0 } };
  }
  if (entity.domain === "lock") return { state: entity.state === "locked" ? "unlocked" : "locked" };
  if (entity.domain === "media_player") return { state: entity.state === "playing" ? "paused" : "playing" };
  if (entity.domain === "climate") {
    return { state: entity.state === "off" ? (entity.attributes.hvacModes?.[1] ?? "heat") : "off" };
  }
  const turningOn = entity.state !== "on";
  if (entity.domain === "light") {
    return {
      state: turningOn ? "on" : "off",
      attributes: { ...entity.attributes, brightness: turningOn ? entity.attributes.brightness || 80 : 0 },
    };
  }
  if (entity.domain === "fan") {
    return { state: turningOn ? "on" : "off", attributes: { ...entity.attributes, percentage: turningOn ? 50 : 0 } };
  }
  return { state: turningOn ? "on" : "off" };
};

const reduce = (entity: HaEntity, action: HaAction): Partial<HaEntity> => {
  const attributes = entity.attributes;
  switch (action.type) {
    case "toggle":
      return toggleState(entity);
    case "turnOn":
      return entity.state === "on" ? {} : toggleState(entity);
    case "turnOff":
      return entity.state === "off" ? {} : toggleState(entity);
    case "setBrightness": {
      const value = clamp(Math.round(action.value), 0, 100);
      return { state: value > 0 ? "on" : "off", attributes: { ...attributes, brightness: value } };
    }
    case "setColorTemp":
      return {
        state: "on",
        attributes: { ...attributes, colorTempKelvin: action.value, rgbColor: undefined, colorMode: "color_temp" },
      };
    case "setRgbColor":
      return {
        state: "on",
        attributes: { ...attributes, rgbColor: action.value, colorTempKelvin: undefined, colorMode: "rgb" },
      };
    case "setTemperature":
      return {
        attributes: {
          ...attributes,
          targetTemperature: action.value,
        },
      };
    case "setTemperatureRange":
      return { attributes: { ...attributes, targetTemperatureLow: action.low, targetTemperatureHigh: action.high } };
    case "setHvacMode":
      return {
        state: action.value,
        attributes: { ...attributes, hvacAction: action.value === "off" ? "off" : "idle" },
      };
    case "setPresetMode":
      return { attributes: { ...attributes, presetMode: action.value } };
    case "setHumidity":
      return { attributes: { ...attributes, targetHumidity: clamp(action.value, 0, 100) } };
    case "setPosition": {
      const value = clamp(Math.round(action.value), 0, 100);
      return { state: value > 0 ? "open" : "closed", attributes: { ...attributes, position: value } };
    }
    case "open":
      return { state: "open", attributes: { ...attributes, position: 100 } };
    case "close":
      return { state: "closed", attributes: { ...attributes, position: 0 } };
    case "stop":
      return {};
    case "lock":
      return { state: "locked" };
    case "unlock":
      return { state: "unlocked" };
    case "mediaPlayPause":
      return { state: entity.state === "playing" ? "paused" : "playing" };
    case "mediaNext":
    case "mediaPrevious":
      return { attributes: { ...attributes, mediaPosition: 0 } };
    case "setVolume":
      return { attributes: { ...attributes, volume: clamp(action.value, 0, 1) } };
    case "trigger":
      if (entity.domain === "automation" || entity.domain === "script") {
        return { attributes: { ...attributes, lastTriggered: Date.now() } };
      }
      return { state: new Date().toISOString() };
    case "selectOption":
      return { state: action.value };
    case "setFanPercentage": {
      const value = clamp(Math.round(action.value), 0, 100);
      return { state: value > 0 ? "on" : "off", attributes: { ...attributes, percentage: value } };
    }
    case "vacuumStart":
      return { state: "cleaning", attributes: { ...attributes, status: "Cleaning" } };
    case "vacuumReturn":
      return { state: "returning", attributes: { ...attributes, status: "Returning to dock" } };
    case "alarmArm":
      return { state: `armed_${action.mode}` };
    case "alarmDisarm":
      return { state: "disarmed" };
    case "install":
      return { state: "off", attributes: { ...attributes, installedVersion: attributes.latestVersion } };
  }
};

const applyOptimistic = (entity: HaEntity, action: HaAction): HaEntity => {
  const patch = reduce(entity, action);
  if (Object.keys(patch).length === 0) return entity;
  const stateChanged = patch.state !== undefined && patch.state !== entity.state;
  return { ...entity, ...patch, lastChanged: stateChanged ? Date.now() : entity.lastChanged };
};

const withoutKey = (record: Record<string, boolean>, key: string) =>
  Object.fromEntries(Object.entries(record).filter(([entry]) => entry !== key));

const simulateSettlement = () => new Promise<void>((resolve) => setTimeout(resolve, SIMULATED_SETTLE_MS));

export const runPrototypeAction = async (entityId: string, action: HaAction): Promise<PrototypeActionResult> => {
  const current = state.entities[entityId];
  if (!current) return "blocked";
  if (!supportsSmartHomeAction(current, action)) return "blocked";

  const request = ++requestSequence;
  latestRequestByEntity.set(entityId, request);

  const next = applyOptimistic(current, action);
  const alreadyPending = state.pending[entityId] === true;
  if (next !== current || !alreadyPending) {
    emit({
      entities: next === current ? state.entities : { ...state.entities, [entityId]: next },
      pending: alreadyPending ? state.pending : { ...state.pending, [entityId]: true },
    });
  }

  await simulateSettlement();

  if (latestRequestByEntity.get(entityId) !== request) return "superseded";
  latestRequestByEntity.delete(entityId);
  emit({ entities: state.entities, pending: withoutKey(state.pending, entityId) });
  return "applied";
};

const fixtureSource: PrototypeEntitySource = {
  subscribe,
  getEntities: () => state.entities,
  getAreas: () => prototypeAreas,
  isPending: (entityId) => state.pending[entityId] ?? false,
  getError: () => null,
  run: runPrototypeAction,
};

const SourceContext = createContext<PrototypeEntitySource>(fixtureSource);
const InteractionContext = createContext<PrototypeInteractionBlock | null>(null);

export const PrototypeSourceProvider = ({ source, children }: { source: PrototypeEntitySource; children: ReactNode }) =>
  createElement(SourceContext.Provider, { value: source }, children);

export const PrototypeInteractionProvider = ({
  blocked,
  children,
}: {
  blocked: PrototypeInteractionBlock | null;
  children: ReactNode;
}) => createElement(InteractionContext.Provider, { value: blocked }, children);

export const usePrototypeInteractionBlock = () => useContext(InteractionContext);

interface EntityScope {
  select: (entities: EntityMap) => EntityMap;
}

const createEntityScope = (entityIds: readonly string[]): EntityScope => {
  const ids = [...new Set(entityIds)];
  let source: EntityMap | null = null;
  let selected: HaEntity[] = [];
  let result: EntityMap = {};

  return {
    select(entities) {
      if (entities === source) return result;
      source = entities;
      const next = ids.flatMap((id) => {
        const entity = entities[id];
        return entity ? [entity] : [];
      });
      const unchanged = next.length === selected.length && next.every((entity, index) => entity === selected[index]);
      if (unchanged) return result;
      selected = next;
      result = Object.fromEntries(next.map((entity) => [entity.id, entity]));
      return result;
    },
  };
};

const EntityScopeContext = createContext<EntityScope | null>(null);

interface PrototypeEntitiesProviderProps {
  entityIds?: readonly string[];
  children: ReactNode;
}

export const PrototypeEntitiesProvider = ({ entityIds, children }: PrototypeEntitiesProviderProps) => {
  const scopeKey = entityIds?.join(SCOPE_KEY_SEPARATOR);
  const scope = useMemo(() => {
    if (scopeKey === undefined) return null;
    if (scopeKey === "") return createEntityScope([]);
    return createEntityScope(scopeKey.split(SCOPE_KEY_SEPARATOR));
  }, [scopeKey]);
  return createElement(EntityScopeContext.Provider, { value: scope }, children);
};

export const usePrototypeEntities = () => {
  const source = useContext(SourceContext);
  const scope = useContext(EntityScopeContext);
  const getSnapshot = useCallback(() => {
    const entities = source.getEntities();
    if (!scope) return entities;
    return scope.select(entities);
  }, [source, scope]);
  return useSyncExternalStore(source.subscribe, getSnapshot, getSnapshot);
};

export const usePrototypeEntity = (entityId: string) => {
  const source = useContext(SourceContext);
  const getSnapshot = useCallback(() => source.getEntities()[entityId], [source, entityId]);
  return useSyncExternalStore(source.subscribe, getSnapshot, getSnapshot);
};

export const usePrototypeAreas = () => {
  const source = useContext(SourceContext);
  return useSyncExternalStore(source.subscribe, source.getAreas, source.getAreas);
};

export const usePrototypePending = (entityId: string) => {
  const source = useContext(SourceContext);
  const getSnapshot = useCallback(() => source.isPending(entityId), [source, entityId]);
  return useSyncExternalStore(source.subscribe, getSnapshot, () => false);
};

export const usePrototypeEntityError = (entityId: string) => {
  const source = useContext(SourceContext);
  const getSnapshot = useCallback(() => source.getError(entityId), [source, entityId]);
  return useSyncExternalStore(source.subscribe, getSnapshot, () => null);
};

export const usePrototypeAction = () => {
  const source = useContext(SourceContext);
  const blocked = useContext(InteractionContext);
  const { click } = useTiks({ theme: "soft", volume: 0.12, respectReducedMotion: true });
  return useCallback(
    async (entityId: string, action: HaAction): Promise<PrototypeActionResult> => {
      if (blocked) return "blocked";
      const result = await source.run(entityId, action);
      if (result === "applied") click();
      return result;
    },
    [source, blocked, click],
  );
};
