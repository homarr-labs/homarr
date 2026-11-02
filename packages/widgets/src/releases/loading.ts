import { isInitialWidgetQueryPending } from "../common/query-state";

interface ReleaseBatchQueryState {
  repositoryIds: readonly string[];
  data: unknown;
  error: unknown;
  isPending: boolean;
}

/** Repository ids whose batch has not produced data yet. Cached and placeholder rows are ready. */
export const getInitialPendingReleaseIds = (queries: readonly ReleaseBatchQueryState[]) =>
  new Set(queries.flatMap((query) => (isInitialWidgetQueryPending(query) ? query.repositoryIds : [])));

/** Blank the widget only when nothing can be shown yet. One slow batch must not hide the rest. */
export const isReleasesInitialLoading = (pendingIds: ReadonlySet<string>, visibleEntryCount: number) =>
  visibleEntryCount === 0 && pendingIds.size > 0;
