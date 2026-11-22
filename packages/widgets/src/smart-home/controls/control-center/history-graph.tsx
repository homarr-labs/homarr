"use client";

import { useMemo } from "react";

import { HistoryGraph } from "../../../common/history-graph";
import { formatNumber } from "../semantics";
import type { HaEntity } from "../types";
import classes from "./styles.module.css";

// The history every entity brings along covers the last day, evenly spaced.
const HISTORY_HOURS = 24;

/** When each value of an entity's own history was taken: evenly spread over the last day. */
export const getHistoryTimes = (count: number, now = Date.now()) => {
  const step = (HISTORY_HOURS * 3_600_000) / Math.max(count - 1, 1);
  return Array.from({ length: count }, (_, index) => now - (count - 1 - index) * step);
};

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
  const lines = useMemo(() => {
    const values = history ?? [];
    return [{ id: entity.id, values, times: getHistoryTimes(values.length), color, unit: entity.unit }];
  }, [entity.id, history, color, entity.unit]);
  return (
    <HistoryGraph
      className={classes.spark}
      lines={lines}
      scrub={scrub}
      formatValue={(_, value) => formatMeasurement(value, entity.unit)}
      formatTime={(time) => timeFormat.format(time)}
    />
  );
}
