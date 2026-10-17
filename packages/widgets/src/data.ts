import type { AnyQueryProcedure, inferProcedureInput, inferProcedureOutput } from "@trpc/server";

import type { AppRouter } from "@homarr/api";
import type { SettingsContextProps } from "@homarr/settings/creator";

import { createTrpcQueryKey } from "./trpc-query-key";

type QueryEntries<TRecord, TPrefix extends string = ""> = {
  [TKey in keyof TRecord & string]: TRecord[TKey] extends AnyQueryProcedure
    ? {
        path: `${TPrefix}${TKey}`;
        input: inferProcedureInput<TRecord[TKey]>;
        output: inferProcedureOutput<TRecord[TKey]>;
      }
    : QueryEntries<TRecord[TKey], `${TPrefix}${TKey}.`>;
}[keyof TRecord & string];

type Queries = QueryEntries<AppRouter["_def"]["record"]>;
type QueryPath = Queries["path"];
type QueryInput<TPath extends QueryPath> = Extract<Queries, { path: TPath }>["input"];
type QueryOutput<TPath extends QueryPath> = Extract<Queries, { path: TPath }>["output"];

export interface WidgetDataContext<TOptions = Record<string, unknown>> {
  options: TOptions;
  integrationIds: string[];
  itemId?: string;
  displayMode?: "compact" | "advanced";
  board?: { disableStatus: boolean };
  settings?: Pick<SettingsContextProps, "forceDisableStatus">;
}

export interface WidgetDataQuery<TInput = unknown> {
  path: QueryPath;
  input: TInput;
  enabled: boolean;
  stream?: boolean;
  after?: (data: unknown) => WidgetDataQueries;
}

export type WidgetDataQueries = Record<string, WidgetDataQuery | readonly WidgetDataQuery[] | null>;

interface WidgetQueryData<TOptions> {
  stream?: boolean;
  requiresData?: boolean;
  authenticated?: boolean;
  queries(context: WidgetDataContext<TOptions>): WidgetDataQueries;
}

export type WidgetDataDefinition<TOptions = Record<string, unknown>> =
  | { mode: "static" }
  | ({ mode: "browser"; reason: string } & Partial<WidgetQueryData<TOptions>>)
  | ({ mode: "queries" } & WidgetQueryData<TOptions>);

export const widgetQuery = <TPath extends QueryPath>(
  path: TPath,
  input: QueryInput<TPath>,
  {
    enabled = true,
    stream,
    after,
  }: { enabled?: boolean; stream?: boolean; after?: (data: QueryOutput<TPath>) => WidgetDataQueries } = {},
): WidgetDataQuery<QueryInput<TPath>> => ({
  path,
  input,
  enabled,
  stream,
  ...(after ? { after: (data: unknown) => after(data as QueryOutput<TPath>) } : {}),
});

export const getWidgetDataQueries = (queries: WidgetDataQueries): WidgetDataQuery[] =>
  Object.values(queries)
    .flatMap((query) => (query === null ? [] : query))
    .filter((query) => query.enabled);

export const getWidgetDataQueryKey = ({ path, input }: WidgetDataQuery) => createTrpcQueryKey(path, input);
