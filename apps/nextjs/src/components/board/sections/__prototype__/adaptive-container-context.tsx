"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useState } from "react";

// One native smart container: activity chooses a page and its children share six rows.
export type SmartPageId = "watching" | "services";
export type PrototypeScenario = "watching" | "downloads" | "requests" | "both" | "idle";
export interface PrototypeCounts {
  playing: number;
  downloads: number;
  requests: number;
}
export interface PrototypeSettings {
  reclaimSpace: boolean;
}
export interface PrototypeState {
  counts: PrototypeCounts;
  scenario: PrototypeScenario;
  selectedPageId: SmartPageId;
  automatic: boolean;
  pausedReason: string | null;
  focusedItemId: string | null;
  focusedPlacement: { y: number; h: number } | null;
  settings: PrototypeSettings;
  draft: PrototypeSettings | null;
}
export interface SmartPage {
  id: SmartPageId;
  label: string;
  description: string;
  active: boolean;
  score: number;
}
export interface PrototypeAllocation {
  itemId: string;
  pageId: SmartPageId;
  label: string;
  count: number;
  rows: number;
  active: boolean;
  reason: string;
}
export interface AdaptiveContainerPrototypeContextValue {
  sectionId: string;
  mediaItemId: string;
  downloadsItemId: string;
  requestsItemId: string;
  savedContainerRows: number;
  state: PrototypeState;
  settings: PrototypeSettings;
  editorOpened: boolean;
  pages: SmartPage[];
  selectedPageId: SmartPageId;
  selectionReason: string;
  allocations: PrototypeAllocation[];
  setScenario: (id: PrototypeScenario) => void;
  setCount: (key: keyof PrototypeCounts, count: number) => void;
  manualSelectPage: (id: SmartPageId) => void;
  resume: () => void;
  pause: (reason: string) => void;
  openEditor: () => void;
  applyEditor: () => void;
  cancelEditor: () => void;
  setSetting: <K extends keyof PrototypeSettings>(key: K, value: PrototypeSettings[K]) => void;
  setFocusedItemId: (id: string | null, placement?: { y: number; h: number }) => void;
  reset: () => void;
}

const Context = createContext<AdaptiveContainerPrototypeContextValue | null>(null);
const scenarios: Record<PrototypeScenario, PrototypeCounts> = {
  watching: { playing: 4, downloads: 0, requests: 0 },
  downloads: { playing: 0, downloads: 6, requests: 0 },
  requests: { playing: 0, downloads: 0, requests: 5 },
  both: { playing: 0, downloads: 4, requests: 4 },
  idle: { playing: 0, downloads: 0, requests: 0 },
};

function createInitialState(): PrototypeState {
  return {
    counts: { ...scenarios.watching },
    scenario: "watching",
    selectedPageId: "watching",
    automatic: true,
    pausedReason: null,
    focusedItemId: null,
    focusedPlacement: null,
    settings: { reclaimSpace: true },
    draft: null,
  };
}

function desiredServiceRows(count: number) {
  if (count === 0) return 1;
  return Math.min(5, Math.max(2, count + 1));
}

function serviceRows(counts: PrototypeCounts): [number, number] {
  const desired: [number, number] = [desiredServiceRows(counts.downloads), desiredServiceRows(counts.requests)];
  if (desired[0] + desired[1] <= 6) return desired;
  // A quiet child's one row is already reserved above. Only two active children
  // can exceed six rows; proportion their desired heights with whole-row rounding.
  const firstShare = Math.round((6 * desired[0]) / (desired[0] + desired[1]));
  return [firstShare, 6 - firstShare];
}

function createAllocations(
  state: PrototypeState,
  ids: Pick<AdaptiveContainerPrototypeContextValue, "mediaItemId" | "downloadsItemId" | "requestsItemId">,
): PrototypeAllocation[] {
  let watchingRows = 1;
  if (state.counts.playing > 0) watchingRows = Math.min(6, Math.max(2, state.counts.playing + 2));
  const services = serviceRows(state.counts);
  let downloadsRows = services[0];
  let requestsRows = services[1];
  const focused = state.focusedPlacement;
  if (focused && state.focusedItemId === ids.mediaItemId) watchingRows = focused.h;
  if (focused && state.focusedItemId === ids.downloadsItemId) {
    downloadsRows = focused.h;
    requestsRows = Math.max(1, Math.min(requestsRows, 6 - focused.y - focused.h));
  }
  if (focused && state.focusedItemId === ids.requestsItemId) {
    requestsRows = focused.h;
    downloadsRows = Math.max(1, Math.min(downloadsRows, focused.y));
  }
  const allocations: PrototypeAllocation[] = [
    {
      itemId: ids.mediaItemId,
      pageId: "watching",
      label: "Currently playing",
      count: state.counts.playing,
      rows: watchingRows,
      active: state.counts.playing > 0,
      reason: "Current sessions grow the watching page within six rows",
    },
    {
      itemId: ids.downloadsItemId,
      pageId: "services",
      label: "Downloads",
      count: state.counts.downloads,
      rows: downloadsRows,
      active: state.counts.downloads > 0,
      reason: "Active downloads share the six-row service budget",
    },
    {
      itemId: ids.requestsItemId,
      pageId: "services",
      label: "Requests",
      count: state.counts.requests,
      rows: requestsRows,
      active: state.counts.requests > 0,
      reason: "Active requests share the six-row service budget",
    },
  ];
  for (const allocation of allocations) {
    if (!allocation.active) allocation.reason = "Quiet widget keeps a compact one-row summary";
    if (state.focusedItemId === allocation.itemId) allocation.reason = "Focused content retains its displayed geometry";
  }
  return allocations;
}

interface ProviderProps {
  sectionId: string;
  mediaItemId: string;
  downloadsItemId: string;
  requestsItemId: string;
  savedContainerRows?: number;
}

export function AdaptiveContainerPrototypeProvider(props: PropsWithChildren<ProviderProps>) {
  if (process.env.NODE_ENV === "production") return props.children;
  return <PrototypeProvider {...props} />;
}

function PrototypeProvider({
  children,
  sectionId,
  mediaItemId,
  downloadsItemId,
  requestsItemId,
}: PropsWithChildren<ProviderProps>) {
  const [state, setState] = useState(createInitialState);
  const settings = state.draft ?? state.settings;
  const update = (callback: (previous: PrototypeState) => PrototypeState) => {
    setState((previous) => {
      const next = callback(previous);
      if (!next.automatic || next.focusedItemId) return next;
      let selectedPageId: SmartPageId = "services";
      if (next.counts.playing > 0) selectedPageId = "watching";
      return { ...next, selectedPageId };
    });
  };
  const pages: [SmartPage, SmartPage] = [
    { id: "watching", label: "Watching", description: "Currently playing", active: state.counts.playing > 0, score: 0 },
    {
      id: "services",
      label: "Services",
      description: "Downloads and requests share space",
      active: state.counts.downloads + state.counts.requests > 0,
      score: 10,
    },
  ];
  if (pages[0].active) pages[0].score = 100;
  if (pages[1].active) pages[1].score = 50;
  let selectionReason = "Watching takes priority while media is playing";
  if (state.selectedPageId === "services") selectionReason = "Services is relevant while media is quiet";
  if (state.counts.playing + state.counts.downloads + state.counts.requests === 0)
    selectionReason = "Quiet services remain available as the neutral fallback";
  if (!state.automatic) selectionReason = "Manual page selection holds until Resume";
  if (state.pausedReason && !state.automatic) selectionReason = `Automatic selection paused: ${state.pausedReason}`;
  if (state.focusedItemId) selectionReason = "Focus protects this page and its current geometry";

  const value: AdaptiveContainerPrototypeContextValue = {
    sectionId,
    mediaItemId,
    downloadsItemId,
    requestsItemId,
    savedContainerRows: 6,
    state,
    settings,
    editorOpened: state.draft !== null,
    pages,
    selectedPageId: state.selectedPageId,
    selectionReason,
    allocations: createAllocations(state, { mediaItemId, downloadsItemId, requestsItemId }),
    setScenario(scenario) {
      update((previous) => ({ ...previous, scenario, counts: { ...scenarios[scenario] } }));
    },
    setCount(key, count) {
      let nextCount = 0;
      if (Number.isFinite(count)) nextCount = Math.max(0, Math.floor(count));
      update((previous) => ({ ...previous, counts: { ...previous.counts, [key]: nextCount } }));
    },
    manualSelectPage(selectedPageId) {
      update((previous) => {
        if (previous.focusedItemId) return previous;
        return { ...previous, selectedPageId, automatic: false, pausedReason: "manual selection" };
      });
    },
    resume: () => update((previous) => ({ ...previous, automatic: true, pausedReason: null })),
    pause: (reason) => update((previous) => ({ ...previous, automatic: false, pausedReason: reason })),
    openEditor: () => update((previous) => ({ ...previous, draft: { ...previous.settings } })),
    applyEditor: () =>
      update((previous) => ({ ...previous, settings: previous.draft ?? previous.settings, draft: null })),
    cancelEditor: () => update((previous) => ({ ...previous, draft: null })),
    setSetting(key, settingValue) {
      update((previous) => {
        if (previous.draft) return { ...previous, draft: { ...previous.draft, [key]: settingValue } };
        return { ...previous, settings: { ...previous.settings, [key]: settingValue } };
      });
    },
    setFocusedItemId(focusedItemId, placement) {
      update((previous) => {
        let selectedPageId = previous.selectedPageId;
        if (focusedItemId === mediaItemId) selectedPageId = "watching";
        if (focusedItemId === downloadsItemId || focusedItemId === requestsItemId) selectedPageId = "services";
        if (focusedItemId) {
          return {
            ...previous,
            focusedItemId,
            focusedPlacement: placement ?? null,
            selectedPageId,
            automatic: false,
            pausedReason: "focus",
          };
        }
        return { ...previous, focusedItemId, focusedPlacement: null, selectedPageId };
      });
    },
    reset: () => setState(createInitialState()),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useAdaptiveContainerPrototype = () => useContext(Context);
