"use client";

import { useEffect, useState } from "react";

import type { RouterOutputs } from "@homarr/api";
import { isRecord } from "@homarr/common";

import type { WidgetComponentProps } from "../definition";
import { appendHealthSample, createHealthSample } from "./model";
import type { HealthSample } from "./model";

type Results = RouterOutputs["widget"]["healthMonitoring"]["getSystemHealthStatus"];
type Histories = Record<string, HealthSample[]>;

export function useHealthHistory(
  results: Results,
  queryUpdatedAt: number,
  widgetStateRef: WidgetComponentProps<"healthMonitoring">["widgetStateRef"],
  refreshInterval: number,
) {
  const [histories, setHistories] = useState<Histories>(() => {
    const previous = widgetStateRef?.current?.healthMonitoringHistory;
    if (isRecord(previous)) return previous as Histories;
    return {};
  });

  useEffect(() => {
    // Pending source queries must not clear observations that still belong to the widget.
    if (queryUpdatedAt <= 0) return;
    const previous = widgetStateRef?.current?.healthMonitoringHistory;
    let stored = histories;
    if (isRecord(previous)) stored = previous as Histories;
    const next: Histories = {};
    for (const result of results) {
      const timestamp = new Date(result.updatedAt).getTime();
      const history = stored[result.integrationId] ?? [];
      if (!Number.isFinite(timestamp) || timestamp <= 0 || (history.at(-1)?.time ?? 0) >= timestamp) {
        next[result.integrationId] = history;
        continue;
      }
      next[result.integrationId] = appendHealthSample(
        history,
        createHealthSample(timestamp, result.healthInfo),
        refreshInterval,
      );
    }
    const changed =
      Object.keys(next).length !== Object.keys(histories).length ||
      Object.keys(next).some((id) => next[id] !== histories[id]);
    if (!changed) return;
    if (widgetStateRef) {
      widgetStateRef.current ??= {};
      widgetStateRef.current.healthMonitoringHistory = next;
    }
    setHistories(next);
  }, [results, queryUpdatedAt, widgetStateRef, histories, refreshInterval]);

  return histories;
}
