import { parseLegacyArchive } from "./archive";
import { BackupError } from "./contracts";
import type { BackupDependencies, BackupInspection, CopiedDatabase, PreparationOptions } from "./contracts";
import { assertEncryptionKey, convertEncryptedFields } from "./crypto";
import { inspectCopiedDatabase, validateCopiedDatabase } from "./inspection";

export { backupLimits, parseLegacyArchive, readBackupUploadAsync } from "./archive";
export { BackupError } from "./contracts";
export type {
  BackupDependencies,
  BackupEngine,
  BackupInspection,
  BackupMetadata,
  CopiedDatabase,
  PreparationOptions,
  SqlRow,
  SqlValue,
} from "./contracts";
export { encryptedFields, sourceModels } from "./inventory";
export { createSqliteBackupDependencies } from "./sqlite";
export type { SqliteBackupConfiguration } from "./sqlite";

export class PreparedLegacyBackup {
  readonly #bytes: Uint8Array;
  constructor(
    readonly inspection: BackupInspection,
    bytes: Uint8Array,
  ) {
    this.#bytes = bytes;
  }
  withServerSnapshot<T>(work: (snapshot: { dialect: "sqlite"; bytes: Uint8Array }) => T): T {
    return work({ dialect: "sqlite", bytes: this.#bytes });
  }
  toJSON() {
    return this.inspection;
  }
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new BackupError("cancelled");
}

async function disposeCopyAsync(copy: CopiedDatabase) {
  try {
    await copy.disposeAsync();
  } catch {
    throw new BackupError("cleanup-failed");
  }
}

async function openCopyAsync(
  bytes: Uint8Array,
  dependencies: BackupDependencies,
  options: PreparationOptions,
  operation: "inspect" | "prepare",
) {
  checkAbort(options.signal);
  try {
    await dependencies.authorizeAsync(operation, options.signal);
  } catch {
    throw new BackupError("denied");
  }
  checkAbort(options.signal);
  const archive = parseLegacyArchive(bytes);
  let copy: CopiedDatabase;
  try {
    copy = await archive.withServerContents((database) =>
      dependencies.engine.createCopyAsync(database, options.signal),
    );
  } catch {
    throw new BackupError("invalid-database");
  }
  try {
    checkAbort(options.signal);
    try {
      await dependencies.engine.assertCompatibleAsync(archive.metadata, copy, options.signal);
    } catch {
      throw new BackupError("unsupported-version");
    }
    try {
      await dependencies.engine.migrateSchemaAsync(copy, options.signal);
    } catch {
      throw new BackupError("migration-failed");
    }
    checkAbort(options.signal);
    validateCopiedDatabase(copy);
    return { archive, copy };
  } catch (error) {
    try {
      await copy.disposeAsync();
    } catch {
      throw new BackupError("cleanup-failed");
    }
    throw error instanceof BackupError ? error : new BackupError("invalid-database");
  }
}

export async function inspectLegacyBackupAsync(
  bytes: Uint8Array,
  dependencies: BackupDependencies,
  options: PreparationOptions = {},
) {
  const { archive, copy } = await openCopyAsync(bytes, dependencies, options, "inspect");
  try {
    try {
      await dependencies.engine.migrateContentAsync(copy, options.signal);
    } catch {
      throw new BackupError("migration-failed");
    }
    checkAbort(options.signal);
    validateCopiedDatabase(copy);
    return inspectCopiedDatabase(copy, archive.metadata, archive.carriesEncryptionKey);
  } catch (error) {
    throw error instanceof BackupError ? error : new BackupError("invalid-database");
  } finally {
    await disposeCopyAsync(copy);
  }
}

export async function prepareLegacyBackupAsync(
  bytes: Uint8Array,
  dependencies: BackupDependencies,
  options: PreparationOptions = {},
) {
  const { archive, copy } = await openCopyAsync(bytes, dependencies, options, "prepare");
  let snapshot: Awaited<ReturnType<CopiedDatabase["sealAsync"]>> | undefined;
  let transferred = false;
  try {
    let prepared: PreparedLegacyBackup;
    try {
      assertEncryptionKey(dependencies.targetKey);
      if (options.trustedSourceKey !== undefined) assertEncryptionKey(options.trustedSourceKey);
      archive.withServerContents((_database, archiveKey) => {
        if (
          archiveKey &&
          options.trustedSourceKey &&
          archiveKey.toLowerCase() !== options.trustedSourceKey.toLowerCase()
        )
          throw new BackupError("key-conflict");
        convertEncryptedFields(copy, options.trustedSourceKey ?? archiveKey, dependencies.targetKey);
      });
      checkAbort(options.signal);
      try {
        await dependencies.engine.migrateContentAsync(copy, options.signal);
      } catch {
        throw new BackupError("migration-failed");
      }
      convertEncryptedFields(copy, dependencies.targetKey, dependencies.targetKey);
      validateCopiedDatabase(copy);
      const inspection = inspectCopiedDatabase(copy, archive.metadata, archive.carriesEncryptionKey);
      if (options.selectedBoardId !== undefined) {
        const selected = inspection.boards.find((board) => board.id === options.selectedBoardId);
        if (!selected) throw new BackupError("invalid-board");
        inspection.homeBoard = selected;
      }
      copy.transaction(() => {
        copy.run('DELETE FROM "session"');
        copy.run('DELETE FROM "verificationToken"');
        copy.run('DELETE FROM "serverSetting" WHERE "setting_key" = ?', ["__onboarding_claim"]);
      });
      checkAbort(options.signal);
      await dependencies.engine.resetRuntimeAsync(copy, options.signal);
      checkAbort(options.signal);
      snapshot = await copy.sealAsync();
      checkAbort(options.signal);
      prepared = new PreparedLegacyBackup(inspection, snapshot.bytes);
    } catch (error) {
      throw error instanceof BackupError ? error : new BackupError("invalid-database");
    } finally {
      await disposeCopyAsync(copy);
    }
    checkAbort(options.signal);
    transferred = true;
    return prepared;
  } finally {
    if (!transferred) snapshot?.bytes.fill(0);
  }
}
