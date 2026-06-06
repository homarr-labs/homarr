export interface BackupMetadata {
  homarrVersion: string;
  exportedAt: string;
  dbDialect: string;
  encryptionKey?: string;
}

export interface MigrationFile {
  idx: number;
  tag: string;
  sql: string;
  when: number;
}

export interface MigrationStatus {
  applied: number;
  pending: MigrationFile[];
  total: number;
}

export interface BackupAnalysis {
  metadata: BackupMetadata;
  counts: Record<string, number>;
  boardNames: string[];
  migrations: MigrationStatus;
}

export type RestoreStep = "upload" | "preview" | "confirm" | "restoring" | "error";

export interface RestoreProgress {
  phase: "extracting" | "migrating" | "encrypting" | "swapping" | "restarting";
  migrationIndex?: number;
  migrationTotal?: number;
  migrationTag?: string;
}

export const PREVIEW_TABLE_KEYS = ["board", "user", "app", "integration", "item", "media", "search_engine"] as const;

export const RESTORE_PHASES = ["extracting", "migrating", "encrypting", "swapping", "restarting"] as const;
