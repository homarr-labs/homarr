import type { ReactNode } from "react";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import type { PreviewState } from "./preview-state";

export interface FlowWorkbenchProps {
  form: CustomWidgetWorkbenchForm;
  definitionId?: string;
  actions: ReactNode;
  feedback?: ReactNode;
  onPreview(): Promise<unknown>;
  general: ReactNode;
  sources: ReactNode;
  requests: ReactNode;
  options: ReactNode;
  template: ReactNode;
  assistant: ReactNode;
  advanced: ReactNode;
  preview: ReactNode;
  execution: PreviewState;
}
