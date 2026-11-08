"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { skipToken } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import type {
  SmartHomeAction,
  SmartHomeEntity,
  SmartHomeEntityPatch,
  SmartHomeEntitySelection,
  SmartHomeSnapshot,
} from "@homarr/integrations/types";

const FALLBACK_POLL_MS = 30_000;
const RESUBSCRIBE_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];

const subscribeToVisibility = (onChange: () => void) => {
  if (typeof document === "undefined") return () => undefined;
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

const getPageVisibility = () => typeof document === "undefined" || document.visibilityState === "visible";

const usePageVisible = () => useSyncExternalStore(subscribeToVisibility, getPageVisibility, () => true);

export const mergeSmartHomePatch = (
  snapshot: SmartHomeSnapshot | undefined,
  patch: SmartHomeEntityPatch,
): SmartHomeSnapshot | undefined => {
  if (!snapshot) return snapshot;
  const changed = new Map(patch.changed.map((entity) => [entity.id, entity]));
  const removed = new Set(patch.removed);
  let touched = false;
  const entities = snapshot.entities.flatMap((entity) => {
    if (removed.has(entity.id)) {
      touched = true;
      return [];
    }
    const next = changed.get(entity.id);
    if (!next) return [entity];
    changed.delete(entity.id);
    if (next.lastUpdated <= entity.lastUpdated) return [entity];
    touched = true;
    return [next];
  });
  const added = [...changed.values()].filter((entity) => !removed.has(entity.id));
  if (!touched && added.length === 0) return snapshot;
  entities.push(...added);
  return { ...snapshot, entities, updatedAt: Date.now() };
};

interface UseSmartHomeSnapshotOptions {
  live: boolean;
}

export const useSmartHomeSnapshot = (
  integrationId: string,
  selection: Required<SmartHomeEntitySelection>,
  { live }: UseSmartHomeSnapshotOptions,
) => {
  const utils = clientApi.useUtils();
  const pageVisible = usePageVisible();
  const [liveError, setLiveError] = useState<Error | null>(null);
  const [isLive, setIsLive] = useState(false);
  const input = useMemo(() => ({ integrationId, ...selection }), [integrationId, selection]);
  const subscriptionEnabled = live && pageVisible;
  const patched = useRef(new Map<string, SmartHomeEntity>());
  const removed = useRef(new Set<string>());

  const query = clientApi.widget.smartHome.snapshot.useQuery(input, {
    refetchInterval: isLive && liveError === null ? false : FALLBACK_POLL_MS,
    refetchOnWindowFocus: !isLive,
  });

  useEffect(() => {
    patched.current = new Map();
    removed.current = new Set();
  }, [input]);

  const { data } = query;
  useEffect(() => {
    if (!data || (patched.current.size === 0 && removed.current.size === 0)) return;
    const pendingRemoved = [...removed.current];
    if (!query.isFetching) removed.current.clear();
    const current = new Map(data.entities.map((entity) => [entity.id, entity]));
    for (const [id, seen] of patched.current) {
      const entity = current.get(id);
      if (entity && seen.lastUpdated <= entity.lastUpdated) patched.current.delete(id);
      if (!entity && !query.isFetching && seen.lastUpdated < data.updatedAt) patched.current.delete(id);
    }
    if (patched.current.size === 0 && pendingRemoved.length === 0) return;
    const merged = mergeSmartHomePatch(data, {
      changed: [...patched.current.values()],
      removed: pendingRemoved,
    });
    if (merged !== data) utils.widget.smartHome.snapshot.setData(input, merged);
  }, [data, input, utils, query.isFetching]);

  const [attempt, setAttempt] = useState(0);
  const subscription = clientApi.widget.smartHome.subscribeEntities.useSubscription(
    subscriptionEnabled ? input : skipToken,
    {
      onStarted() {
        setIsLive(false);
      },
      onData(patch) {
        setIsLive(true);
        setLiveError(null);
        setAttempt(0);
        for (const entity of patch.changed) {
          const seen = patched.current.get(entity.id);
          if (!seen || seen.lastUpdated <= entity.lastUpdated) {
            patched.current.set(entity.id, entity);
            removed.current.delete(entity.id);
          }
        }
        for (const entityId of patch.removed) {
          patched.current.delete(entityId);
          removed.current.add(entityId);
        }
        utils.widget.smartHome.snapshot.setData(input, (previous) => mergeSmartHomePatch(previous, patch));
      },
      onError(error) {
        setIsLive(false);
        setLiveError(error instanceof Error ? error : new Error(String(error)));
      },
    },
  );

  const { status: subscriptionStatus, reset: resubscribe } = subscription;
  useEffect(() => {
    if (!subscriptionEnabled || subscriptionStatus !== "error") return;
    const delay = RESUBSCRIBE_DELAYS_MS[Math.min(attempt, RESUBSCRIBE_DELAYS_MS.length - 1)];
    const timer = setTimeout(() => {
      setAttempt((value) => value + 1);
      resubscribe();
    }, delay);
    return () => clearTimeout(timer);
  }, [subscriptionEnabled, subscriptionStatus, resubscribe, attempt]);

  return { ...query, isLive: isLive && subscriptionEnabled && liveError === null, liveError };
};

export const toSmartHomeActionInput = (action: SmartHomeAction) => {
  switch (action.type) {
    case "setTemperatureRange":
      return { action: action.type, low: action.low, high: action.high };
    case "setRgbColor":
      return { action: action.type, rgb: action.value };
    case "setEffect":
    case "setHvacMode":
    case "setPresetMode":
    case "setFanMode":
    case "setMode":
    case "selectSource":
    case "selectOption":
      return { action: action.type, option: action.value };
    case "setMuted":
    case "setOscillating":
      return { action: action.type, enabled: action.value };
    case "setBrightness":
    case "setColorTemp":
    case "setTemperature":
    case "setHumidity":
    case "setPosition":
    case "setTiltPosition":
    case "setVolume":
    case "setValue":
    case "setFanPercentage":
      return { action: action.type, value: action.value };
    case "lock":
    case "unlock":
    case "openLatch":
    case "alarmDisarm":
      return { action: action.type, code: action.code };
    case "alarmArm":
      return { action: action.type, alarmMode: action.mode, code: action.code };
    default:
      return { action: action.type };
  }
};
