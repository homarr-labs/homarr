import { useId } from "react";
import { getThemeColor, useMantineTheme } from "@mantine/core";

export interface SparklineSeries {
  values: readonly (number | null | undefined)[];
  /** Mantine color, for example `blue.5`. */
  color: string;
}

interface SparklineProps {
  series: readonly SparklineSeries[];
  /** Expected value range. It widens when values fall outside it; without it the range is 0 to the largest value. */
  yDomain?: readonly [number, number];
  variant?: "line" | "area";
  fillOpacity?: number;
  strokeWidth?: number;
}

interface Point {
  x: number;
  y: number;
}

const VIEWBOX_SIZE = 100;

/**
 * Lightweight SVG replacement for small Recharts line and area charts. It renders one path per series
 * (plus one fill for areas) and does not measure the DOM, so many instances stay cheap to mount.
 */
export const Sparkline = ({
  series,
  yDomain,
  variant = "line",
  fillOpacity = 0.3,
  strokeWidth = 2,
}: SparklineProps) => {
  const theme = useMantineTheme();
  const idPrefix = useId().replace(/[^\w-]/g, "");

  const finiteValues = series.flatMap((item) => item.values.filter(isFiniteNumber));
  if (finiteValues.length === 0) return null;

  const [min, max] = resolveDomain(finiteValues, yDomain);
  const range = max - min;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      overflow="visible"
      style={{ display: "block" }}
      aria-hidden
    >
      {series.map((item, seriesIndex) => {
        const points = toPoints(item.values, min, range);
        if (points.length === 0) return null;
        const color = getThemeColor(item.color, theme);
        const line = createMonotonePath(points);
        const gradientId = `${idPrefix}-${seriesIndex}`;

        return (
          <g key={seriesIndex}>
            {variant === "area" && (
              <>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <path
                  d={`${line} L${format(points.at(-1)?.x ?? 0)},${VIEWBOX_SIZE} L${format(points[0]?.x ?? 0)},${VIEWBOX_SIZE} Z`}
                  fill={`url(#${gradientId})`}
                  stroke="none"
                />
              </>
            )}
            <path
              d={line}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
};

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const resolveDomain = (values: number[], domain: SparklineProps["yDomain"]): [number, number] => {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const domainMin = domain && Number.isFinite(domain[0]) ? domain[0] : 0;
  const domainMax = domain && Number.isFinite(domain[1]) ? domain[1] : dataMax;
  // Like Recharts' default, the requested domain grows to fit values outside of it.
  const min = Math.min(domainMin, dataMin);
  const max = Math.max(domainMax, dataMax);
  return max > min ? [min, max] : [min, min + 1];
};

// Missing values are skipped and their neighbours connected, matching Mantine charts' `connectNulls` default.
const toPoints = (values: SparklineSeries["values"], min: number, range: number) => {
  const lastIndex = Math.max(values.length - 1, 1);
  const points: Point[] = [];
  for (const [index, value] of values.entries()) {
    if (!isFiniteNumber(value)) continue;
    points.push({
      x: (index / lastIndex) * VIEWBOX_SIZE,
      y: VIEWBOX_SIZE - ((value - min) / range) * VIEWBOX_SIZE,
    });
  }
  return points;
};

const format = (value: number) => Number(value.toFixed(2)).toString();

const sign = (value: number) => (value < 0 ? -1 : 1);

// Tangent at an end point, derived from the adjacent segment and its inner tangent.
const endTangent = (from: Point, to: Point, neighbourTangent: number) =>
  (3 * (to.y - from.y)) / (to.x - from.x) / 2 - neighbourTangent / 2;

/** Monotone cubic interpolation along x, equivalent to d3's `curveMonotoneX` used by Recharts' `monotone` curve. */
const createMonotonePath = (points: Point[]) => {
  const [first] = points;
  if (!first) return "";
  if (points.length < 3) {
    return points.map((point, index) => `${index === 0 ? "M" : "L"}${format(point.x)},${format(point.y)}`).join(" ");
  }

  const tangents = points.map((point, index) => {
    const previous = points[index - 1];
    const next = points[index + 1];
    if (!previous || !next) return 0;
    const h0 = point.x - previous.x;
    const h1 = next.x - point.x;
    const s0 = (point.y - previous.y) / h0;
    const s1 = (next.y - point.y) / h1;
    const p = (s0 * h1 + s1 * h0) / (h0 + h1);
    return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  });
  const lastIndex = points.length - 1;
  /* eslint-disable @typescript-eslint/no-non-null-assertion -- indices are within bounds for three or more points */
  tangents[0] = endTangent(points[0]!, points[1]!, tangents[1]!);
  tangents[lastIndex] = endTangent(points[lastIndex - 1]!, points[lastIndex]!, tangents[lastIndex - 1]!);
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  let path = `M${format(first.x)},${format(first.y)}`;
  for (let index = 1; index < points.length; index++) {
    /* eslint-disable @typescript-eslint/no-non-null-assertion -- index and index - 1 are within bounds */
    const from = points[index - 1]!;
    const to = points[index]!;
    const t0 = tangents[index - 1]!;
    const t1 = tangents[index]!;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
    const dx = (to.x - from.x) / 3;
    path += ` C${format(from.x + dx)},${format(from.y + dx * t0)} ${format(to.x - dx)},${format(to.y - dx * t1)} ${format(to.x)},${format(to.y)}`;
  }
  return path;
};
