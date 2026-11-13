"use client";

import { createContext, createElement, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useTiks } from "@rexa-developer/tiks/react";

import type {
  HaAction,
  HaArea,
  HaEntity,
  SmartHomeActionResult,
  SmartHomeEntityError,
  SmartHomeInteractionBlock,
} from "./types";

export type SmartHomeEntityMap = Record<string, HaEntity>;

type EntityMap = SmartHomeEntityMap;

export interface SmartHomeEntitySource {
  subscribe: (listener: () => void) => () => void;
  getEntities: () => SmartHomeEntityMap;
  getAreas: () => readonly HaArea[];
  isPending: (entityId: string) => boolean;
  getError: (entityId: string) => SmartHomeEntityError | null;
  run: (entityId: string, action: HaAction) => Promise<SmartHomeActionResult>;
}

const SCOPE_KEY_SEPARATOR = "\u001f";

const noEntities: EntityMap = {};
const noAreas: readonly HaArea[] = [];

const emptySource: SmartHomeEntitySource = {
  subscribe: () => () => undefined,
  getEntities: () => noEntities,
  getAreas: () => noAreas,
  isPending: () => false,
  getError: () => null,
  run: () => Promise.resolve("blocked"),
};

const SourceContext = createContext<SmartHomeEntitySource>(emptySource);
const InteractionContext = createContext<SmartHomeInteractionBlock | null>(null);

export const SmartHomeSourceProvider = ({ source, children }: { source: SmartHomeEntitySource; children: ReactNode }) =>
  createElement(SourceContext.Provider, { value: source }, children);

export const SmartHomeInteractionProvider = ({
  blocked,
  children,
}: {
  blocked: SmartHomeInteractionBlock | null;
  children: ReactNode;
}) => createElement(InteractionContext.Provider, { value: blocked }, children);

export const useSmartHomeInteractionBlock = () => useContext(InteractionContext);

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

interface SmartHomeEntitiesProviderProps {
  entityIds?: readonly string[];
  children: ReactNode;
}

export const SmartHomeEntitiesProvider = ({ entityIds, children }: SmartHomeEntitiesProviderProps) => {
  const scopeKey = entityIds?.join(SCOPE_KEY_SEPARATOR);
  const scope = useMemo(() => {
    if (scopeKey === undefined) return null;
    if (scopeKey === "") return createEntityScope([]);
    return createEntityScope(scopeKey.split(SCOPE_KEY_SEPARATOR));
  }, [scopeKey]);
  return createElement(EntityScopeContext.Provider, { value: scope }, children);
};

export const useSmartHomeEntities = () => {
  const source = useContext(SourceContext);
  const scope = useContext(EntityScopeContext);
  const getSnapshot = useCallback(() => {
    const entities = source.getEntities();
    if (!scope) return entities;
    return scope.select(entities);
  }, [source, scope]);
  return useSyncExternalStore(source.subscribe, getSnapshot, getSnapshot);
};

export const useSmartHomeEntity = (entityId: string) => {
  const source = useContext(SourceContext);
  const getSnapshot = useCallback(() => source.getEntities()[entityId], [source, entityId]);
  return useSyncExternalStore(source.subscribe, getSnapshot, getSnapshot);
};

export const useSmartHomeAreas = () => {
  const source = useContext(SourceContext);
  return useSyncExternalStore(source.subscribe, source.getAreas, source.getAreas);
};

export const useSmartHomePending = (entityId: string) => {
  const source = useContext(SourceContext);
  const getSnapshot = useCallback(() => source.isPending(entityId), [source, entityId]);
  return useSyncExternalStore(source.subscribe, getSnapshot, () => false);
};

export const useSmartHomeEntityError = (entityId: string) => {
  const source = useContext(SourceContext);
  const getSnapshot = useCallback(() => source.getError(entityId), [source, entityId]);
  return useSyncExternalStore(source.subscribe, getSnapshot, () => null);
};

export const useSmartHomeAction = () => {
  const source = useContext(SourceContext);
  const blocked = useContext(InteractionContext);
  const { click } = useTiks({ theme: "soft", volume: 0.12, respectReducedMotion: true });
  return useCallback(
    async (entityId: string, action: HaAction): Promise<SmartHomeActionResult> => {
      if (blocked) return "blocked";
      const result = await source.run(entityId, action);
      if (result === "applied") click();
      return result;
    },
    [source, blocked, click],
  );
};
