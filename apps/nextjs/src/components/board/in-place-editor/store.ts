import { useSyncExternalStore } from "react";

import type { WidgetKind } from "@homarr/definitions";
import type { WidgetEditModalState } from "@homarr/widgets/modals";

import { buildOccupiedCells, fits } from "./occupancy";
import type { SectionOccupancy } from "./occupancy";
import type {
  AddInPlaceSession,
  AddInPlaceState,
  AddInPlaceStep,
  AreaRect,
  AreaSize,
  CommitHandler,
  PickTarget,
} from "./types";

const idleState: AddInPlaceState = { step: "idle", session: null };

let state: AddInPlaceState = idleState;
const listeners = new Set<() => void>();
const sections = new Map<string, SectionOccupancy>();

export interface CommitBridge {
  create: (session: AddInPlaceSession, draft: WidgetEditModalState, size: AreaSize) => void;
}

let commitBridge: CommitBridge | null = null;

const emit = () => {
  for (const listener of listeners) listener();
};

const setState = (next: AddInPlaceState) => {
  state = next;
  emit();
};

const updateSession = (updater: (session: AddInPlaceSession) => AddInPlaceSession, step?: AddInPlaceStep) => {
  if (!state.session) return;
  setState({ step: step ?? state.step, session: updater(state.session) });
};

export const registerSection = (occupancy: SectionOccupancy) => {
  sections.set(occupancy.sectionId, occupancy);
  return () => {
    if (sections.get(occupancy.sectionId) === occupancy) sections.delete(occupancy.sectionId);
  };
};

export const getRegisteredSection = (sectionId: string) => sections.get(sectionId);

export const setCommitBridge = (bridge: CommitBridge | null) => {
  commitBridge = bridge;
};

export const getTargetKind = (target: PickTarget): WidgetKind => {
  if (target.type === "widget" || target.type === "existing") return target.kind;
  if (target.type === "custom") return "customApi";
  return "app";
};

const areaFits = (session: AddInPlaceSession, area: AreaRect) => {
  const section = sections.get(session.sectionId);
  if (!section) return area.x >= 0 && area.y >= 0 && area.x + area.w <= 12 && area.w >= 1 && area.h >= 1;
  return fits(section, buildOccupiedCells(section.placements, session.editItemId), area);
};

const resolveArea = (session: AddInPlaceSession, width: number, height: number): AreaRect => {
  const target = { ...session.area, w: Math.max(1, width), h: Math.max(1, height) };
  const current = { ...session.area };
  const area = { ...target, w: Math.min(target.w, current.w), h: Math.min(target.h, current.h) };
  while (area.w < target.w && areaFits(session, { ...area, w: area.w + 1 })) area.w++;
  while (area.h < target.h && areaFits(session, { ...area, h: area.h + 1 })) area.h++;
  return area;
};

const serialize = (value: unknown) => JSON.stringify(value);

const computeDirty = (session: AddInPlaceSession) => {
  if (session.baselineArea && serialize(session.area) !== serialize(session.baselineArea)) return true;
  if (!session.baseline || !session.draft) return false;
  return serialize(session.draft) !== serialize(session.baseline);
};

export const addInPlaceActions = {
  startCreate(sectionId: string, area: AreaRect) {
    setState({
      step: "pick",
      session: { mode: "create", sectionId, area, baseArea: area, dirty: false },
    });
  },
  startEdit(input: {
    sectionId: string;
    area: AreaRect;
    itemId: string;
    kind: WidgetKind;
    value: WidgetEditModalState;
    appId?: string;
    onCommit: CommitHandler;
  }) {
    const picked: PickTarget = { type: "existing", kind: input.kind, value: input.value, appId: input.appId };
    setState({
      step: "configure",
      session: {
        mode: "edit",
        sectionId: input.sectionId,
        area: input.area,
        baseArea: input.area,
        picked,
        highlighted: picked,
        baselineArea: input.area,
        dirty: false,
        editItemId: input.itemId,
        onCommit: input.onCommit,
      },
    });
  },
  highlight(target: PickTarget | undefined) {
    if (state.step !== "pick") return;
    updateSession((session) => ({
      ...session,
      highlighted: target,
    }));
  },
  pick(target: PickTarget) {
    updateSession(
      (session) => ({
        ...session,
        picked: target,
        highlighted: target,
        draft: undefined,
        baseline: undefined,
        baselineArea: session.area,
        dirty: false,
      }),
      "configure",
    );
  },
  openCreateApp(name?: string) {
    updateSession(
      (session) => ({
        ...session,
        createAppName: name?.trim(),
        createAppAttempt: Symbol(),
        highlighted: undefined,
        area: session.baseArea,
      }),
      "createApp",
    );
  },
  back() {
    const { session, step } = state;
    if (!session) return;
    if (step === "createApp") {
      updateSession((current) => ({ ...current }), "pick");
      return;
    }
    if (step === "configure" && session.mode === "create") {
      updateSession(
        (current) => ({
          ...current,
          picked: undefined,
          draft: undefined,
          baseline: undefined,
          baselineArea: undefined,
          dirty: false,
          highlighted: current.picked,
        }),
        "pick",
      );
      return;
    }
    setState(idleState);
  },
  cancel() {
    setState(idleState);
  },
  resizeTo(width: number, height: number) {
    updateSession((session) => {
      const area = resolveArea(session, width, height);
      const next = { ...session, area, baseArea: area };
      return { ...next, dirty: computeDirty(next) };
    });
  },
  resizeBy(deltaWidth: number, deltaHeight: number) {
    const session = state.session;
    if (!session) return;
    addInPlaceActions.resizeTo(session.area.w + deltaWidth, session.area.h + deltaHeight);
  },
  moveBy(deltaX: number, deltaY: number) {
    updateSession((session) => {
      const area = { ...session.area, x: session.area.x + deltaX, y: session.area.y + deltaY };
      if (!areaFits(session, area)) return session;
      const baseArea = { ...session.baseArea, x: area.x, y: area.y };
      const next = { ...session, area, baseArea };
      return { ...next, dirty: computeDirty(next) };
    });
  },
  setDraft(draft: WidgetEditModalState) {
    updateSession((session) => {
      if (!session.baseline) {
        const next = { ...session, draft, baseline: draft, baselineArea: session.baselineArea ?? session.area };
        return { ...next, dirty: computeDirty(next) };
      }
      const next = { ...session, draft };
      return { ...next, dirty: computeDirty(next) };
    });
  },
  commit(value?: WidgetEditModalState) {
    const session = state.session;
    if (!session) return;
    const draft = value ?? session.draft;
    if (!draft) return;
    const size = { width: session.area.w, height: session.area.h };
    if (session.mode === "edit") {
      const changedArea = serialize(session.baselineArea) !== serialize(session.area);
      session.onCommit?.(draft, changedArea ? session.area : undefined);
    } else {
      commitBridge?.create(session, draft, size);
    }
    setState(idleState);
  },
};

export type AddInPlaceActions = typeof addInPlaceActions;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export const getAddInPlaceState = getSnapshot;

export const useAddInPlaceState = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const useAddInPlaceStep = () => useAddInPlaceState().step;

export const useAddInPlaceSession = () => useAddInPlaceState().session;
