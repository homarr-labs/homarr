"use client";

import { useMemo } from "react";

import { HistoryGraph } from "../../../common/history-graph";
import { formatNumber } from "../semantics";
import type { HaEntity } from "../types";
import classes from "./styles.module.css";

/** A measured value with its unit, as the controls show readings. */
export const formatMeasurement = (value: number | null, unit: string | null) => {
  if (value === null) return "—";
  if (!unit) return formatNumber(value);
  return unit === "%" ? `${formatNumber(value)}%` : `${formatNumber(value)} ${unit}`;
};

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

interface EntityHistoryGraphProps {
  entity: HaEntity;
  color: string;
  /** Off for graphs too small to read a value from, such as a trend beside a reading. */
  scrub?: boolean;
}

/** An entity's last day as a graph; moving across it shows the time and the value at that point. */
export function EntityHistoryGraph({ entity, color, scrub = true }: EntityHistoryGraphProps) {
  const history = entity.history;
  const times = entity.historyTimes;
  // The times the history response gave, so a cached graph keeps its sample times when it is shown again.
  const lines = useMemo(
    () => [{ id: entity.id, values: history ?? [], times: times ?? undefined, color, unit: entity.unit }],
    [entity.id, history, times, color, entity.unit],
  );
  return (
    <HistoryGraph
      className={classes.spark}
      lines={lines}
      scrub={scrub}
      label={entity.name}
      formatValue={(_, value) => formatMeasurement(value, entity.unit)}
      formatTime={(time) => timeFormat.format(time)}
    />
  );
}
