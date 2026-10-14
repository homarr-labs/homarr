export type SqlValue = string | number | bigint | Uint8Array | null;
export type SqlRow = Record<string, SqlValue>;

export interface BackupMetadata {
  homarrVersion: string;
  exportedAt: string;
  dbDialect: "sqlite";
}

export interface CopiedDatabase {
  all(sql: string, values?: SqlValue[]): SqlRow[];
  iterate(sql: string, values?: SqlValue[]): Iterable<SqlRow>;
  run(sql: string, values?: SqlValue[]): void;
  transaction(work: () => undefined): void;
  sealAsync(): Promise<{ dialect: "sqlite"; bytes: Uint8Array }>;
  disposeAsync(): Promise<void>;
}

export interface BackupEngine {
  createCopyAsync(bytes: Uint8Array, signal?: AbortSignal): Promise<CopiedDatabase>;
  assertCompatibleAsync(metadata: BackupMetadata, copy: CopiedDatabase, signal?: AbortSignal): Promise<void>;
  migrateSchemaAsync(copy: CopiedDatabase, signal?: AbortSignal): Promise<void>;
  migrateContentAsync(copy: CopiedDatabase, signal?: AbortSignal): Promise<void>;
  resetRuntimeAsync(copy: CopiedDatabase, signal?: AbortSignal): Promise<void>;
}

export interface BackupDependencies {
  engine: BackupEngine;
  targetKey: string;
  authorizeAsync(operation: "inspect" | "prepare" | "export", signal?: AbortSignal): Promise<void>;
}

export interface PreparationOptions {
  trustedSourceKey?: string;
  selectedBoardId?: string;
  signal?: AbortSignal;
}

export type BackupErrorCode =
  | "denied"
  | "too-large"
  | "invalid-archive"
  | "unsupported-dialect"
  | "unsupported-version"
  | "invalid-database"
  | "invalid-reference"
  | "source-key-required"
  | "invalid-key"
  | "key-conflict"
  | "invalid-ciphertext"
  | "migration-failed"
  | "invalid-board"
  | "cancelled"
  | "cleanup-failed";

export class BackupError extends Error {
  constructor(readonly code: BackupErrorCode) {
    super(`Backup ${code}`);
    this.name = "BackupError";
  }
}

export interface BackupInspection {
  metadata: BackupMetadata;
  counts: Record<string, number>;
  boards: { id: string; name: string }[];
  homeBoard: { id: string; name: string } | null;
  encryptedFields: Record<string, number>;
  carriesEncryptionKey: boolean;
  requiresMigrationLogout: true;
  scope: "sql-only-sensitive";
}
