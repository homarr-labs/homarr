interface SparkProps {
  data: number[];
  width: number;
  height: number;
  strokeWidth?: number;
  fill?: boolean;
}

export function Spark({ data, width, height, strokeWidth = 1.5, fill = true }: SparkProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth + 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = pad + (1 - (value - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      style={{ display: "block", flex: "none" }}
    >
      {fill && <polygon points={area} fill="var(--c)" opacity={0.14} />}
      <polyline
        points={line}
        fill="none"
        stroke="var(--c)"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last && <circle cx={last[0]} cy={last[1]} r={2} fill="var(--c)" />}
    </svg>
  );
}
