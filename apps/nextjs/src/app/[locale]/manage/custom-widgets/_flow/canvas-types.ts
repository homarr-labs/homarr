import type { ReactFlowInstance } from "@xyflow/react";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import type { WidgetEdge, WidgetNode } from "./graph";
export const defaultEdgeOptions = { type: "smoothstep", selectable: true };
export const initialFitOptions = { maxZoom: 1 };

export interface CanvasProps {
  form: CustomWidgetWorkbenchForm;
  selected: string;
  selection: string[];
  inspectorOpened: boolean;
  onSelect(id: string): void;
  onInspect(id: string): void;
  onSelection(ids: string[]): void;
  onInit(instance: ReactFlowInstance<WidgetNode, WidgetEdge>): void;
}
