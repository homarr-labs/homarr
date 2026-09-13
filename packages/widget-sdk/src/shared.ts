import type { ReactNode } from "react";

export type WidgetStorageScope = "user" | "instance" | "installation";
export type WidgetDisplayMode = "compact" | "advanced";
export type WidgetJson = null | boolean | number | string | WidgetJson[] | { [key: string]: WidgetJson };

export interface WidgetOperationInput {
  itemId: string;
  name: string;
  input: unknown;
}

export interface WidgetStorageInput {
  itemId: string;
  scope: WidgetStorageScope;
  key: string;
}

export interface WidgetSubscriptionObserver {
  next(value: unknown): void;
  error(error: Error): void;
  complete(): void;
}

export interface WidgetTransport {
  query(input: WidgetOperationInput, signal: AbortSignal): Promise<unknown>;
  action(input: WidgetOperationInput): Promise<unknown>;
  subscribe(input: WidgetOperationInput, observer: WidgetSubscriptionObserver): () => void;
  storageGet(input: WidgetStorageInput, signal: AbortSignal): Promise<unknown>;
  storageSet(input: WidgetStorageInput & { value: unknown }): Promise<unknown>;
}

export interface WidgetCommand {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  hidden?: boolean;
  destructive?: boolean;
  run(): void | Promise<void>;
}

export interface WidgetHostContext {
  sdkVersion: "1";
  itemId?: string;
  previewId?: string;
  boardId?: string;
  installationId?: string;
  revisionId: string;
  scope?: string;
  handlerPrefix?: string;
  displayMode: WidgetDisplayMode;
  width: number;
  height: number;
  displayScale: number;
  visibleWidth: number;
  visibleHeight: number;
  isEditMode: boolean;
  isPreview: boolean;
  visible: boolean;
  /** False when an authoring preview preserves its last successful view without executing requests or controls. */
  executionEnabled?: boolean;
  /** Dashboard refresh setting; compatibility widgets use it for their declared load queries. */
  refreshIntervalSeconds?: number;
  locale: string;
  timeZone: string;
  colorScheme: "light" | "dark";
  reducedMotion: boolean;
  userId?: string;
}

export interface WidgetStateStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  subscribe(listener: () => void): () => void;
}

export interface WidgetNotification {
  title: string;
  message?: string;
  color?: string;
}

export interface WidgetHostServices {
  transport: WidgetTransport;
  state: WidgetStateStore;
  registerCommands(commands: readonly WidgetCommand[]): () => void;
  notify(notification: WidgetNotification): void;
  navigate(href: string): void;
  openAdvanced(): void;
  closeAdvanced(): void;
  openDetail(detail: { title: string; content: ReactNode }): void;
  closeDetail(): void;
  confirm(input: { title: string; message: string; destructive?: boolean }): Promise<boolean>;
  updateOptions(options: Record<string, unknown>): Promise<void>;
}
