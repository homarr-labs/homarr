import { getHistorySegments, getHistoryValues } from "../e/history";

interface SparkProps {
  data: (number | null)[];
  width: number;
  height: number;
  strokeWidth?: number;
  fill?: boolean;
}

export function Spark({ data, width, height, strokeWidth = 1.5, fill = true }: SparkProps) {
  if (data.length < 2) return null;
  const values = getHistoryValues(data);
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = strokeWidth + 1;
  const segments = getHistorySegments(data).map((segment) =>
    segment.map(({ value, index }) => {
      const x = (index / (data.length - 1)) * width;
      const y = pad + (1 - (value - min) / range) * (height - pad * 2);
      return [x, y] as const;
    }),
  );
  const last = segments.at(-1)?.at(-1);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      style={{ display: "block", flex: "none" }}
    >
      {segments.map((points, index) => {
        const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        const area = `${points[0]?.[0]},${height} ${line} ${points.at(-1)?.[0]},${height}`;
        return (
          <g key={index}>
            {fill && <polygon points={area} fill="var(--c)" opacity={0.14} />}
            <polyline
              points={line}
              fill="none"
              stroke="var(--c)"
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        );
      })}
      {last && <circle cx={last[0]} cy={last[1]} r={2} fill="var(--c)" />}
    </svg>
  );
}
