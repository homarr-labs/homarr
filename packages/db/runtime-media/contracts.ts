import type { BoundedTransactionOperation } from "../runtime";

export interface PreparedMediaUploadRow {
  readonly id: string;
  readonly creatorId: string;
  readonly content: Buffer;
  readonly size: number;
  readonly contentType: string;
  readonly name: string;
}

export interface MediaDeleteSelection {
  readonly id: string;
  readonly creatorId: string | null;
}

export interface MediaLocalIconSource {
  readonly LOCAL_ICON_REPOSITORY_SLUG: "local";
  mapMediaToIcon(media: { id: string; name: string; content: Uint8Array; size: number }): {
    fileNameWithExtension: string;
    sizeInBytes?: number;
    imageUrl: string;
    local: boolean;
    checksum: string;
  };
  createLocalImageUrl(id: string): string;
}

export interface PreparedLocalIcon {
  readonly checksum: string;
  readonly name: string;
  readonly url: string;
}

export interface InsertedLocalIcon extends PreparedLocalIcon {
  readonly id: string;
  readonly iconRepositoryId: string;
}

export interface PreparedMediaUploadGroup {
  readonly rows: readonly PreparedMediaUploadRow[];
  readonly icons: readonly PreparedLocalIcon[];
}

export type MediaSqlReconciliationEvidence =
  | {
      readonly kind: "upload";
      readonly rows: readonly PreparedMediaUploadRow[];
      readonly localIcons:
        | { readonly kind: "unobserved" }
        | { readonly kind: "absent" }
        | {
            readonly kind: "selected";
            readonly repositoryId: string;
            readonly icons: readonly InsertedLocalIcon[];
          };
    }
  | {
      readonly kind: "delete";
      readonly selection: MediaDeleteSelection;
      readonly url: string;
    };

export type MediaSqlPreconditionCode =
  | "MEDIA_NOT_FOUND"
  | "MEDIA_CREATOR_CHANGED"
  | "MEDIA_AFFECTED_COUNT_MISMATCH"
  | "MEDIA_INVALID_SQL_RESULT";

export class MediaSqlPreconditionError extends Error {
  constructor(readonly code: MediaSqlPreconditionCode) {
    super(code === "MEDIA_NOT_FOUND" ? "Media not found" : "Media SQL precondition failed");
    this.name = "MediaSqlPreconditionError";
  }
}

export class MediaSqlExecutionHeldError extends Error {
  readonly code = "MEDIA_SQL_EXECUTION_HELD";

  constructor() {
    super("Media SQL execution requires accepted transaction-held authority and every compatible enabled writer");
    this.name = "MediaSqlExecutionHeldError";
  }
}

export class MediaSqlMutationError extends Error {
  readonly code = "MEDIA_SQL_MUTATION_FAILED";
  readonly retry = "forbidden";

  constructor(
    readonly outcome: "commit-not-dispatched" | "ambiguous",
    readonly reconciliation: MediaSqlReconciliationEvidence,
    cause: unknown,
  ) {
    super(
      outcome === "ambiguous"
        ? "Media transaction durability requires reconciliation; do not retry"
        : "Media transaction did not dispatch COMMIT; do not retry",
      { cause },
    );
    this.name = "MediaSqlMutationError";
  }
}

export const snapshotMediaOperation = (operation: BoundedTransactionOperation): BoundedTransactionOperation => ({
  signal: operation.signal,
  lifetime: operation.lifetime,
  deadlineAt: operation.deadlineAt,
});

export const requireMediaSqlExecution = (): void => {
  throw new MediaSqlExecutionHeldError();
};
