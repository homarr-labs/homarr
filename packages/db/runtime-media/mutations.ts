import { createId } from "@homarr/common/id";

import { TransactionCommitAmbiguousError } from "../runtime";
import type { BoundedTransactionOperation, PersistenceRuntime } from "../runtime";
import { MediaSqlMutationError, requireMediaSqlExecution, snapshotMediaOperation } from "./contracts";
import type {
  InsertedLocalIcon,
  MediaDeleteSelection,
  MediaLocalIconSource,
  MediaSqlReconciliationEvidence,
  PreparedMediaUploadGroup,
  PreparedMediaUploadRow,
} from "./contracts";
import {
  deleteExactIconUrl,
  deleteSelectedMedia,
  insertLocalIconGroup,
  insertMediaGroup,
  readLocalRepository,
  reconfirmMediaSelection,
  requireAffectedRows,
  selectLocalRepository,
  selectMediaIdentity,
} from "./sql";

const prepareUploadGroup = (
  input: readonly PreparedMediaUploadRow[],
  source: MediaLocalIconSource,
): PreparedMediaUploadGroup => {
  if (input.length === 0) throw new Error("values() must be called with at least one value");
  const rows = input.map((row) => ({
    id: row.id,
    creatorId: row.creatorId,
    content: Buffer.from(row.content),
    size: row.size,
    contentType: row.contentType,
    name: row.name,
  }));
  const icons = rows.map((row) => {
    const icon = source.mapMediaToIcon(row);
    return { checksum: icon.checksum, name: icon.fileNameWithExtension, url: icon.imageUrl };
  });
  return { rows, icons };
};

const mutationFailure = (error: unknown, evidence: MediaSqlReconciliationEvidence) =>
  new MediaSqlMutationError(
    error instanceof TransactionCommitAmbiguousError ? "ambiguous" : "commit-not-dispatched",
    evidence,
    error,
  );

const uploadMediaAsync = async (
  runtime: PersistenceRuntime,
  operation: BoundedTransactionOperation,
  input: readonly PreparedMediaUploadRow[],
  source: MediaLocalIconSource,
): Promise<string[]> => {
  const group = prepareUploadGroup(input, source);
  const bounded = snapshotMediaOperation(operation);
  const slug = source.LOCAL_ICON_REPOSITORY_SLUG;
  let evidence: Extract<MediaSqlReconciliationEvidence, { kind: "upload" }> = {
    kind: "upload",
    rows: group.rows,
    localIcons: { kind: "unobserved" },
  };
  const selectIcons = (repositoryId: string | undefined): InsertedLocalIcon[] => {
    if (repositoryId === undefined) {
      evidence = { ...evidence, localIcons: { kind: "absent" } };
      return [];
    }
    const icons: InsertedLocalIcon[] = [];
    evidence = { ...evidence, localIcons: { kind: "selected", repositoryId, icons } };
    for (const icon of group.icons) icons.push({ ...icon, id: createId(), iconRepositoryId: repositoryId });
    return icons;
  };
  try {
    if (runtime.engine === "sqlite") {
      return runtime.boundedTransactionSync(bounded, (database) => {
        requireAffectedRows(database.run(insertMediaGroup(group.rows)).changes, group.rows.length);
        const repositoryId = readLocalRepository(database.all<unknown>(selectLocalRepository("sqlite", slug)));
        const icons = selectIcons(repositoryId);
        if (repositoryId !== undefined)
          requireAffectedRows(database.run(insertLocalIconGroup(icons)).changes, group.rows.length);
        return group.rows.map((row) => row.id);
      });
    }
    return await runtime.boundedTransactionAsync(bounded, async (database) => {
      const inserted = await database.execute(insertMediaGroup(group.rows));
      requireAffectedRows(inserted.rowCount, group.rows.length);
      const repositories = await database.execute(selectLocalRepository("postgresql", slug));
      const repositoryId = readLocalRepository(repositories.rows);
      const icons = selectIcons(repositoryId);
      if (repositoryId !== undefined) {
        const insertedIcons = await database.execute(insertLocalIconGroup(icons));
        requireAffectedRows(insertedIcons.rowCount, group.rows.length);
      }
      return group.rows.map((row) => row.id);
    });
  } catch (error) {
    throw mutationFailure(error, evidence);
  }
};

const deleteMediaAsync = async (
  runtime: PersistenceRuntime,
  operation: BoundedTransactionOperation,
  input: MediaDeleteSelection,
  source: MediaLocalIconSource,
): Promise<void> => {
  const selection: MediaDeleteSelection = { id: input.id, creatorId: input.creatorId };
  const bounded = snapshotMediaOperation(operation);
  const url = source.createLocalImageUrl(selection.id);
  const evidence: MediaSqlReconciliationEvidence = { kind: "delete", selection, url };
  try {
    if (runtime.engine === "sqlite") {
      runtime.boundedTransactionSync(bounded, (database) => {
        reconfirmMediaSelection(database.all<unknown>(selectMediaIdentity("sqlite", selection.id)), selection);
        requireAffectedRows(database.run(deleteSelectedMedia("sqlite", selection)).changes, 1);
        requireAffectedRows(database.run(deleteExactIconUrl(url)).changes);
      });
      return;
    }
    await runtime.boundedTransactionAsync(bounded, async (database) => {
      const identities = await database.execute(selectMediaIdentity("postgresql", selection.id));
      reconfirmMediaSelection(identities.rows, selection);
      const deleted = await database.execute(deleteSelectedMedia("postgresql", selection));
      requireAffectedRows(deleted.rowCount, 1);
      const deletedIcons = await database.execute(deleteExactIconUrl(url));
      requireAffectedRows(deletedIcons.rowCount);
    });
  } catch (error) {
    throw mutationFailure(error, evidence);
  }
};

export const createMediaSqlRuntime = (runtime: PersistenceRuntime, source: MediaLocalIconSource) => ({
  async uploadMediaAsync(
    operation: BoundedTransactionOperation,
    rows: readonly PreparedMediaUploadRow[],
  ): Promise<string[]> {
    requireMediaSqlExecution();
    return uploadMediaAsync(runtime, operation, rows, source);
  },
  async deleteMediaAsync(operation: BoundedTransactionOperation, selection: MediaDeleteSelection): Promise<void> {
    requireMediaSqlExecution();
    await deleteMediaAsync(runtime, operation, selection, source);
  },
});
