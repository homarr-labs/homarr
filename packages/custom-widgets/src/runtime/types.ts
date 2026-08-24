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
  invalidates?: string[];
}

export interface CustomJsxRequestCapability {
  id: string;
  kind: "query" | "action";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  trigger: "load" | "manual";
  minimumBoardPermission: "view" | "modify" | "full";
  confirmation?: {
    title: string;
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
  };
  invalidates?: string[];
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
  confirm(input: { title: string; message: ReactNode; confirmLabel?: string; destructive?: boolean }): Promise<boolean>;
  notify(notification: RuntimeNotification): void;
}

export interface CustomWidgetRuntimeMessages {
  requestIdRequired: string;
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
  queryCacheKey?: string;
  previewSessionId?: string;
  previewLiveActions?: boolean;
  queriesDisabled?: boolean;
  isEditMode: boolean;
  requestCapabilities: readonly CustomJsxRequestCapability[];
  port: CustomWidgetRuntimePort;
  messages: CustomWidgetRuntimeMessages;
  setQueryState?(requestId: string, value: CustomWidgetPublishedQueryState | null): void;
}

export interface CustomWidgetPublishedQueryState {
  data: unknown;
  status: {
    loading: boolean;
    ok?: boolean;
    status?: number;
    statusText?: string;
    error?: string;
  };
}
