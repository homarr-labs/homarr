"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Throwaway native-board experiment. All state and activity data remain in memory.
export type PrototypeVariant = "A" | "B" | "C";
export type PrototypeProbeStatus = "success" | "loading" | "error" | "partial" | "stale" | "unconfigured" | "forbidden";
export interface PrototypeSettings {
  hideInactive: boolean;
  showFallback: boolean;
  fitStrategy: "compact" | "details";
  shrinkContainer: boolean;
}
export interface PrototypeProbe {
  status: PrototypeProbeStatus;
  playing: number;
  paused: number;
  observedAt: number;
  idleSince: number | null;
  refreshing: boolean;
}
export interface PrototypeState {
  now: number;
  probe: PrototypeProbe;
  settings: PrototypeSettings;
  draft: PrototypeSettings | null;
  selectedId: string;
  automatic: boolean;
  pausedReason: string | null;
  focusedItemId: string | null;
  focusedPlacement: { y: number; h: number } | null;
}
export interface PrototypeActivity {
  kind: "active" | "inactive" | "unknown" | "error";
  reason: string;
  pendingSeconds: number | null;
  age: number;
  canHide: boolean;
}
export interface AdaptiveContainerPrototypeContextValue {
  sectionId: string;
  mediaItemId: string;
  statsItemId: string;
  mediaSavedRows: number;
  savedContainerRows: number;
  variant: PrototypeVariant;
  setVariant: (value: PrototypeVariant) => void;
  state: PrototypeState;
  settings: PrototypeSettings;
  activity: PrototypeActivity;
  editorOpened: boolean;
  openEditor: () => void;
  applyEditor: () => void;
  cancelEditor: () => void;
  setSetting: <K extends keyof PrototypeSettings>(key: K, value: PrototypeSettings[K]) => void;
  setProbe: (probe: Pick<PrototypeProbe, "status"> & Partial<Pick<PrototypeProbe, "playing" | "paused">>) => void;
  backgroundRefresh: () => void;
  advance: (seconds: number) => void;
  manualSelect: (id: string) => void;
  resume: () => void;
  pause: (reason: string) => void;
  setFocusedItemId: (id: string | null, placement?: { y: number; h: number }) => void;
  reset: () => void;
}

const Context = createContext<AdaptiveContainerPrototypeContextValue | null>(null);
const defaults = (): PrototypeSettings => ({
  hideInactive: true,
  showFallback: true,
  fitStrategy: "compact",
  shrinkContainer: false,
});

function createInitialState(mediaItemId: string): PrototypeState {
  return {
    now: 0,
    probe: { status: "success", playing: 1, paused: 0, observedAt: 0, idleSince: null, refreshing: false },
    settings: defaults(),
    draft: null,
    selectedId: mediaItemId,
    automatic: true,
    pausedReason: null,
    focusedItemId: null,
    focusedPlacement: null,
  };
}

export function getPrototypeActivity(state: PrototypeState): PrototypeActivity {
  const probe = state.probe;
  const age = Math.max(0, state.now - probe.observedAt);
  const result: PrototypeActivity = {
    kind: "unknown",
    reason: "Waiting for a complete fresh observation",
    pendingSeconds: null,
    age,
    canHide: false,
  };
  if (["error", "partial", "forbidden", "unconfigured"].includes(probe.status)) {
    result.kind = "error";
    result.reason = "A service or configuration fault stays visible";
    if (probe.status === "partial") result.reason = "A partial failure cannot establish inactivity";
    return result;
  }
  if (probe.status === "loading") return result;
  if (probe.status === "stale" || age >= 30) {
    result.reason = "Observation expired; keep the item visible";
    return result;
  }
  if (probe.playing + probe.paused > 0) {
    result.kind = "active";
    result.reason = "Current sessions, including paused sessions, remain visible";
    return result;
  }
  result.kind = "inactive";
  result.pendingSeconds = 10;
  if (probe.idleSince !== null) result.pendingSeconds = Math.max(0, 10 - (state.now - probe.idleSince));
  result.canHide = result.pendingSeconds === 0;
  result.reason = "Fresh empty observation confirmed";
  if (result.pendingSeconds > 0) result.reason = `Empty observation; ${result.pendingSeconds}s of grace remaining`;
  if (probe.refreshing) result.reason += "; background refresh retains this decision";
  return result;
}

interface ProviderProps {
  sectionId: string;
  mediaItemId: string;
  statsItemId: string;
  mediaSavedRows?: number;
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
  statsItemId,
  mediaSavedRows = 3,
  savedContainerRows = 6,
}: PropsWithChildren<ProviderProps>) {
  const [state, setState] = useState(() => createInitialState(mediaItemId));
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requestedVariant = searchParams.get("variant");
  let variant: PrototypeVariant = "A";
  if (requestedVariant === "B" || requestedVariant === "C") variant = requestedVariant;
  const settings = state.draft ?? state.settings;
  const activity = getPrototypeActivity(state);

  const update = (callback: (previous: PrototypeState) => PrototypeState) => {
    setState((previous) => {
      let next = callback(previous);
      const effectiveSettings = next.draft ?? next.settings;
      if (next.selectedId === statsItemId && !effectiveSettings.showFallback && next.focusedItemId !== statsItemId)
        next = { ...next, selectedId: mediaItemId };
      if (!next.automatic || next.focusedItemId) return next;
      let selectedId = mediaItemId;
      const nextActivity = getPrototypeActivity(next);
      if (nextActivity.canHide && effectiveSettings.hideInactive && effectiveSettings.showFallback)
        selectedId = statsItemId;
      return { ...next, selectedId };
    });
  };

  const value: AdaptiveContainerPrototypeContextValue = {
    sectionId,
    mediaItemId,
    statsItemId,
    mediaSavedRows,
    savedContainerRows,
    variant,
    state,
    settings,
    activity,
    editorOpened: state.draft !== null,
    setVariant(nextVariant) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", nextVariant);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
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
    setProbe(input) {
      update((previous) => {
        const probe = { ...previous.probe, ...input, refreshing: false, idleSince: null };
        if (input.status === "success") {
          probe.observedAt = previous.now;
          if (probe.playing + probe.paused === 0) {
            probe.idleSince = previous.now;
            if (
              previous.probe.status === "success" &&
              previous.now - previous.probe.observedAt < 30 &&
              previous.probe.playing + previous.probe.paused === 0
            )
              probe.idleSince = previous.probe.idleSince;
          }
        }
        if (input.status === "forbidden" || input.status === "unconfigured") {
          probe.playing = 0;
          probe.paused = 0;
        }
        return { ...previous, probe };
      });
    },
    backgroundRefresh: () => update((previous) => ({ ...previous, probe: { ...previous.probe, refreshing: true } })),
    advance(seconds) {
      update((previous) => {
        const now = previous.now + Math.max(0, seconds);
        const probe = { ...previous.probe };
        if (probe.status === "success" && now - probe.observedAt >= 30) {
          probe.status = "stale";
          probe.idleSince = null;
          probe.refreshing = false;
        }
        return { ...previous, now, probe };
      });
    },
    manualSelect: (selectedId) =>
      update((previous) => ({ ...previous, selectedId, automatic: false, pausedReason: "manual selection" })),
    resume: () => update((previous) => ({ ...previous, automatic: true, pausedReason: null })),
    pause: (reason) => update((previous) => ({ ...previous, automatic: false, pausedReason: reason })),
    setFocusedItemId: (focusedItemId, placement) =>
      update((previous) => ({ ...previous, focusedItemId, focusedPlacement: placement ?? null })),
    reset: () => setState(createInitialState(mediaItemId)),
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useAdaptiveContainerPrototype = () => useContext(Context);
