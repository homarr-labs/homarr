import type { ComponentType } from "react";

export type CustomWidgetDisplayData = Readonly<Record<string, unknown>>;
export type CustomWidgetDisplayComponent = ComponentType<{ data: CustomWidgetDisplayData }>;

export interface CustomWidgetDisplayAdapters {
  actionButton: CustomWidgetDisplayComponent;
  customJsx: CustomWidgetDisplayComponent;
  openJsonLabel: string;
}
