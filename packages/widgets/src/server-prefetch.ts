import { setImmediate } from "node:timers/promises";

import { hashKey } from "@tanstack/react-query";
import type { FetchQueryOptions, QueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "@homarr/api";
import { trpc } from "@homarr/api/server";
import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";

import { getWidgetDataQueries } from "./data";
import type { WidgetDataQueries, WidgetDataQuery } from "./data";
import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "./manifest";

type Board = RouterOutputs["board"]["getHomeBoard"];
type Item = Board["items"][number];

const isInitiallyVisible = (board: Board, item: Item, layoutId: string) => {
  const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
  if (!layout) return false;
  let sectionId: string | undefined = layout.sectionId;
  const visited = new Set<string>();
  while (sectionId && !visited.has(sectionId)) {
    visited.add(sectionId);
    const section = board.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return false;
    if (section.kind !== "empty" && section.collapsed) return false;
    if (section.kind !== "container") break;
    sectionId = section.layouts.find((candidate) => candidate.layoutId === layoutId)?.parentSectionId;
  }
  return true;
};

export const getInitiallyVisibleWidgetKinds = (board: Board, layoutId: string) => [
  ...new Set(board.items.filter((item) => isInitiallyVisible(board, item, layoutId)).map((item) => item.kind)),
];

export interface CapturePrefetchOutcome {
  eligibleItems: number;
  registered: number;
  capped: number;
  timedOut: number;
  failed: number;
  preparationFailed: number;
}

interface QueryJob {
  options: FetchQueryOptions;
  after: NonNullable<WidgetDataQuery["after"]>[];
  result: { status: "pending" } | { status: "success"; data: unknown } | { status: "error" };
  settled: Promise<void>;
  finish: () => void;
}

const getQueryOptions = ({ path, input }: WidgetDataQuery) => {
  let procedure: unknown = trpc;
  for (const segment of path.split(".")) procedure = Reflect.get(procedure as object, segment);
  return (procedure as { queryOptions: (input: unknown) => FetchQueryOptions }).queryOptions(input);
};

export const prefetchInitialWidgetData = async (
  queryClient: QueryClient,
  board: Board,
  layoutId: string,
  isAuthenticated: boolean,
  capture?: { deadline: number; outcome: CapturePrefetchOutcome },
): Promise<Promise<void>[]> => {
  const deadline = capture?.deadline ?? Infinity;
  const outcome = capture?.outcome;
  const settings = await getRscServerSettingsAsync();
  const items = board.items.filter((item) => isInitiallyVisible(board, item, layoutId));
  const definitions = await Promise.all(items.map((item) => loadWidgetDefinition(item.kind)));
  const jobs: QueryJob[] = [];
  const identities = new Map<string, QueryJob>();
  const enqueue = (queries: WidgetDataQueries, dependent = false) => {
    for (const query of getWidgetDataQueries(queries)) {
      if (Date.now() >= deadline) {
        if (outcome) outcome.timedOut++;
        continue;
      }
      const options = getQueryOptions(query);
      const identity = hashKey(options.queryKey);
      const existing = identities.get(identity);
      if (existing) {
        if (query.after && existing.result.status === "success") enqueue(query.after(existing.result.data), true);
        else if (query.after) existing.after.push(query.after);
        continue;
      }
      if (capture && identities.size >= 128) {
        if (outcome) outcome.capped++;
        continue;
      }
      const { promise: settled, resolve: finish } = Promise.withResolvers<void>();
      const job: QueryJob = {
        options: {
          ...options,
          meta: { ...options.meta, rscWidgetPrefetch: true, rscWidgetDependent: dependent },
          staleTime: 0,
        },
        after: query.after ? [query.after] : [],
        result: { status: "pending" },
        settled,
        finish,
      };
      identities.set(identity, job);
      jobs.push(job);
      if (outcome) outcome.registered++;
    }
  };

  if (isAuthenticated) enqueue({ integrations: { path: "integration.all", input: undefined, enabled: true } });
  for (const [index, item] of items.entries()) {
    const definition = definitions[index];
    if (!definition) continue;
    const data = definition.data;
    if (data.mode === "static" || !data.queries || (!capture && !data.stream)) continue;
    if (data.authenticated && !isAuthenticated) continue;
    if (definition.integrationsRequired && item.integrationIds.length === 0) continue;
    if (outcome) outcome.eligibleItems++;
    try {
      enqueue(
        data.queries({
          integrationIds: item.integrationIds,
          itemId: item.id,
          options: reduceWidgetOptionsWithDefinition(definition, settings.board, item.options),
        }),
      );
    } catch {
      if (outcome) outcome.failed++;
    }
  }

  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      if (!job) continue;
      try {
        if (Date.now() >= deadline) {
          if (outcome) outcome.timedOut++;
          continue;
        }
        const queryFn = job.options.queryFn;
        if (typeof queryFn !== "function") continue;
        const data = await queryClient.fetchQuery({
          ...job.options,
          queryFn: async (context) => {
            await setImmediate();
            if (Date.now() >= deadline) throw new Error("Board capture deadline exceeded");
            return queryFn(context);
          },
        });
        job.result = { status: "success", data };
        for (const after of job.after) enqueue(after(data), true);
      } catch {
        job.result = { status: "error" };
        if (outcome) outcome.failed++;
      } finally {
        job.finish();
      }
    }
  };
  const discovery = jobs.filter((job) => job.after.length > 0).map((job) => job.settled);
  const workers = Array.from({ length: capture ? Math.min(8, jobs.length) : jobs.length }, () => worker());
  if (capture) return workers;
  return discovery;
};
