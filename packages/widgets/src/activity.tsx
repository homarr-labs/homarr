"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface WidgetActivity {
  status: "ready" | "unknown";
  count: number;
  updatedAt: number;
  freshForMs: number;
}

export type WidgetActivities = Readonly<Record<string, WidgetActivity | undefined>>;

interface ActivityReporter {
  report: (itemId: string, reporter: symbol, activity: WidgetActivity) => void;
  remove: (itemId: string, reporter: symbol) => void;
  watchedItemIds?: ReadonlySet<string>;
}

const noActivities: WidgetActivities = {};
const WidgetActivitiesContext = createContext<WidgetActivities>(noActivities);
const WidgetActivityReporterContext = createContext<ActivityReporter | null>(null);

/** Collect existing widget query results without introducing a second data or permission path. */
export const WidgetActivityProvider = ({
  children,
  watchedItemIds,
}: PropsWithChildren<{ watchedItemIds?: ReadonlySet<string> }>) => {
  const [activities, setActivities] = useState<WidgetActivities>({});
  const reporters = useRef(new Map<string, Map<symbol, WidgetActivity>>());
  const publish = useCallback((itemId: string, activity: WidgetActivity | undefined) => {
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
        existing.count === activity.count &&
        existing.updatedAt === activity.updatedAt &&
        existing.freshForMs === activity.freshForMs
      ) {
        return previous;
      }
      return { ...previous, [itemId]: activity };
    });
  }, []);
  const report = useCallback(
    (itemId: string, reporter: symbol, activity: WidgetActivity) => {
      const instances = reporters.current.get(itemId) ?? new Map<symbol, WidgetActivity>();
      instances.set(reporter, activity);
      reporters.current.set(itemId, instances);
      publish(itemId, activity);
    },
    [publish],
  );
  const remove = useCallback(
    (itemId: string, reporter: symbol) => {
      const instances = reporters.current.get(itemId);
      if (!instances) return;
      instances.delete(reporter);
      if (instances.size === 0) reporters.current.delete(itemId);
      const remaining = [...instances.values()].toSorted((left, right) => right.updatedAt - left.updatedAt)[0];
      publish(itemId, remaining);
    },
    [publish],
  );
  const reporter = useMemo(() => ({ report, remove, watchedItemIds }), [report, remove, watchedItemIds]);

  return (
    <WidgetActivityReporterContext value={reporter}>
      <WidgetActivitiesContext value={activities}>{children}</WidgetActivitiesContext>
    </WidgetActivityReporterContext>
  );
};

export const useWidgetActivities = (): WidgetActivities => useContext(WidgetActivitiesContext);

interface WidgetActivityQuery {
  isSuccess: boolean;
  isError: boolean;
  dataUpdatedAt: number;
  fetchStatus: string;
}

interface QueryActivityInput {
  itemId?: string;
  query: WidgetActivityQuery;
  count: number;
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
  complete,
  configured,
  freshForMs = 65_000,
  sourceUpdatedAt,
}: QueryActivityInput) => {
  const context = useContext(WidgetActivityReporterContext);
  const reporter = useRef(Symbol("widget-activity")).current;
  const report = context?.report;
  const remove = context?.remove;
  const watched = Boolean(itemId && (!context?.watchedItemIds || context.watchedItemIds.has(itemId)));
  const { isSuccess, isError, dataUpdatedAt, fetchStatus } = query;
  let updatedAt = dataUpdatedAt;
  if (sourceUpdatedAt !== undefined) updatedAt = Math.min(dataUpdatedAt, sourceUpdatedAt);
  let status: WidgetActivity["status"] = "unknown";
  if (configured && complete && isSuccess && !isError && fetchStatus !== "paused") status = "ready";

  useEffect(() => {
    if (!itemId || !report || !watched) return;
    report(itemId, reporter, { status, count, updatedAt, freshForMs });
  }, [itemId, report, reporter, status, count, updatedAt, freshForMs, watched]);

  useEffect(() => {
    if (!itemId || !remove || !watched) return;
    return () => remove(itemId, reporter);
  }, [itemId, remove, reporter, watched]);
};

export const getWidgetActivity = (
  activity: WidgetActivity | undefined,
  now = Date.now(),
): "active" | "quiet" | "unknown" => {
  if (!activity || activity.status !== "ready" || activity.updatedAt <= 0) return "unknown";
  if (now - activity.updatedAt > activity.freshForMs) return "unknown";
  if (activity.count > 0) return "active";
  return "quiet";
};
