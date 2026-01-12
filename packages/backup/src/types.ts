import type { InferSelectModel } from "drizzle-orm";

import type { backups } from "@homarr/db/schema";

/**
 * Type of backup
 */
export type BackupType = "manual" | "auto";

/**
 * Status of a backup
 */
export type BackupStatus = "completed" | "failed";

/**
 * Import mode for restore operations
 */
export type ImportMode = "full" | "merge";

/**
 * Metadata stored in the backup ZIP file
 */
export interface BackupMetadata {
  /** Version of the backup format */
  version: string;
  /** Version of Homarr that created the backup */
  homarrVersion: string;
  /** ISO timestamp of when backup was created */
  exportedAt: string;
  /** User ID who created the backup */
  exportedBy: string | null;
  /** SHA-256 checksum of the data for integrity verification */
  checksum: string;
}

/**
 * Result returned after creating a backup
 */
export interface BackupResult {
  /** Unique identifier of the backup */
  id: string;
  /** Generated file name */
  fileName: string;
  /** Full path where the backup file is stored */
  filePath: string;
  /** Size of the backup file in bytes */
  fileSize: number;
}

/**
 * Summary of entities found in a backup
 */
export interface BackupSummary {
  /** Number of boards */
  boards: number;
  /** Number of integrations */
  integrations: number;
  /** Number of users */
  users: number;
  /** Number of groups */
  groups: number;
  /** Number of media files */
  mediaFiles: number;
  /** Number of apps */
  apps: number;
  /** Number of search engines */
  searchEngines: number;
}

/**
 * Result of validating a backup file
 */
export interface ValidationResult {
  /** Whether the backup is valid for import */
  valid: boolean;
  /** Critical errors that prevent import */
  errors: string[];
  /** Non-critical warnings */
  warnings: string[];
  /** Summary of entities in the backup */
  summary: BackupSummary;
  /** Metadata from the backup */
  metadata?: BackupMetadata;
}

/**
 * Counts of entities imported during restore
 */
export interface ImportedCounts {
  /** Number of boards imported */
  boards: number;
  /** Number of integrations imported */
  integrations: number;
  /** Number of users imported */
  users: number;
  /** Number of groups imported */
  groups: number;
  /** Number of apps imported */
  apps: number;
  /** Number of media files imported */
  mediaFiles: number;
  /** Number of search engines imported */
  searchEngines: number;
}

/**
 * Result returned after importing a backup
 */
export interface ImportResult {
  /** Whether the import completed successfully */
  success: boolean;
  /** Counts of entities imported */
  imported: ImportedCounts;
  /** Counts of entities skipped (merge mode) */
  skipped: ImportedCounts;
  /** Errors encountered during import */
  errors: string[];
  /** Warnings during import */
  warnings: string[];
  /** Whether an admin user exists after import (for redirect logic) */
  hasAdminUser: boolean;
}

/**
 * Options for import operation
 */
export interface ImportOptions {
  /** Import mode: full replaces all data, merge adds to existing */
  mode: ImportMode;
  /** Create a backup before restoring (safety) */
  createBackupFirst?: boolean;
}

/**
 * Options for export operation
 */
export interface ExportOptions {
  /** Name for the backup */
  name?: string;
  /** User ID creating the backup */
  userId?: string | null;
}

/**
 * Options for exporting a single board
 */
export interface BoardExportOptions {
  /** Whether to include referenced integrations */
  includeIntegrations?: boolean;
}

/**
 * Wrapper for single entity export (board, integration)
 */
export interface EntityExport<T> {
  /** Version of the export format */
  version: string;
  /** ISO timestamp of when export was created */
  exportedAt: string;
  /** Type of entity exported */
  type: "board" | "integration";
  /** The exported data */
  data: T;
}

/**
 * Media file to be included in backup
 */
export interface MediaFile {
  /** File name */
  name: string;
  /** File content */
  content: Buffer;
}

/**
 * Database backup record type
 */
export type Backup = InferSelectModel<typeof backups>;

/**
 * Data structure for full backup
 */
export interface FullBackupData {
  boards: unknown[];
  integrations: unknown[];
  users: unknown[];
  groups: unknown[];
  apps: unknown[];
  settings: unknown;
  searchEngines: unknown[];
}

/**
 * Result returned after importing a single board from JSON
 */
export interface BoardImportResult {
  /** Whether the import completed successfully */
  success: boolean;
  /** ID of the imported board (may differ from original if renamed) */
  boardId: string;
  /** Name of the imported board */
  boardName: string;
  /** Number of sections imported */
  sectionsCount: number;
  /** Number of items imported */
  itemsCount: number;
  /** Number of integrations imported (if included) */
  integrationsCount: number;
  /** Errors encountered during import */
  errors: string[];
  /** Warnings during import */
  warnings: string[];
}

/**
 * Result returned after merging a board into an existing board
 */
export interface BoardMergeResult {
  /** Whether the merge completed successfully */
  success: boolean;
  /** ID of the target board */
  boardId: string;
  /** Name of the target board */
  boardName: string;
  /** Number of sections added */
  sectionsAdded: number;
  /** Number of items added */
  itemsAdded: number;
  /** Number of layouts added */
  layoutsAdded: number;
  /** Errors encountered during merge */
  errors: string[];
  /** Warnings during merge */
  warnings: string[];
}
