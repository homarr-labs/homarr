import { createSqliteCopyEngine } from "@homarr/db";

import type { BackupDependencies, BackupEngine } from "./contracts";

export interface SqliteBackupConfiguration {
  temporaryDirectory: string;
  readonly migrationsFolder: string;
  targetKey: string;
  authorizeAsync: BackupDependencies["authorizeAsync"];
}

export function createSqliteBackupDependencies(config: SqliteBackupConfiguration): BackupDependencies {
  const engine: BackupEngine = createSqliteCopyEngine({
    temporaryDirectory: config.temporaryDirectory,
    migrationsFolder: config.migrationsFolder,
  });
  return { engine, targetKey: config.targetKey, authorizeAsync: config.authorizeAsync };
}
