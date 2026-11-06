import type { ComponentType, KeyboardEvent } from "react";

import type { AddInPlaceCatalog } from "../catalog";
import type { useTargetResources } from "../resources";
import type { AddInPlaceActions } from "../store";
import type { AddInPlaceSession, AddInPlaceStep } from "../types";

export interface AddInPlacePanelProps {
  step: Exclude<AddInPlaceStep, "idle">;
  session: AddInPlaceSession;
  anchorRect: DOMRect | null;
  presentation: "floating" | "sheet";
  useCatalog: (search: string) => AddInPlaceCatalog;
  useTargetResources: typeof useTargetResources;
  actions: AddInPlaceActions;
  BoundEditorForm: ComponentType;
  editorFormId: string;
  AreaSizeInputs: ComponentType;
  CreateAppForm: ComponentType;
  onKeyDown: (event: KeyboardEvent) => void;
  panelProps: { "data-add-in-place-inside": "" };
}

export interface AddInPlaceVariant {
  name: string;
  Panel: ComponentType<AddInPlacePanelProps>;
}
