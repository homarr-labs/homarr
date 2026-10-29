"use client";

import type { Dispatch, PropsWithChildren, SetStateAction } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Isolated native-widget prototype. Settings, selection, and timer state never persist.
export type SmartPageId = "watching" | "services" | "overview";
export type StackVariant = "A" | "B" | "C";
export type PrototypeScenario = "watching" | "downloads" | "requests" | "both" | "idle";
export interface PrototypeCounts {
  playing: number;
  downloads: number;
  requests: number;
}
export interface PrototypeSettings {
  title: string;
  mode: "manual" | "timed" | "smart" | "hybrid";
  intervalSeconds: number;
  reclaimSpace: boolean;
  skipInactive: boolean;
  pauseOnHover: boolean;
  transition: "slide" | "instant";
  accent: "violet" | "blue" | "teal";
  pageOrder: SmartPageId[];
  enabledPages: SmartPageId[];
  pageTitles: Record<SmartPageId, string>;
  priorities: Record<SmartPageId, number>;
}
interface OpeningSnapshot {
  selectedPageId: SmartPageId;
  automatic: boolean;
  pausedReason: string | null;
  elapsedSeconds: number;
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
  openingSnapshot: OpeningSnapshot | null;
  elapsedSeconds: number;
  isHovered: boolean;
  inlineEditing: boolean;
  lastSelectionReason: string;
  pendingRelevance: boolean;
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
  statsItemId: string;
  overviewClockItemId: string;
  savedContainerRows: number;
  state: PrototypeState;
  settings: PrototypeSettings;
  editorOpened: boolean;
  pages: SmartPage[];
  selectedPageId: SmartPageId;
  selectionReason: string;
  allocations: PrototypeAllocation[];
  variant: StackVariant;
  setVariant: (variant: StackVariant) => void;
  remainingSeconds: number;
  isHovered: boolean;
  setHovered: (value: boolean) => void;
  inlineEditing: boolean;
  setInlineEditing: (value: boolean) => void;
  previewHost: HTMLElement | null;
  setPreviewHost: Dispatch<SetStateAction<HTMLElement | null>>;
  setScenario: (id: PrototypeScenario) => void;
  setCount: (key: keyof PrototypeCounts, count: number) => void;
  manualSelectPage: (id: SmartPageId) => void;
  nextPage: (direction?: number) => void;
  resume: () => void;
  pause: (reason: string) => void;
  openEditor: () => void;
  applyEditor: () => void;
  cancelEditor: () => void;
  setSetting: <K extends keyof PrototypeSettings>(key: K, value: PrototypeSettings[K]) => void;
  movePage: (id: SmartPageId, direction: number) => void;
  setPageEnabled: (id: SmartPageId, enabled: boolean) => void;
  setPageTitle: (id: SmartPageId, title: string) => void;
  setPagePriority: (id: SmartPageId, priority: number) => void;
  setFocusedItemId: (id: string | null, placement?: { y: number; h: number }) => void;
  reset: () => void;
}

const Context = createContext<AdaptiveContainerPrototypeContextValue | null>(null);
const pageIds: SmartPageId[] = ["watching", "services", "overview"];
const pageTitles: Record<SmartPageId, string> = { watching: "Watching", services: "Services", overview: "Overview" };
const scenarios: Record<PrototypeScenario, PrototypeCounts> = {
  watching: { playing: 4, downloads: 0, requests: 0 },
  downloads: { playing: 0, downloads: 6, requests: 0 },
  requests: { playing: 0, downloads: 0, requests: 5 },
  both: { playing: 0, downloads: 4, requests: 4 },
  idle: { playing: 0, downloads: 0, requests: 0 },
};

function defaultSettings(): PrototypeSettings {
  return {
    title: "Smart stack",
    mode: "hybrid",
    intervalSeconds: 12,
    reclaimSpace: false,
    skipInactive: false,
    pauseOnHover: true,
    transition: "slide",
    accent: "violet",
    pageOrder: [...pageIds],
    enabledPages: [...pageIds],
    pageTitles: { ...pageTitles },
    priorities: { watching: 100, services: 70, overview: 10 },
  };
}

function copySettings(settings: PrototypeSettings): PrototypeSettings {
  return {
    ...settings,
    pageOrder: [...settings.pageOrder],
    enabledPages: [...settings.enabledPages],
    pageTitles: { ...settings.pageTitles },
    priorities: { ...settings.priorities },
  };
}

function normalizeSettings(settings: PrototypeSettings): PrototypeSettings {
  const next = copySettings(settings);
  next.intervalSeconds = Math.min(120, Math.max(5, Math.round(next.intervalSeconds) || 12));
  next.pageOrder = [...new Set(next.pageOrder.filter((id) => pageIds.includes(id)))];
  for (const id of pageIds) if (!next.pageOrder.includes(id)) next.pageOrder.push(id);
  next.enabledPages = next.pageOrder.filter((id) => next.enabledPages.includes(id));
  if (next.enabledPages.length === 0) next.enabledPages = [next.pageOrder[0] ?? "watching"];
  for (const id of pageIds) {
    next.pageTitles[id] = next.pageTitles[id].slice(0, 64);
    next.priorities[id] = Math.min(100, Math.max(0, Math.round(next.priorities[id]) || 0));
  }
  return next;
}

function createInitialState(): PrototypeState {
  return {
    counts: { playing: 1, downloads: 3, requests: 2 },
    scenario: "both",
    selectedPageId: "watching",
    automatic: true,
    pausedReason: null,
    focusedItemId: null,
    focusedPlacement: null,
    settings: defaultSettings(),
    draft: null,
    openingSnapshot: null,
    elapsedSeconds: 0,
    isHovered: false,
    inlineEditing: false,
    lastSelectionReason: "Watching has the highest relevance",
    pendingRelevance: false,
  };
}

const settingsFor = (state: PrototypeState) => state.draft ?? state.settings;
function pageActive(id: SmartPageId, counts: PrototypeCounts) {
  if (id === "watching") return counts.playing > 0;
  if (id === "services") return counts.downloads + counts.requests > 0;
  return true;
}
function pageScore(id: SmartPageId, state: PrototypeState) {
  if (!pageActive(id, state.counts)) return 0;
  return settingsFor(state).priorities[id];
}
function enabledOrder(state: PrototypeState) {
  const settings = settingsFor(state);
  return settings.pageOrder.filter((id) => settings.enabledPages.includes(id));
}
function rotationOrder(state: PrototypeState) {
  const enabled = enabledOrder(state);
  if (!settingsFor(state).skipInactive) return enabled;
  const active = enabled.filter((id) => pageActive(id, state.counts));
  if (active.length > 0) return active;
  return enabled;
}
function ensureSelected(state: PrototypeState): PrototypeState {
  if (state.focusedItemId || enabledOrder(state).includes(state.selectedPageId)) return state;
  return {
    ...state,
    selectedPageId: enabledOrder(state)[0] ?? "watching",
    elapsedSeconds: 0,
    lastSelectionReason: "The selected page was disabled; moved to an enabled page",
  };
}
function mostRelevant(state: PrototypeState) {
  const order = rotationOrder(state);
  let best = order[0] ?? state.selectedPageId;
  if (order.includes(state.selectedPageId)) best = state.selectedPageId;
  for (const id of order) if (pageScore(id, state) > pageScore(best, state)) best = id;
  return best;
}
function canRotate(state: PrototypeState, documentHidden: boolean) {
  const settings = settingsFor(state);
  if (
    !state.automatic ||
    settings.mode === "manual" ||
    state.draft ||
    state.inlineEditing ||
    state.focusedItemId ||
    documentHidden
  )
    return false;
  if (settings.pauseOnHover && state.isHovered) return false;
  return true;
}
function promoteRelevant(state: PrototypeState, documentHidden: boolean): PrototypeState {
  const next = ensureSelected(state);
  const mode = settingsFor(next).mode;
  if (mode !== "smart" && mode !== "hybrid") return { ...next, pendingRelevance: false };
  if (!canRotate(next, documentHidden)) return { ...next, pendingRelevance: true };
  const best = mostRelevant(next);
  if (best === next.selectedPageId) return { ...next, pendingRelevance: false };
  return {
    ...next,
    selectedPageId: best,
    elapsedSeconds: 0,
    lastSelectionReason: "Activity promoted the most relevant enabled page",
    pendingRelevance: false,
  };
}
function adjacentPage(state: PrototypeState, direction: number, automatic: boolean) {
  let order = enabledOrder(state);
  if (automatic) order = rotationOrder(state);
  const currentIndex = order.indexOf(state.selectedPageId);
  let step = 1;
  if (direction < 0) step = -1;
  let index = currentIndex + step;
  if (currentIndex < 0) index = 0;
  return order[(index + order.length) % order.length] ?? state.selectedPageId;
}
function navigatePage(state: PrototypeState, selectedPageId: SmartPageId): PrototypeState {
  if (state.focusedItemId || !enabledOrder(state).includes(selectedPageId)) return state;
  if (state.draft || state.inlineEditing) {
    return {
      ...state,
      selectedPageId,
      elapsedSeconds: 0,
      lastSelectionReason: "Previewing an enabled page while editing",
    };
  }
  return {
    ...state,
    selectedPageId,
    automatic: false,
    pausedReason: "manual selection",
    elapsedSeconds: 0,
    lastSelectionReason: "Manual page selection holds until Resume",
  };
}
function tick(state: PrototypeState, documentHidden: boolean): PrototypeState {
  const mode = settingsFor(state).mode;
  if (!canRotate(state, documentHidden) || (mode !== "timed" && mode !== "hybrid")) return state;
  const elapsedSeconds = state.elapsedSeconds + 1;
  if (elapsedSeconds < settingsFor(state).intervalSeconds) return { ...state, elapsedSeconds };
  return {
    ...state,
    selectedPageId: adjacentPage(state, 1, true),
    elapsedSeconds: 0,
    lastSelectionReason: "The interval advanced to the next enabled page",
  };
}

function desiredServiceRows(count: number) {
  if (count === 0) return 1;
  return Math.min(5, Math.max(2, count + 1));
}
function serviceRows(counts: PrototypeCounts): [number, number] {
  const desired: [number, number] = [desiredServiceRows(counts.downloads), desiredServiceRows(counts.requests)];
  if (desired[0] + desired[1] <= 6) return desired;
  const firstShare = Math.round((6 * desired[0]) / (desired[0] + desired[1]));
  return [firstShare, 6 - firstShare];
}
function createAllocations(
  state: PrototypeState,
  ids: Pick<
    AdaptiveContainerPrototypeContextValue,
    "mediaItemId" | "downloadsItemId" | "requestsItemId" | "statsItemId" | "overviewClockItemId"
  >,
): PrototypeAllocation[] {
  const settings = settingsFor(state);
  let watchingRows = 6;
  let clockRows = 5;
  if (settings.reclaimSpace) {
    watchingRows = 1;
    if (state.counts.playing > 0) watchingRows = Math.min(6, Math.max(2, state.counts.playing + 2));
    clockRows = 2;
  }
  const services = serviceRows(state.counts);
  let downloadsRows = services[0];
  let requestsRows = services[1];
  const focused = state.focusedPlacement;
  if (focused && state.focusedItemId === ids.mediaItemId) watchingRows = focused.h;
  if (focused && state.focusedItemId === ids.overviewClockItemId) clockRows = focused.h;
  if (focused && state.focusedItemId === ids.statsItemId) clockRows = Math.max(1, Math.min(clockRows, focused.y));
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
      reason: "Current sessions occupy the selected watching page",
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
    {
      itemId: ids.overviewClockItemId,
      pageId: "overview",
      label: "Clock",
      count: 1,
      rows: clockRows,
      active: true,
      reason: "The configured clock is always available",
    },
    {
      itemId: ids.statsItemId,
      pageId: "overview",
      label: "Statistics",
      count: state.counts.playing,
      rows: 1,
      active: true,
      reason: "Numeric zero does not hide the configured statistics",
    },
  ];
  for (const allocation of allocations) {
    if (!allocation.active && allocation.pageId === "services")
      allocation.reason = "Quiet widget keeps a compact one-row summary";
    if (state.focusedItemId === allocation.itemId) allocation.reason = "Focused content retains its displayed geometry";
  }
  return allocations;
}

interface ProviderProps {
  sectionId: string;
  mediaItemId: string;
  downloadsItemId: string;
  requestsItemId: string;
  statsItemId: string;
  overviewClockItemId: string;
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
  statsItemId,
  overviewClockItemId,
}: PropsWithChildren<ProviderProps>) {
  const [state, setState] = useState(createInitialState);
  const [previewHost, setPreviewHost] = useState<HTMLElement | null>(null);
  const documentHiddenRef = useRef(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  let variant: StackVariant = "A";
  const requestedVariant = searchParams.get("variant");
  if (requestedVariant === "B" || requestedVariant === "C") variant = requestedVariant;
  const openingVariantRef = useRef(variant);
  const settings = settingsFor(state);

  useEffect(() => {
    const updateVisibility = () => {
      documentHiddenRef.current = document.hidden;
      setDocumentHidden(document.hidden);
      if (!document.hidden) {
        setState((previous) => {
          if (!previous.pendingRelevance) return previous;
          return promoteRelevant(previous, false);
        });
      }
    };
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    const interval = window.setInterval(() => setState((previous) => tick(previous, documentHiddenRef.current)), 1000);
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      window.clearInterval(interval);
    };
  }, []);

  const update = (callback: (previous: PrototypeState) => PrototypeState, relevance = false) => {
    setState((previous) => {
      const updated = callback(previous);
      if (updated === previous) return previous;
      const next = ensureSelected(updated);
      if (relevance) return promoteRelevant(next, documentHiddenRef.current);
      return next;
    });
  };
  const editSettings = (callback: (previous: PrototypeSettings) => PrototypeSettings) => {
    update((previous) => {
      const nextSettings = normalizeSettings(callback(copySettings(settingsFor(previous))));
      if (previous.draft)
        return {
          ...previous,
          draft: nextSettings,
          elapsedSeconds: Math.min(previous.elapsedSeconds, nextSettings.intervalSeconds - 1),
        };
      return { ...previous, settings: nextSettings, elapsedSeconds: 0 };
    }, true);
  };
  const navigate = (selectedPageId: SmartPageId) => {
    update((previous) => navigatePage(previous, selectedPageId));
  };
  const closeEditor = (apply: boolean) => {
    if (!apply) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", openingVariantRef.current);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    setState((previous) => {
      if (!previous.draft) return previous;
      let nextSettings = previous.settings;
      if (apply) nextSettings = copySettings(previous.draft);
      const snapshot = previous.openingSnapshot;
      const next = {
        ...previous,
        settings: nextSettings,
        draft: null,
        openingSnapshot: null,
        focusedItemId: null,
        focusedPlacement: null,
        // The native widget surface returns from a modal portal, so its former
        // pointer boundary no longer establishes whether the stack is hovered.
        isHovered: false,
      };
      let restored = ensureSelected(next);
      if (snapshot) {
        let elapsedSeconds = Math.min(snapshot.elapsedSeconds, nextSettings.intervalSeconds - 1);
        if (
          apply &&
          (nextSettings.mode !== previous.settings.mode ||
            nextSettings.intervalSeconds !== previous.settings.intervalSeconds)
        )
          elapsedSeconds = 0;
        restored = ensureSelected({
          ...next,
          ...snapshot,
          elapsedSeconds,
        });
      }
      if (!restored.automatic) return restored;
      return promoteRelevant(restored, documentHiddenRef.current);
    });
  };
  const pages = settings.pageOrder.map(
    (id): SmartPage => ({
      id,
      label: settings.pageTitles[id] || pageTitles[id],
      active: pageActive(id, state.counts),
      score: pageScore(id, state),
      description: {
        watching: "Currently playing",
        services: "Downloads and requests",
        overview: "Clock and statistics",
      }[id],
    }),
  );
  let selectionReason = state.lastSelectionReason;
  if (settings.mode === "manual") selectionReason = "Manual mode changes pages only when you navigate";
  if (!state.automatic) selectionReason = `Automatic selection paused: ${state.pausedReason ?? "manual hold"}`;
  if (settings.pauseOnHover && state.isHovered) selectionReason = "Rotation pauses while the pointer is over the stack";
  if (state.focusedItemId) selectionReason = "Focus protects this page and its current geometry";
  if (state.inlineEditing) selectionReason = "Inline editing pauses rotation";
  if (state.draft)
    selectionReason = "Settings preview pauses rotation; closing restores your prior selection preference";
  if (documentHidden) selectionReason = "Rotation pauses while this browser tab is hidden";

  const value: AdaptiveContainerPrototypeContextValue = {
    sectionId,
    mediaItemId,
    downloadsItemId,
    requestsItemId,
    statsItemId,
    overviewClockItemId,
    savedContainerRows: 6,
    state,
    settings,
    editorOpened: state.draft !== null,
    pages,
    selectedPageId: state.selectedPageId,
    selectionReason,
    allocations: createAllocations(state, {
      mediaItemId,
      downloadsItemId,
      requestsItemId,
      statsItemId,
      overviewClockItemId,
    }),
    variant,
    remainingSeconds: Math.max(0, settings.intervalSeconds - state.elapsedSeconds),
    isHovered: state.isHovered,
    inlineEditing: state.inlineEditing,
    previewHost,
    setPreviewHost,
    setVariant(nextVariant) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", nextVariant);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    setHovered(isHovered) {
      update((previous) => {
        const next = { ...previous, isHovered };
        if (!isHovered && next.pendingRelevance) return promoteRelevant(next, documentHiddenRef.current);
        return next;
      });
    },
    setInlineEditing: (inlineEditing) => update((previous) => ({ ...previous, inlineEditing }), !inlineEditing),
    setScenario(scenario) {
      update((previous) => {
        const counts = scenarios[scenario];
        if (
          previous.scenario === scenario &&
          previous.counts.playing === counts.playing &&
          previous.counts.downloads === counts.downloads &&
          previous.counts.requests === counts.requests
        )
          return previous;
        return { ...previous, scenario, counts: { ...counts } };
      }, true);
    },
    setCount(key, count) {
      let nextCount = 0;
      if (Number.isFinite(count)) nextCount = Math.max(0, Math.floor(count));
      update((previous) => {
        if (previous.counts[key] === nextCount) return previous;
        return { ...previous, counts: { ...previous.counts, [key]: nextCount } };
      }, true);
    },
    manualSelectPage: navigate,
    nextPage(direction = 1) {
      update((previous) => navigatePage(previous, adjacentPage(previous, direction, false)));
    },
    resume: () =>
      update(
        (previous) => ({
          ...previous,
          automatic: true,
          pausedReason: null,
          elapsedSeconds: 0,
          lastSelectionReason: "Automatic selection resumed",
        }),
        true,
      ),
    pause: (reason) => update((previous) => ({ ...previous, automatic: false, pausedReason: reason })),
    openEditor: () => {
      if (state.draft) return;
      openingVariantRef.current = variant;
      update((previous) => {
        if (previous.draft) return previous;
        return {
          ...previous,
          draft: copySettings(previous.settings),
          openingSnapshot: {
            selectedPageId: previous.selectedPageId,
            automatic: previous.automatic,
            pausedReason: previous.pausedReason,
            elapsedSeconds: previous.elapsedSeconds,
          },
        };
      });
    },
    applyEditor: () => closeEditor(true),
    cancelEditor: () => closeEditor(false),
    setSetting(key, settingValue) {
      editSettings((previous) => ({ ...previous, [key]: settingValue }));
    },
    movePage(id, direction) {
      editSettings((previous) => {
        const pageOrder = [...previous.pageOrder];
        const current = pageOrder.indexOf(id);
        let offset = 1;
        if (direction < 0) offset = -1;
        const target = Math.max(0, Math.min(pageOrder.length - 1, current + offset));
        if (current < 0 || current === target) return previous;
        pageOrder.splice(current, 1);
        pageOrder.splice(target, 0, id);
        return { ...previous, pageOrder };
      });
    },
    setPageEnabled(id, enabled) {
      editSettings((previous) => {
        let enabledPages = previous.enabledPages.filter((pageId) => pageId !== id);
        if (enabled) enabledPages = [...enabledPages, id];
        if (enabledPages.length === 0) return previous;
        return { ...previous, enabledPages };
      });
    },
    setPageTitle: (id, title) =>
      editSettings((previous) => ({ ...previous, pageTitles: { ...previous.pageTitles, [id]: title } })),
    setPagePriority: (id, priority) =>
      editSettings((previous) => ({ ...previous, priorities: { ...previous.priorities, [id]: priority } })),
    setFocusedItemId(focusedItemId, placement) {
      update((previous) => {
        let selectedPageId = previous.selectedPageId;
        if (focusedItemId === mediaItemId) selectedPageId = "watching";
        if (focusedItemId === downloadsItemId || focusedItemId === requestsItemId) selectedPageId = "services";
        if (focusedItemId === statsItemId || focusedItemId === overviewClockItemId) selectedPageId = "overview";
        if (focusedItemId)
          return {
            ...previous,
            focusedItemId,
            focusedPlacement: placement ?? null,
            selectedPageId,
            automatic: false,
            pausedReason: "focus",
          };
        return { ...previous, focusedItemId, focusedPlacement: null };
      });
    },
    reset: () => setState(createInitialState()),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useAdaptiveContainerPrototype = () => useContext(Context);
