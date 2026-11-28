"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { WidgetKind } from "@homarr/definitions";

/** These widgets report activity even when their state is not on screen. */
export const smartContainerActivityKinds: ReadonlySet<WidgetKind> = new Set([
  "mediaServer",
  "downloads",
  "mediaRequests-requestList",
]);

export interface WidgetActivity extends WidgetActivityFacts {
  status: "ready" | "partial" | "unknown";
  requestedRows: number;
  updatedAt: number;
  freshForMs: number;
}

export type WidgetRelevance = "playback" | "ongoing" | "background" | "quiet" | "unknown";

export interface WidgetActivityFacts {
  relevance: Exclude<WidgetRelevance, "unknown">;
  count: number;
}

export type WidgetActivities = Readonly<Record<string, WidgetActivity | undefined>>;

interface ActivityReporter {
  report: (itemId: string, activity: WidgetActivity | undefined) => void;
  watchedItemIds: ReadonlySet<string>;
}

const noActivities: WidgetActivities = {};
const WidgetActivitiesContext = createContext<WidgetActivities>(noActivities);
const WidgetActivityReporterContext = createContext<ActivityReporter | null>(null);

/** Collect existing widget query results without introducing a second data or permission path. */
export const WidgetActivityProvider = ({
  children,
  watchedItemIds,
}: PropsWithChildren<{ watchedItemIds: ReadonlySet<string> }>) => {
  const [activities, setActivities] = useState<WidgetActivities>({});
  const report = useCallback((itemId: string, activity: WidgetActivity | undefined) => {
    setActivities((previous) => {
      const existing = previous[itemId];
      if (!activity) {
        if (!existing) return previous;
        const next = { ...previous };
        delete next[itemId];
        return next;
      }
      if (
        existing?.status === activity.status &&
        existing.relevance === activity.relevance &&
        existing.count === activity.count &&
        existing.requestedRows === activity.requestedRows &&
        existing.updatedAt === activity.updatedAt &&
        existing.freshForMs === activity.freshForMs
      ) {
        return previous;
      }
      return { ...previous, [itemId]: activity };
    });
  }, []);
  const reporter = useMemo(() => ({ report, watchedItemIds }), [report, watchedItemIds]);

  return (
    <WidgetActivityReporterContext value={reporter}>
      <WidgetActivitiesContext value={activities}>{children}</WidgetActivitiesContext>
    </WidgetActivityReporterContext>
  );
};

export const useWidgetActivities = (): WidgetActivities => useContext(WidgetActivitiesContext);

export const useWidgetActivityWatched = (itemId?: string): boolean => {
  const context = useContext(WidgetActivityReporterContext);
  return Boolean(itemId && context?.watchedItemIds.has(itemId));
};

interface WidgetActivityQuery {
  isSuccess: boolean;
  isError: boolean;
  dataUpdatedAt: number;
  fetchStatus: string;
}

interface QueryActivityInput extends WidgetActivityFacts {
  itemId?: string;
  query: WidgetActivityQuery;
  recordsPerRow: number;
  complete: boolean;
  configured: boolean;
  freshForMs?: number;
  sourceUpdatedAt?: number;
}

/** Only a complete, recent successful result can make a widget inactive. */
export const useReportWidgetActivity = ({
  itemId,
  query,
  count,
  relevance,
  recordsPerRow,
  complete,
  configured,
  freshForMs = 65_000,
  sourceUpdatedAt,
}: QueryActivityInput) => {
  const context = useContext(WidgetActivityReporterContext);
  const report = itemId && context?.watchedItemIds.has(itemId) ? context.report : undefined;
  const { isSuccess, isError, dataUpdatedAt, fetchStatus } = query;
  let updatedAt = dataUpdatedAt;
  if (sourceUpdatedAt !== undefined) updatedAt = Math.min(dataUpdatedAt, sourceUpdatedAt);
  let status: WidgetActivity["status"] = "unknown";
  if (configured && isSuccess && !isError && fetchStatus !== "paused") status = complete ? "ready" : "partial";
  const requestedRows = 1 + Math.ceil(count / recordsPerRow);

  useEffect(() => {
    if (!itemId || !report) return;
    report(itemId, { status, count, relevance, requestedRows, updatedAt, freshForMs });
  }, [itemId, report, status, count, relevance, requestedRows, updatedAt, freshForMs]);

  useEffect(() => {
    if (!itemId || !report) return;
    return () => report(itemId, undefined);
  }, [itemId, report]);
};

export const getWidgetRelevance = (activity: WidgetActivity | undefined, now = Date.now()): WidgetRelevance => {
  if (!activity || activity.status === "unknown" || activity.updatedAt <= 0) return "unknown";
  if (activity.status === "partial" && activity.relevance === "quiet") return "unknown";
  if (now - activity.updatedAt > activity.freshForMs) return "unknown";
  return activity.relevance;
};

export const getWidgetActivity = (
  activity: WidgetActivity | undefined,
  now = Date.now(),
): "active" | "quiet" | "unknown" => {
  const relevance = getWidgetRelevance(activity, now);
  if (relevance === "quiet" || relevance === "unknown") return relevance;
  return "active";
};
