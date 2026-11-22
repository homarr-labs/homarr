"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import classes from "./history-graph.module.css";
import { getSparklineY, Sparkline } from "./sparkline";

export interface HistoryGraphLine {
  id: string;
  /** Values in time order, oldest first; `null` where nothing is known. */
  values: readonly (number | null)[];
  /** When each value was taken, in milliseconds. Without them, scrubbing shows values but no time. */
  times?: readonly number[];
  /** Any CSS color or Mantine color, for example `blue.5`. */
  color: string;
  /** Lines with the same unit share one scale, so their proportions hold; different units each get their own. */
  unit?: string | null;
  /** A fixed scale for this line (for example 0 to 100 for percentages) instead of the one shared by its unit. */
  domain?: readonly [number, number];
}

interface HistoryGraphProps {
  lines: readonly HistoryGraphLine[];
  /** How a value reads in the scrubbing box. */
  formatValue: (line: HistoryGraphLine, value: number | null) => string;
  formatTime?: (time: number) => string;
  /** Moving across the graph shows a guide, a dot on each line and the values at that point. On by default. */
  scrub?: boolean;
  /** Whether a gap in the data stays a gap (the default) or is bridged. */
  connectNulls?: boolean;
  /** Filled areas below the lines (the default) or lines only. */
  variant?: "line" | "area";
  className?: string;
}

// Room above the highest and below the lowest value, as a share of the range, so lines do not touch the edges.
const PADDING_TOP = 0.2;
const PADDING_BOTTOM = 0.1;

const isNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** The scale of each unit across all lines, padded so the lines keep off the edges. */
export const getHistoryDomains = (lines: readonly HistoryGraphLine[]) => {
  const ranges = new Map<string, [number, number]>();
  for (const line of lines) {
    const key = line.unit ?? "";
    for (const value of line.values) {
      if (!isNumber(value)) continue;
      const range = ranges.get(key);
      ranges.set(key, range ? [Math.min(range[0], value), Math.max(range[1], value)] : [value, value]);
    }
  }
  const domains = new Map<string, readonly [number, number]>();
  for (const [key, [min, max]] of ranges) {
    const span = max - min || Math.abs(max) || 1;
    domains.set(key, [min - span * PADDING_BOTTOM, max + span * PADDING_TOP]);
  }
  return domains;
};

/** Lowest, average and highest value of a series, or null when it has none. */
export const getHistoryStats = (values: readonly (number | null)[]) => {
  const numbers = values.filter(isNumber);
  if (numbers.length === 0) return null;
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    average: numbers.reduce((sum, value) => sum + value, 0) / numbers.length,
  };
};

/**
 * A history graph with one or more lines. Lines with the same unit share one scale. Moving across it (mouse or
 * touch) shows a guide, a dot on each line and the time with every line's value at that point.
 */
export function HistoryGraph({
  lines,
  formatValue,
  formatTime,
  scrub = true,
  connectNulls = false,
  variant = "area",
  className,
}: HistoryGraphProps) {
  const [hover, setHover] = useState<number | null>(null);
  const domains = useMemo(() => getHistoryDomains(lines), [lines]);
  const domainOf = (line: HistoryGraphLine) => line.domain ?? domains.get(line.unit ?? "") ?? ([0, 1] as const);
  const drawn = lines.filter((line) => line.values.length > 1);
  const primary = drawn[0];
  const pointAt = (line: HistoryGraphLine) =>
    hover === null || line.values.length < 2 ? null : Math.round(hover * (line.values.length - 1));
  const primaryPoint = primary ? pointAt(primary) : null;
  const hoverTime = primary && primaryPoint !== null ? primary.times?.[primaryPoint] : undefined;

  let overlay: ReactNode = null;
  if (scrub && hover !== null && primary) {
    overlay = (
      <>
        <span className={classes.guide} style={{ left: `${hover * 100}%` }} aria-hidden />
        {drawn.map((line) => {
          const at = pointAt(line);
          const value = at === null ? null : (line.values[at] ?? null);
          if (at === null || !isNumber(value)) return null;
          return (
            <span
              key={line.id}
              className={classes.dot}
              style={{
                left: `${(at / (line.values.length - 1)) * 100}%`,
                top: `${getSparklineY(value, domainOf(line)) * 100}%`,
                background: line.color,
              }}
              aria-hidden
            />
          );
        })}
        <span
          className={classes.readout}
          style={hover > 0.5 ? { right: `calc(${(1 - hover) * 100}% + 8px)` } : { left: `calc(${hover * 100}% + 8px)` }}
        >
          {hoverTime === undefined || !formatTime ? null : <span>{formatTime(hoverTime)}</span>}
          {drawn.map((line) => {
            const at = pointAt(line);
            return (
              <span key={line.id} className={classes.readoutRow}>
                {drawn.length > 1 ? (
                  <span className={classes.swatch} style={{ background: line.color }} aria-hidden />
                ) : null}
                <strong>{formatValue(line, at === null ? null : (line.values[at] ?? null))}</strong>
              </span>
            );
          })}
        </span>
      </>
    );
  }

  return (
    <div
      className={className ? `${classes.root} ${className}` : classes.root}
      onPointerMove={
        scrub
          ? (event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              if (rect.width > 0) setHover(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
            }
          : undefined
      }
      onPointerLeave={scrub ? () => setHover(null) : undefined}
      data-scrub={scrub}
    >
      {drawn.map((line) => (
        <div key={line.id} className={classes.line} aria-hidden>
          <Sparkline
            series={[{ values: line.values, color: line.color }]}
            yDomain={domainOf(line)}
            variant={variant}
            fillOpacity={0.4}
            connectNulls={connectNulls}
          />
        </div>
      ))}
      {overlay}
    </div>
  );
}

interface HistoryLegendProps {
  items: readonly { id: string; color: string; label: ReactNode; value: ReactNode }[];
  className?: string;
}

/** Which line is which: a dot in each line's color, its name and its current value. */
export function HistoryLegend({ items, className }: HistoryLegendProps) {
  return (
    <div className={className ? `${classes.legend} ${className}` : classes.legend}>
      {items.map((item) => (
        <span key={item.id} className={classes.legendItem}>
          <span className={classes.swatch} style={{ background: item.color }} aria-hidden />
          <span className={classes.legendLabel}>{item.label}</span>
          <span className={classes.legendValue}>{item.value}</span>
        </span>
      ))}
    </div>
  );
}
