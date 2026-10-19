import { useMemo } from "react";
import type { AreaChartProps } from "@mantine/charts";

import classes from "./chart.module.css";

interface BeszelChartPreviewProps {
  title: string;
  data: AreaChartProps["data"];
  series: AreaChartProps["series"];
  type?: AreaChartProps["type"];
  yAxisFormatter: (value: number) => string;
  yAxisDomain?: [number, string];
}

const coordinate = (value: number) => Math.round(value * 100) / 100;

/** A responsive plot of cached values that needs neither hydration nor chart measurement. */
export const BeszelChartPreview = ({
  title,
  data,
  series,
  type,
  yAxisFormatter,
  yAxisDomain,
}: BeszelChartPreviewProps) => {
  const { paths, ticks } = useMemo(() => {
    const minimum = yAxisDomain?.[0] ?? 0;
    const baselines = data.map(() => minimum);
    const layers = series.map(({ name, color }) => {
      const points = data.map((record, index) => {
        const value: unknown = record[name];
        if (typeof value !== "number" || !Number.isFinite(value)) return null;
        const bottom = baselines[index] ?? minimum;
        let top = minimum + value;
        if (type === "stacked") {
          top = bottom + value;
          baselines[index] = top;
        }
        return { index, bottom, top };
      });
      return { name, color, points };
    });
    let maximum = minimum + 1;
    for (const layer of layers) {
      for (const point of layer.points) {
        if (point) maximum = Math.max(maximum, point.top);
      }
    }
    const verticalPosition = (value: number) => coordinate(100 - ((value - minimum) / (maximum - minimum)) * 100);
    const horizontalPosition = (index: number) => coordinate((index / Math.max(1, data.length - 1)) * 100);
    const plotPaths = layers.flatMap(({ name, color, points }) => {
      const segments: NonNullable<(typeof points)[number]>[][] = [];
      let segment: NonNullable<(typeof points)[number]>[] = [];
      for (const point of points) {
        if (point) {
          segment.push(point);
        } else if (segment.length > 0) {
          segments.push(segment);
          segment = [];
        }
      }
      if (segment.length > 0) segments.push(segment);
      return segments.map((run, index) => ({
        key: `${name}-${index}`,
        color,
        name,
        d: `M${run.map((point) => `${horizontalPosition(point.index)},${verticalPosition(point.top)}`).join("L")}L${run
          .toReversed()
          .map((point) => `${horizontalPosition(point.index)},${verticalPosition(point.bottom)}`)
          .join("L")}Z`,
      }));
    });
    return {
      paths: plotPaths,
      ticks: [maximum, minimum + (maximum - minimum) / 2, minimum],
    };
  }, [data, series, type, yAxisDomain]);

  return (
    <div className={classes.preview} data-beszel-chart-preview>
      <div className={classes.previewAxis} aria-hidden>
        {ticks.map((value) => (
          <span key={value}>{yAxisFormatter(value)}</span>
        ))}
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={title}>
        <title>{title}</title>
        {[0, 25, 50, 75, 100].map((position) => (
          <line key={position} x1="0" x2="100" y1={position} y2={position} className={classes.previewGrid} />
        ))}
        {paths.map(({ key, name, color, d: pathData }) => (
          <path
            key={key}
            data-beszel-preview-series={name}
            d={pathData}
            fill={color}
            fillOpacity={0.4}
            stroke={color}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
};
