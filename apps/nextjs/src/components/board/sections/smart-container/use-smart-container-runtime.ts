"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SmartContainerOptions, SmartContainerState } from "@homarr/validation/smart-container";
import { resolveSmartContainerMembership } from "@homarr/validation/smart-container";
import { getWidgetActivity, useWidgetActivities } from "@homarr/widgets/activity";
import type { WidgetActivities } from "@homarr/widgets/activity";

export interface ResolvedSmartContainerState extends SmartContainerState {
  activity: "active" | "quiet" | "unknown";
  count: number;
}

interface RuntimeInput {
  options: SmartContainerOptions;
  items: readonly { id: string }[];
  isEditMode: boolean;
  isCollapsed?: boolean;
  isPreview?: boolean;
  previewStateId?: string;
}

const resolveStates = (
  states: readonly SmartContainerState[],
  itemIds: ReadonlySet<string>,
  activities: WidgetActivities,
  now: number,
): ResolvedSmartContainerState[] => {
  return resolveSmartContainerMembership(states, itemIds).map((state) => {
    const members = state.itemIds;
    const statuses = members.map((id) => getWidgetActivity(activities[id], now));
    let activity: ResolvedSmartContainerState["activity"] = "unknown";
    if (members.length === 0) activity = "quiet";
    if (statuses.some((status) => status === "active")) activity = "active";
    else if (statuses.length > 0 && statuses.every((status) => status === "quiet")) activity = "quiet";
    const count = members.reduce((total, id) => {
      if (getWidgetActivity(activities[id], now) !== "active") return total;
      return total + (activities[id]?.count ?? 0);
    }, 0);
    return { ...state, itemIds: members, activity, count };
  });
};

const getRank = (state: ResolvedSmartContainerState) => {
  let category = 1;
  if (state.activity === "active") category = 2;
  if (state.activity === "quiet") category = 0;
  return category * 1_000_000 + state.priority * 1_000 + Math.min(state.count, 99);
};

const chooseRelevantState = (states: readonly ResolvedSmartContainerState[], currentId: string | undefined) => {
  let best = states.find((state) => state.id === currentId) ?? states[0];
  for (const state of states) {
    if (!best || getRank(state) > getRank(best)) best = state;
  }
  return best;
};

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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const lastSelectionAt = useRef(Date.now());
  const lastReconciledEvent = useRef("");
  const itemIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const states = useMemo(
    () => resolveStates(options.states, itemIds, activities, now),
    [options.states, itemIds, activities, now],
  );
  const currentState = states.find((state) => state.id === selectedId) ?? states[0];
  let selectedState = currentState;
  if (previewStateId) selectedState = states.find((state) => state.id === previewStateId) ?? currentState;
  const selectedStateId = selectedState?.id;
  const eventKey = states
    .map((state) => `${state.id}:${state.enabled}:${state.priority}:${state.activity}:${state.count}`)
    .join("|");
  const automaticStates = useMemo(() => {
    return states.filter((state) => state.enabled && (!options.skipInactive || state.activity !== "quiet"));
  }, [options.skipInactive, states]);
  const fallback =
    states.find((state) => state.enabled && state.id === options.fallbackStateId) ??
    states.find((state) => state.enabled);
  const canRotate = automaticStates.some((state) => state.id !== currentState?.id);

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
    const timeout = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timeout);
  }, []);

  const changeState = useCallback((id: string) => {
    setSelectedId(id);
    setElapsedSeconds(0);
    lastSelectionAt.current = Date.now();
  }, []);

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
    setElapsedSeconds(0);
    lastReconciledEvent.current = "";
  }, []);
  const pause = useCallback(() => setHold("paused"), []);
  const holdForFocus = useCallback(() => setHold((previous) => previous ?? "focus"), []);

  useEffect(() => {
    setElapsedSeconds(0);
  }, [options.mode, options.intervalSeconds]);

  useEffect(() => {
    lastReconciledEvent.current = "";
  }, [options.mode, options.skipInactive, options.enabled, options.fallbackStateId]);

  useEffect(() => {
    if (isPaused || !canRotate || (options.mode !== "timed" && options.mode !== "hybrid")) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((elapsed) => Math.min(elapsed + 1, options.intervalSeconds));
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [isPaused, canRotate, options.mode, options.intervalSeconds]);

  // Resolve data and timer events together so a timer boundary cannot overwrite
  // a more relevant state selected by incoming data in the same render.
  useEffect(() => {
    if (isPaused) return;
    const usesRelevance = options.mode === "smart" || options.mode === "hybrid";
    if (usesRelevance && lastReconciledEvent.current !== eventKey && now - lastSelectionAt.current >= 5_000) {
      const activeStates = automaticStates.filter((state) => state.activity === "active");
      const relevant = chooseRelevantState(activeStates, currentState?.id);
      const preserveUnknown = !options.fallbackStateId && currentState?.enabled && currentState.activity === "unknown";
      const best = relevant ?? (preserveUnknown ? currentState : fallback);
      lastReconciledEvent.current = eventKey;
      if (best && best.id !== currentState?.id) {
        changeState(best.id);
        return;
      }
    }
    if (options.mode !== "timed" && options.mode !== "hybrid") return;
    if (elapsedSeconds < options.intervalSeconds || !canRotate) return;
    const currentIndex = automaticStates.findIndex((state) => state.id === currentState?.id);
    const next = automaticStates[(currentIndex + 1) % automaticStates.length];
    if (!next) return;
    lastReconciledEvent.current = eventKey;
    changeState(next.id);
  }, [
    isPaused,
    elapsedSeconds,
    options.mode,
    options.intervalSeconds,
    options.fallbackStateId,
    automaticStates,
    canRotate,
    currentState?.id,
    eventKey,
    fallback,
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
    now,
  };
};
