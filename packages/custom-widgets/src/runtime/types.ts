import type { ReactNode } from "react";

export type RuntimeParam = string | number | boolean;
export type CustomJsxRuntimeParams = Record<string, RuntimeParam>;

export interface CustomWidgetRequestResult {
  ok: boolean;
  status: number;
  statusText?: string;
  data: unknown;
  error?: string;
  simulated?: boolean;
}

export interface CustomJsxRequestCapability {
  id: string;
  kind: "query" | "action";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  minimumBoardPermission: "view" | "modify" | "full";
}

export interface RuntimeRequestInput {
  itemId?: string;
  previewSessionId?: string;
  requestId: string;
  params: CustomJsxRuntimeParams;
}

export interface RuntimeActionInput extends RuntimeRequestInput {
  confirmed: boolean;
}

export interface RuntimeInvalidationInput {
  itemId?: string;
  previewSessionId?: string;
  targets: readonly string[];
}

export interface RuntimeNotification {
  kind: "success" | "error";
  title: string;
  message: string;
}

export interface CustomWidgetRuntimePort {
  query(input: RuntimeRequestInput, signal?: AbortSignal): Promise<CustomWidgetRequestResult>;
  executeAction(input: RuntimeActionInput): Promise<CustomWidgetRequestResult>;
  invalidate(input: RuntimeInvalidationInput): Promise<void>;
  confirm(input: { title: string; message: ReactNode }): Promise<boolean>;
  notify(notification: RuntimeNotification): void;
}

export interface CustomWidgetRuntimeMessages {
  migrationRequired: string;
  unsavedPreview: string;
  invalidParams: string;
  loadRequest: string;
  requestFailed: string;
  loading: string;
  retry: string;
  widgetItemUnavailable: string;
  actionsDisabledEditMode: string;
  actionSimulated: string;
  actionCompleted: string;
  confirmDelete: string;
  toggle: string;
  refresh: string;
}

export interface CustomWidgetRuntimeValue {
  itemId?: string;
  definitionId?: string;
  previewSessionId?: string;
  previewLiveActions?: boolean;
  isEditMode: boolean;
  requestCapabilities: readonly CustomJsxRequestCapability[];
  port: CustomWidgetRuntimePort;
  messages: CustomWidgetRuntimeMessages;
}
