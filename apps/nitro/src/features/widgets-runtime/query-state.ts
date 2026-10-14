import { ORPCError } from "@orpc/client";

export function isTrpcForbiddenError(error: unknown) {
  return error instanceof ORPCError && (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED");
}

export function getUsableNativeWidgetData<TData>(query: { data: TData | undefined; error: unknown }) {
  if (isTrpcForbiddenError(query.error) || (query.error && query.data === undefined)) throw query.error;
  return query.data;
}
