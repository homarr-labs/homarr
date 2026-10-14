import { useContext, useEffect, useRef } from "react";
import { hashKey, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import {
  queryCacheDefaultGcTimeMs,
  queryCacheDefaultRefetchIntervalMs,
  queryCacheDefaultStaleTimeMs,
} from "@homarr/api/query-cache";
import { widgetQueryRefetchIntervals } from "@homarr/widgets/refetch-intervals";

import type { ExpansionQueryScope, ExpansionQueryUtils } from "../../query/types";
import { WidgetQueryScopeContext } from "./context";
import { useGeneratedWidgetScope } from "./generated-context";
import { isTrpcForbiddenError } from "./query-state";

type WidgetQueries = ExpansionQueryUtils["widget"];
export type StockPriceQueryInput = Parameters<WidgetQueries["stockPrice"]["getPriceHistory"]["call"]>[0];
export type TimetableQueryInput = Parameters<WidgetQueries["timetable"]["getTimetable"]["call"]>[0];
export type MinecraftQueryInput = Parameters<WidgetQueries["minecraft"]["getServerStatus"]["call"]>[0];
export type LlamacppQueryInput = Parameters<WidgetQueries["llamacpp"]["getStats"]["call"]>[0];
export type UpsQueryInput = Parameters<WidgetQueries["ups"]["getSummaries"]["call"]>[0];
export type WudQueryInput = Parameters<WidgetQueries["wud"]["getStats"]["call"]>[0];
export type SpeedtestQueryInput = Parameters<WidgetQueries["speedtestTracker"]["getDashboard"]["call"]>[0];

function sourcePolicy(path: readonly string[], polling: boolean) {
  const policy = widgetQueryRefetchIntervals.findLast(({ queryKey }) =>
    queryKey[0].every((part, index) => path[index] === part),
  );
  const refetchInterval: number | false =
    !polling || policy?.intervalSeconds === null
      ? false
      : policy
        ? policy.intervalSeconds * 1000
        : queryCacheDefaultRefetchIntervalMs;
  const staleTime =
    policy && "staleTimeSeconds" in policy ? policy.staleTimeSeconds * 1000 : queryCacheDefaultStaleTimeMs;
  return {
    staleTime,
    refetchInterval,
    gcTime: queryCacheDefaultGcTimeMs,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  };
}

export function stockPriceQueryOptions(scope: ExpansionQueryScope, input: StockPriceQueryInput, polling = true) {
  scope.assertCurrent();
  return scope.orpc.widget.stockPrice.getPriceHistory.queryOptions({
    input,
    ...sourcePolicy(["widget", "stockPrice", "getPriceHistory"], polling),
  });
}

export function timetableQueryOptions(scope: ExpansionQueryScope, input: TimetableQueryInput, polling = true) {
  scope.assertCurrent();
  return scope.orpc.widget.timetable.getTimetable.queryOptions({
    input,
    ...sourcePolicy(["widget", "timetable", "getTimetable"], polling),
  });
}

export function minecraftQueryOptions(scope: ExpansionQueryScope, input: MinecraftQueryInput, polling = true) {
  scope.assertCurrent();
  return scope.orpc.widget.minecraft.getServerStatus.queryOptions({
    input,
    ...sourcePolicy(["widget", "minecraft", "getServerStatus"], polling),
  });
}

export function llamacppQueryOptions(scope: ExpansionQueryScope, input: LlamacppQueryInput, polling = true) {
  scope.assertCurrent();
  return scope.orpc.widget.llamacpp.getStats.queryOptions({
    input,
    ...sourcePolicy(["widget", "llamacpp", "getStats"], polling),
  });
}

export function upsQueryOptions(scope: ExpansionQueryScope, input: UpsQueryInput, polling = true) {
  scope.assertCurrent();
  return scope.orpc.widget.ups.getSummaries.queryOptions({
    input,
    ...sourcePolicy(["widget", "ups", "getSummaries"], polling),
  });
}

export function wudQueryOptions(scope: ExpansionQueryScope, input: WudQueryInput, polling = true) {
  scope.assertCurrent();
  return scope.orpc.widget.wud.getStats.queryOptions({
    input,
    ...sourcePolicy(["widget", "wud", "getStats"], polling),
  });
}

export function speedtestQueryOptions(scope: ExpansionQueryScope, input: SpeedtestQueryInput, polling = true) {
  scope.assertCurrent();
  return scope.orpc.widget.speedtestTracker.getDashboard.queryOptions({
    input,
    ...sourcePolicy(["widget", "speedtestTracker", "getDashboard"], polling),
  });
}

function usePolling() {
  return useContext(WidgetQueryScopeContext)?.polling !== false;
}

function useRegisterGeneratedQuery(key: QueryKey) {
  const ownership = useContext(WidgetQueryScopeContext);
  const previous = useRef(key);
  if (hashKey(previous.current) !== hashKey(key)) previous.current = key;
  const stableKey = previous.current;
  ownership?.record(stableKey);
  useEffect(() => ownership?.register(stableKey), [ownership, stableKey]);
}

export function useStockPriceQuery(input: StockPriceQueryInput) {
  const scope = useGeneratedWidgetScope();
  const options = stockPriceQueryOptions(scope, input, usePolling());
  useRegisterGeneratedQuery(options.queryKey);
  const query = useQuery(options, scope.queryClient);
  if (isTrpcForbiddenError(query.error)) throw query.error;
  scope.assertCurrent();
  return query;
}

export function useTimetableQuery(input: TimetableQueryInput) {
  const scope = useGeneratedWidgetScope();
  const options = timetableQueryOptions(scope, input, usePolling());
  useRegisterGeneratedQuery(options.queryKey);
  const query = useQuery(options, scope.queryClient);
  if (isTrpcForbiddenError(query.error)) throw query.error;
  scope.assertCurrent();
  return query;
}

export function useMinecraftQuery(input: MinecraftQueryInput) {
  const scope = useGeneratedWidgetScope();
  const options = minecraftQueryOptions(scope, input, usePolling());
  useRegisterGeneratedQuery(options.queryKey);
  const query = useQuery(options, scope.queryClient);
  if (isTrpcForbiddenError(query.error)) throw query.error;
  scope.assertCurrent();
  return query;
}

export function useLlamacppQuery(input: LlamacppQueryInput) {
  const scope = useGeneratedWidgetScope();
  const options = llamacppQueryOptions(scope, input, usePolling());
  useRegisterGeneratedQuery(options.queryKey);
  const query = useQuery(options, scope.queryClient);
  if (isTrpcForbiddenError(query.error)) throw query.error;
  scope.assertCurrent();
  return query;
}

export function useUpsQuery(input: UpsQueryInput) {
  const scope = useGeneratedWidgetScope();
  const options = upsQueryOptions(scope, input, usePolling());
  useRegisterGeneratedQuery(options.queryKey);
  const query = useQuery(options, scope.queryClient);
  if (isTrpcForbiddenError(query.error)) throw query.error;
  scope.assertCurrent();
  return query;
}

export function useWudQuery(input: WudQueryInput) {
  const scope = useGeneratedWidgetScope();
  const options = wudQueryOptions(scope, input, usePolling());
  useRegisterGeneratedQuery(options.queryKey);
  const query = useSuspenseQuery(options, scope.queryClient);
  if (isTrpcForbiddenError(query.error)) throw query.error;
  scope.assertCurrent();
  return query;
}

export function useSpeedtestQuery(input: SpeedtestQueryInput) {
  const scope = useGeneratedWidgetScope();
  const options = speedtestQueryOptions(scope, input, usePolling());
  useRegisterGeneratedQuery(options.queryKey);
  const query = useQuery(options, scope.queryClient);
  if (isTrpcForbiddenError(query.error)) throw query.error;
  scope.assertCurrent();
  return query;
}
