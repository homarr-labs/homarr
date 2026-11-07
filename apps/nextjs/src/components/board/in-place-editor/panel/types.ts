import type { ComponentType, KeyboardEvent } from "react";

import type { AddInPlaceCatalog } from "../catalog";
import type { AddInPlaceActions } from "../store";
import type { AddInPlaceSession, AddInPlaceStep } from "../types";

export interface InPlaceEditorPanelProps {
  step: Exclude<AddInPlaceStep, "idle">;
  session: AddInPlaceSession;
  anchorRect: DOMRect | null;
  presentation: "floating" | "sheet";
  useCatalog: (search: string) => AddInPlaceCatalog;
  actions: AddInPlaceActions;
  BoundEditorForm: ComponentType;
  editorFormId: string;
  AreaSizeInputs: ComponentType<{ compact?: boolean }>;
  CreateAppForm: ComponentType;
  canCreateApp: boolean;
  onKeyDown: (event: KeyboardEvent) => void;
  panelProps: { "data-add-in-place-inside": "" };
}
