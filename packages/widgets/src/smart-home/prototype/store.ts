"use client";

import { createContext, createElement, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useTiks } from "@rexa-developer/tiks/react";
import { applySmartHomeAction, supportsSmartHomeAction } from "@homarr/integrations/types";
import type { SmartHomeEntity } from "@homarr/integrations/types";

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

const applyOptimistic = (entity: HaEntity, action: HaAction): HaEntity => {
  const current: SmartHomeEntity = { ...entity, stateClass: null, lastUpdated: entity.lastChanged };
  const next = applySmartHomeAction(current, action);
  if (next === current) return entity;
  return {
    ...entity,
    state: next.state,
    attributes: { ...entity.attributes, ...next.attributes },
    lastChanged: next.lastChanged,
  };
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
