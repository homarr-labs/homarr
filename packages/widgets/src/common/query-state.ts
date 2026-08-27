import { isTrpcForbiddenError } from "@homarr/api/query-cache";

interface WidgetQueryState {
  data: unknown;
  error: unknown;
}

interface PendingWidgetQueryState extends WidgetQueryState {
  isPending: boolean;
}

/** Throws terminal query failures while preserving successful empty values and stale cached data. */
export const getUsableWidgetQueryData = <TQuery extends WidgetQueryState>(query: TQuery): TQuery["data"] => {
  if (isTrpcForbiddenError(query.error)) throw query.error;
  if (query.error && query.data === undefined) throw query.error;
  return query.data;
};

/** True only before the first result; successful empty values and cached data are both ready to render. */
export const isInitialWidgetQueryPending = ({ data, error, isPending }: PendingWidgetQueryState): boolean =>
  isPending && data === undefined && !error;
