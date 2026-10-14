import type { BackupInspection, BackupMetadata, PreparationOptions } from "../contracts";
import type { SqliteBackupConfiguration } from "../sqlite";

export type BackupJoinErrorCode =
  | "closed"
  | "busy"
  | "invalid-configuration"
  | "invalid-preparation"
  | "production-restore-join-unavailable"
  | "export-sanitization-unavailable";

export class BackupJoinError extends Error {
  constructor(readonly code: BackupJoinErrorCode) {
    super(`Backup join ${code}`);
    this.name = "BackupJoinError";
  }
}

export interface BackupJoinRequest {
  readonly request: Request;
  readonly signal: AbortSignal;
  assertAuthorizedAsync(operation: "inspect" | "prepare" | "export", signal: AbortSignal): Promise<void>;
  assertCurrentAsync(signal: AbortSignal): Promise<void>;
}

export interface BackupByteReservationCharges {
  readonly inspect: number;
  readonly prepare: number;
  readonly exportInspection: number;
}

export interface NitroBackupConfiguration extends Omit<SqliteBackupConfiguration, "authorizeAsync"> {
  readonly maximumActiveOperations: number;
  readonly maximumRetainedPreparations: number;
  readonly maximumReservedBytes: number;
  readonly reservationBytes: BackupByteReservationCharges;
  readonly lifetime: AbortSignal;
}

export interface ExportSnapshotInput {
  readonly dialect: "sqlite";
  readonly bytes: Uint8Array;
  readonly metadata: BackupMetadata;
}

export interface SourcePreparationReview {
  readonly stage: "source-prepared";
  readonly applyReady: false;
  readonly inspection: BackupInspection;
  readonly blockedOn: "production-authorization-writer-fencing-restart-recovery";
}

export interface ExportSnapshotReview {
  readonly stage: "isolated-export-inspected";
  readonly downloadReady: false;
  readonly inspection: BackupInspection;
  readonly blockedOn: "phase-owned-isolated-export-sanitization";
}

export type SourcePreparationOptions = PreparationOptions;
