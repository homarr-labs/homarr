import type { WidgetKind } from "@homarr/definitions";
import type { WidgetEditModalState } from "@homarr/widgets/modals";

export interface AreaRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AddInPlaceStep = "idle" | "pick" | "configure" | "createApp";

export type PickTarget =
  | { type: "widget"; kind: WidgetKind }
  | { type: "custom"; id: string; name: string; defaultOptions: unknown; configurationVersion: number }
  | { type: "app"; appId: string; name: string }
  | { type: "existing"; kind: WidgetKind; value: WidgetEditModalState; appId?: string };

export interface AreaSize {
  width: number;
  height: number;
}

export type CommitHandler = (value: WidgetEditModalState, area?: AreaRect) => void;

export interface AddInPlaceSession {
  mode: "create" | "edit";
  sectionId: string;
  area: AreaRect;
  baseArea: AreaRect;
  highlighted?: PickTarget;
  picked?: PickTarget;
  draft?: WidgetEditModalState;
  baseline?: WidgetEditModalState;
  baselineArea?: AreaRect;
  dirty: boolean;
  editItemId?: string;
  createAppName?: string;
  createAppAttempt?: symbol;
  onCommit?: CommitHandler;
}

export interface AddInPlaceState {
  step: AddInPlaceStep;
  session: AddInPlaceSession | null;
}
