import type { BackupError, BackupInspection, PreparationOptions } from "@homarr/api/backup-runtime/contracts";

export type { BackupInspection };
export type BackupFailureCode = BackupError["code"] | "unsupported" | "invalid-response" | "transport-failed";
export type InspectionPhase = "reading" | "inspecting";

export interface BackupNativePorts {
  inspectAsync?: (bytes: Uint8Array, options: Pick<PreparationOptions, "signal">) => Promise<BackupInspection>;
  exportAsync?: (signal: AbortSignal) => Promise<Response>;
}

export interface BackupDownload {
  blob: Blob;
  filename: string;
}

export interface BackupTransport {
  capabilities: Readonly<{ inspect: boolean; export: boolean; apply: false; boardOnly: false }>;
  inspectAsync(file: File, signal: AbortSignal, onPhase: (phase: InspectionPhase) => void): Promise<BackupInspection>;
  exportAsync(signal: AbortSignal): Promise<BackupDownload>;
}

export type BackupPreviewState =
  | { kind: "empty" }
  | { kind: "inspecting"; file: File; phase: InspectionPhase }
  | { kind: "ready"; file: File; inspection: BackupInspection }
  | { kind: "failed"; file: File; code: BackupFailureCode };

export type BackupKeySelection = { kind: "archive" } | { kind: "manual"; value: string };

export const maximumBackupFileBytes = 256 * 1024 * 1024;
