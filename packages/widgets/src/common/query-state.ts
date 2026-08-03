interface WidgetQueryState {
  data: unknown;
  error: unknown;
}

interface PendingWidgetQueryState extends WidgetQueryState {
  isPending: boolean;
}

/** Throws terminal query failures while preserving successful empty values and stale cached data. */
export const getUsableWidgetQueryData = <TQuery extends WidgetQueryState>(query: TQuery): TQuery["data"] => {
  if (query.error && query.data === undefined) throw query.error;
  return query.data;
};

/** True only before the first result; successful empty values and cached data are both ready to render. */
export const isInitialWidgetQueryPending = ({ data, error, isPending }: PendingWidgetQueryState): boolean =>
  isPending && data === undefined && !error;

/** A failed background refresh still has usable cached data, but should remain visible to the user. */
export const hasStaleWidgetQueryError = ({ data, error }: WidgetQueryState): boolean =>
  error !== null && error !== undefined && data !== undefined;
