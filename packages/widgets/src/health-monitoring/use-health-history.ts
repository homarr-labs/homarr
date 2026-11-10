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
  observedAt: number,
  widgetStateRef: WidgetComponentProps<"healthMonitoring">["widgetStateRef"],
) {
  const [histories, setHistories] = useState<Histories>(() => {
    const previous = widgetStateRef?.current?.healthMonitoringHistory;
    if (isRecord(previous)) return previous as Histories;
    return {};
  });

  useEffect(() => {
    // Pending source queries must not clear observations that still belong to the widget.
    if (observedAt <= 0) return;
    const previous = widgetStateRef?.current?.healthMonitoringHistory;
    let stored = histories;
    if (isRecord(previous)) stored = previous as Histories;
    const next: Histories = {};
    for (const result of results) {
      let timestamp = observedAt;
      if (result.updatedAt) timestamp = new Date(result.updatedAt).getTime();
      if (!Number.isFinite(timestamp) || timestamp <= 0) continue;
      next[result.integrationId] = appendHealthSample(
        stored[result.integrationId] ?? [],
        createHealthSample(timestamp, result.healthInfo),
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
  }, [results, observedAt, widgetStateRef, histories]);

  return histories;
}
