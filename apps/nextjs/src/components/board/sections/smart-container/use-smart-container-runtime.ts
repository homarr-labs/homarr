"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SmartContainerOptions } from "@homarr/validation/smart-container";
import { useWidgetActivities } from "@homarr/widgets/activity";

import { resolveSmartContainerStates, selectSmartContainerPolicy } from "./smart-container-selection";

export type { ResolvedSmartContainerState } from "./smart-container-selection";

interface RuntimeInput {
  options: SmartContainerOptions;
  items: readonly { id: string }[];
  isEditMode: boolean;
  isCollapsed?: boolean;
  isPreview?: boolean;
  previewStateId?: string;
}

export const useSmartContainerRuntime = ({
  options,
  items,
  isEditMode,
  isCollapsed = false,
  isPreview = false,
  previewStateId,
}: RuntimeInput) => {
  const activities = useWidgetActivities();
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState(
    () => options.fallbackStateId ?? options.states.find((state) => state.enabled)?.id,
  );
  const [hold, setHold] = useState<"manual" | "focus" | "paused" | null>(null);
  const [isHovered, setHovered] = useState(false);
  const [isDocumentHidden, setDocumentHidden] = useState(false);
  const [clock, setClock] = useState(() => ({ mode: options.mode, interval: options.intervalSeconds, elapsed: 0 }));
  const clockMatches = clock.mode === options.mode && clock.interval === options.intervalSeconds;
  const elapsedSeconds = clockMatches ? clock.elapsed : 0;
  const lastSelectionAt = useRef(0);
  const hasShownActivity = useRef(false);
  const itemIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const observationTime = Math.max(now, Date.now());
  const states = useMemo(
    () => resolveSmartContainerStates(options.states, itemIds, activities, observationTime),
    [options.states, itemIds, activities, observationTime],
  );
  const currentState = states.find((state) => state.id === selectedId) ?? states[0];
  let selectedState = currentState;
  if (previewStateId) selectedState = states.find((state) => state.id === previewStateId) ?? currentState;
  const selectedStateId = selectedState?.id;
  const policy = useMemo(
    () => selectSmartContainerPolicy(states, options, currentState?.id),
    [states, options, currentState?.id],
  );
  const { canRotate } = policy;
  const memberIds = useMemo(() => new Set(states.flatMap((state) => state.itemIds)), [states]);

  let pauseReason: "manual" | "focus" | "paused" | "editing" | "hidden" | "hover" | "collapsed" | null = hold;
  if (isEditMode || previewStateId) pauseReason = "editing";
  else if (isDocumentHidden) pauseReason = "hidden";
  else if (isCollapsed) pauseReason = "collapsed";
  else if (options.pauseOnHover && isHovered && !hold) pauseReason = "hover";
  const isPaused = pauseReason !== null || !options.enabled;

  useEffect(() => {
    const updateVisibility = () => setDocumentHidden(document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (isPreview) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pauseForReducedMotion = () => {
      if (motion.matches) setHold((current) => current ?? "paused");
    };
    pauseForReducedMotion();
    motion.addEventListener("change", pauseForReducedMotion);
    return () => motion.removeEventListener("change", pauseForReducedMotion);
  }, [isPreview]);

  useEffect(() => {
    const currentTime = Date.now();
    const expirations = [...memberIds]
      .map((id) => activities[id])
      .filter((activity) => activity !== undefined)
      .filter((activity) => activity.status !== "unknown" && activity.updatedAt > 0)
      .map((activity) => activity.updatedAt + activity.freshForMs + 1)
      .filter((expiration) => expiration > observationTime);
    if (expirations.length === 0) return;
    const timeout = window.setTimeout(() => setNow(Date.now()), Math.max(1, Math.min(...expirations) - currentTime));
    return () => window.clearTimeout(timeout);
  }, [activities, memberIds, observationTime]);

  const resetClock = useCallback(() => {
    setClock({ mode: options.mode, interval: options.intervalSeconds, elapsed: 0 });
  }, [options.mode, options.intervalSeconds]);

  const changeState = useCallback(
    (id: string) => {
      setSelectedId(id);
      resetClock();
      lastSelectionAt.current = Date.now();
    },
    [resetClock],
  );

  const selectState = useCallback(
    (id: string) => {
      if (!states.some((state) => state.id === id)) return;
      setHold("manual");
      changeState(id);
    },
    [states, changeState],
  );

  const moveState = useCallback(
    (direction: -1 | 1) => {
      if (states.length === 0) return;
      const currentIndex = states.findIndex((state) => state.id === selectedStateId);
      const index = (Math.max(currentIndex, 0) + direction + states.length) % states.length;
      const next = states[index];
      if (next) selectState(next.id);
    },
    [states, selectedStateId, selectState],
  );
  const previousState = useCallback(() => moveState(-1), [moveState]);
  const nextState = useCallback(() => moveState(1), [moveState]);
  const resume = useCallback(() => {
    setHold(null);
    resetClock();
    lastSelectionAt.current = 0;
  }, [resetClock]);
  const pause = useCallback(() => setHold("paused"), []);
  const holdForFocus = useCallback(() => setHold((previous) => previous ?? "focus"), []);

  useEffect(() => {
    if (!clockMatches) resetClock();
  }, [clockMatches, resetClock]);

  useEffect(() => {
    if (isPaused || !canRotate || (options.mode !== "timed" && options.mode !== "hybrid")) return;
    const interval = window.setInterval(() => {
      setClock((previous) => {
        const elapsed =
          previous.mode === options.mode && previous.interval === options.intervalSeconds ? previous.elapsed : 0;
        return {
          mode: options.mode,
          interval: options.intervalSeconds,
          elapsed: Math.min(elapsed + 1, options.intervalSeconds),
        };
      });
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [isPaused, canRotate, options.mode, options.intervalSeconds]);

  useEffect(() => {
    if (isPaused) return;
    if (currentState?.activity === "active") hasShownActivity.current = true;
    if (options.mode !== "manual") {
      const best = policy.target;
      if (best && best.id !== currentState?.id) {
        const remaining = 5_000 - (Date.now() - lastSelectionAt.current);
        if (
          options.mode === "timed" ||
          remaining <= 0 ||
          !currentState?.enabled ||
          (policy.moreRelevant && !hasShownActivity.current)
        ) {
          if (best.activity === "active") hasShownActivity.current = true;
          changeState(best.id);
          return;
        }
        const timeout = window.setTimeout(() => setNow(Date.now()), remaining);
        return () => window.clearTimeout(timeout);
      }
    }
    if (options.mode !== "timed" && options.mode !== "hybrid") return;
    if (elapsedSeconds < options.intervalSeconds || !canRotate) return;
    const next = policy.next;
    if (!next) return;
    changeState(next.id);
  }, [
    isPaused,
    elapsedSeconds,
    options.mode,
    options.intervalSeconds,
    policy,
    canRotate,
    currentState,
    now,
    changeState,
  ]);

  return {
    activities,
    states,
    selectedState,
    selectedStateId,
    selectState,
    previousState,
    nextState,
    resume,
    pause,
    setHovered,
    holdForFocus,
    pauseReason,
    isPaused,
    canRotate,
    remainingSeconds: Math.max(0, options.intervalSeconds - elapsedSeconds),
    now: observationTime,
  };
};
