import { isTrpcForbiddenError } from "@homarr/api/query-cache";

interface WidgetQueryState {
  data: unknown;
  error: unknown;
}

interface PendingWidgetQueryState extends WidgetQueryState {
  isPending: boolean;
}

/** Report unusable data without unmounting a widget's query observer. */
export const getWidgetQueryError = ({ data, error }: WidgetQueryState): unknown => {
  if (isTrpcForbiddenError(error) || (error && data === undefined)) return error;
  return null;
};

/** Throws terminal query failures while preserving successful empty values and stale cached data. */
export const getUsableWidgetQueryData = <TQuery extends WidgetQueryState>(query: TQuery): TQuery["data"] => {
  const error = getWidgetQueryError(query);
  if (error) throw error;
  return query.data;
};

/** True only before the first result; successful empty values and cached data are both ready to render. */
export const isInitialWidgetQueryPending = ({ data, error, isPending }: PendingWidgetQueryState): boolean =>
  isPending && data === undefined && !error;
