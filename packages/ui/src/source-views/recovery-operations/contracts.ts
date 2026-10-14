import type { ReactNode } from "react";

export interface DangerousActionConfirmationProps {
  title: string;
  warningTitle: string;
  warningBody: string;
  typePrompt: string;
  submitLabel: string;
  submitIcon: ReactNode;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
  color?: string;
}

export type RestoreConfirmationViewProps = Omit<DangerousActionConfirmationProps, "submitIcon" | "color">;

export type RestoreProgressStatus = "restoring" | "restarting" | "timedOut";

export interface RestoreProgressViewProps {
  active: boolean;
  status: RestoreProgressStatus;
  reloginRequired?: boolean;
  progressTitle: string;
  restartingLabel: string;
  timeoutTitle: string;
  timeoutMessage: string;
  reloginLabel: string;
  retryLabel: string;
  reloadLabel: string;
  onRetryReadiness: () => void;
  onReload: () => void;
}

export interface BackupPreviewDisplayRow<Key extends string> {
  key: Key;
  label: string;
  count: number;
}

export type BackupPreviewDisplayRows = readonly [
  BackupPreviewDisplayRow<"board">,
  BackupPreviewDisplayRow<"user">,
  BackupPreviewDisplayRow<"app">,
  BackupPreviewDisplayRow<"integration">,
  BackupPreviewDisplayRow<"item">,
  BackupPreviewDisplayRow<"media">,
  BackupPreviewDisplayRow<"search_engine">,
];

export interface BackupPreviewViewProps {
  title: string;
  exportedLabel: string;
  homarrVersion: string;
  entityLabel: string;
  countLabel: string;
  rows: BackupPreviewDisplayRows;
  boardsLabel: string;
  boardNames: readonly string[];
  migrations: {
    pendingCount: number;
    totalCount: number;
    pendingTitle: string;
    pendingDescription: string;
    pendingLabel: string;
    upToDateLabel: string;
  };
}

export interface LogFontSizeViewProps {
  fontSize: number;
  onChange: (value: number) => void;
}

export type LogLevelDisplayValue = "error" | "warn" | "info" | "debug";

export interface LogLevelDisplayOption<Value extends LogLevelDisplayValue> {
  value: Value;
  label: string;
}

export interface LogLevelViewProps {
  level: LogLevelDisplayValue;
  options: readonly [
    LogLevelDisplayOption<"error">,
    LogLevelDisplayOption<"warn">,
    LogLevelDisplayOption<"info">,
    LogLevelDisplayOption<"debug">,
  ];
  onChange: (value: LogLevelDisplayValue) => void;
}

export interface TaskStatusBadgeViewProps {
  isEnabled: boolean;
  status: "running" | "idle" | null;
  disabledLabel: string;
  runningLabel: string;
  idleLabel: string;
}
