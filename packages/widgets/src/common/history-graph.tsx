"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { getThemeColor, Portal, useMantineTheme } from "@mantine/core";

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
  /** Names the graph for assistive technology; with scrubbing, the arrow keys step through its points. */
  label?: string;
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

const hasTimes = (line: HistoryGraphLine): line is HistoryGraphLine & { times: readonly number[] } =>
  line.times !== undefined && line.times.length === line.values.length && line.values.length > 1;

/**
 * Where each value of each line sits across the graph, 0 to 1. Lines with times share one time axis, so series
 * sampled at different intervals line up; lines without times are spread evenly.
 */
export const getHistoryPositions = (lines: readonly HistoryGraphLine[]) => {
  const timed = lines.filter(hasTimes);
  const start = Math.min(...timed.map((line) => line.times[0] ?? Infinity));
  const end = Math.max(...timed.map((line) => line.times.at(-1) ?? -Infinity));
  const span = end - start;
  return new Map(
    lines.map((line) => [
      line.id,
      hasTimes(line) && span > 0
        ? line.times.map((time) => (time - start) / span)
        : line.values.map((_, index) => index / Math.max(line.values.length - 1, 1)),
    ]),
  );
};

/** The index of the position closest to a point across the graph. */
const nearestIndex = (positions: readonly number[], at: number) => {
  let best = 0;
  for (const [index, position] of positions.entries()) {
    if (Math.abs(position - at) < Math.abs((positions[best] ?? 0) - at)) best = index;
  }
  return best;
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
  label,
  className,
}: HistoryGraphProps) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useMantineTheme();
  // Where the pointer is (0 to 1 across the graph) and where the graph is on screen, for the overlay.
  const [pointer, setPointer] = useState<{ at: number; rect: DOMRect } | null>(null);
  // The overlay sits on the page, not in the graph: when the page scrolls or resizes, it follows the graph.
  const shownAt = pointer?.at ?? null;
  useEffect(() => {
    if (shownAt === null) return;
    const follow = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) setPointer(null);
      else setPointer((current) => (current ? { at: current.at, rect } : current));
    };
    window.addEventListener("scroll", follow, { capture: true, passive: true });
    window.addEventListener("resize", follow, { passive: true });
    return () => {
      window.removeEventListener("scroll", follow, { capture: true });
      window.removeEventListener("resize", follow);
    };
  }, [shownAt]);
  const domains = useMemo(() => getHistoryDomains(lines), [lines]);
  const positions = useMemo(() => getHistoryPositions(lines), [lines]);
  const domainOf = (line: HistoryGraphLine) => domains.get(line.unit ?? "") ?? ([0, 1] as const);
  const positionsOf = (line: HistoryGraphLine) => positions.get(line.id) ?? [];
  const drawn = lines.filter((line) => line.values.length > 1);
  const primary = drawn[0];
  // The guide snaps to the first line's nearest sample; every line shows its own sample closest to that time.
  const primaryPoint = primary && pointer ? nearestIndex(positionsOf(primary), pointer.at) : null;
  const hover = primary && primaryPoint !== null ? (positionsOf(primary)[primaryPoint] ?? null) : null;
  const hoverTime = primary && primaryPoint !== null ? primary.times?.[primaryPoint] : undefined;
  const pointAt = (line: HistoryGraphLine) => (hover === null ? null : nearestIndex(positionsOf(line), hover));
  const readout =
    hover === null
      ? null
      : [
          hoverTime === undefined || !formatTime ? null : formatTime(hoverTime),
          ...drawn.map((line) => {
            const at = pointAt(line);
            return formatValue(line, at === null ? null : (line.values[at] ?? null));
          }),
        ]
          .filter(Boolean)
          .join(", ");

  const show = (at: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect && rect.width > 0) setPointer({ at: Math.min(1, Math.max(0, at)), rect });
  };

  // Arrow keys step through the first line's samples; Home and End jump to its ends.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!primary) return;
    const own = positionsOf(primary);
    const current = primaryPoint ?? own.length - 1;
    const next =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? current - 1
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? current + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? own.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    show(own[Math.min(own.length - 1, Math.max(0, next))] ?? 0);
  };

  let overlay: ReactNode = null;
  if (scrub && pointer && hover !== null && primary) {
    // Above everything and outside the graph's container, so the values are never cut off at a card's edge.
    overlay = (
      <Portal>
        <div
          className={classes.overlay}
          style={{
            left: pointer.rect.left,
            top: pointer.rect.top,
            width: pointer.rect.width,
            height: pointer.rect.height,
          }}
        >
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
                  left: `${(positionsOf(line)[at] ?? 0) * 100}%`,
                  top: `${getSparklineY(value, domainOf(line)) * 100}%`,
                  background: getThemeColor(line.color, theme),
                }}
                aria-hidden
              />
            );
          })}
          <span
            className={classes.readout}
            style={
              hover > 0.5 ? { right: `calc(${(1 - hover) * 100}% + 8px)` } : { left: `calc(${hover * 100}% + 8px)` }
            }
          >
            {hoverTime === undefined || !formatTime ? null : <span>{formatTime(hoverTime)}</span>}
            {drawn.map((line) => {
              const at = pointAt(line);
              return (
                <span key={line.id} className={classes.readoutRow}>
                  {drawn.length > 1 ? (
                    <span
                      className={classes.swatch}
                      style={{ background: getThemeColor(line.color, theme) }}
                      aria-hidden
                    />
                  ) : null}
                  <strong>{formatValue(line, at === null ? null : (line.values[at] ?? null))}</strong>
                </span>
              );
            })}
          </span>
        </div>
      </Portal>
    );
  }

  const keyboard = scrub && primary !== undefined;
  const last = primary ? positionsOf(primary).length - 1 : 0;
  // With scrubbing the graph is a slider through its points; without, a picture.
  const accessibility = keyboard
    ? {
        role: "slider",
        tabIndex: 0,
        "aria-valuemin": 0,
        "aria-valuemax": last,
        "aria-valuenow": primaryPoint ?? last,
        "aria-valuetext": readout ?? undefined,
        onKeyDown,
        onBlur: () => setPointer(null),
      }
    : { role: "img" };
  return (
    <div
      ref={ref}
      className={className ? `${classes.root} ${className}` : classes.root}
      {...accessibility}
      aria-label={label}
      onPointerMove={
        scrub
          ? (event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              if (rect.width > 0) show((event.clientX - rect.left) / rect.width);
            }
          : undefined
      }
      onPointerLeave={scrub ? () => setPointer(null) : undefined}
      data-scrub={scrub}
    >
      {drawn.map((line) => (
        <div key={line.id} className={classes.line} aria-hidden>
          <Sparkline
            series={[{ values: line.values, positions: positionsOf(line), color: line.color }]}
            yDomain={domainOf(line)}
            variant="area"
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
  const theme = useMantineTheme();
  return (
    <div className={className ? `${classes.legend} ${className}` : classes.legend}>
      {items.map((item) => (
        <span key={item.id} className={classes.legendItem}>
          {/* A Mantine color such as `blue.5` resolves like the graph's lines; CSS colors pass through. */}
          <span className={classes.swatch} style={{ background: getThemeColor(item.color, theme) }} aria-hidden />
          <span className={classes.legendLabel}>{item.label}</span>
          <span className={classes.legendValue}>{item.value}</span>
        </span>
      ))}
    </div>
  );
}
