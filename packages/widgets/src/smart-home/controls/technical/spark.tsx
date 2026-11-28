import { getSparklineY, Sparkline } from "../../../common/sparkline";
import { getHistoryValues } from "../control-center/history";

interface SparkProps {
  data: (number | null)[];
  width: number;
  height: number;
  strokeWidth?: number;
  fill?: boolean;
}

// Room above and below the line, as a share of its range, so the stroke and the end dot are not clipped.
const PADDING = 0.15;

/** A small trend in the row's color (`--c`), with a dot on the latest value. Gaps stay gaps. */
export function Spark({ data, width, height, strokeWidth = 1.5, fill = true }: SparkProps) {
  const values = getHistoryValues(data);
  if (data.length < 2 || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const domain = [min - span * PADDING, max + span * PADDING] as const;
  const lastIndex = data.findLastIndex((value) => value !== null && Number.isFinite(value));
  const last = data[lastIndex];

  return (
    <span style={{ position: "relative", display: "block", flex: "none", width, height }} aria-hidden>
      <Sparkline
        series={[{ values: data, color: "var(--c)" }]}
        yDomain={domain}
        variant={fill ? "area" : "line"}
        fillOpacity={0.14}
        strokeWidth={strokeWidth}
        connectNulls={false}
      />
      {typeof last === "number" ? (
        <span
          style={{
            position: "absolute",
            left: `${(lastIndex / (data.length - 1)) * 100}%`,
            top: `${getSparklineY(last, domain) * 100}%`,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "var(--c)",
            transform: "translate(-50%, -50%)",
          }}
        />
      ) : null}
    </span>
  );
}
