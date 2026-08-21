"use client";

import type { CSSProperties } from "react";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { formatLocalizedDate } from "../../common/locale";

const styles: Record<string, CSSProperties> = {
  wrapper: {
    background: "var(--mantine-color-dark-7)",
    border: "1px solid var(--mantine-color-dark-4)",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: "var(--mantine-font-size-xs)",
    lineHeight: 1.5,
    pointerEvents: "none",
    overflowX: "hidden",
  },
  header: { marginBottom: 4, fontWeight: 550, color: "var(--mantine-color-gray-2)" },
  row: { display: "flex", alignItems: "center", gap: 6, padding: "1px 0" },
  indicator: { width: 5, height: 14, borderRadius: 5, flexShrink: 0 },
  name: {
    flex: 1,
    color: "var(--mantine-color-gray-3)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 140,
  },
  value: {
    fontWeight: 700,
    color: "var(--mantine-color-gray-1)",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
  separator: { borderTop: "1px solid var(--mantine-color-dark-4)", marginTop: 3, paddingTop: 3 },
};

export interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload?: Record<string, unknown>;
}

interface BeszelTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  formatter: (value: number) => string;
  showTotal?: boolean;
}

const BeszelTooltipContent = ({ active, label, payload, formatter, showTotal }: BeszelTooltipProps) => {
  const locale = useCurrentIntlLocale();
  const t = useI18n("common");
  const isActive = active && (payload?.length ?? 0) > 0;
  if (!isActive) return null;

  const deduped = new Map<string, TooltipPayloadItem>();
  for (const item of (payload ?? []).filter((entry) => entry.value > 0)) {
    if (!deduped.has(item.dataKey)) deduped.set(item.dataKey, item);
  }
  const sorted = [...deduped.values()].toSorted((a, b) => b.value - a.value);

  if (!sorted.length) return null;

  const rawTime = sorted[0]?.payload?.rawTime as string | undefined;
  const tooltipLabel = rawTime
    ? formatLocalizedDate(rawTime, locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : label;
  const total = sorted.reduce((sum, p) => sum + p.value, 0);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>{tooltipLabel}</div>
      {sorted.map((item) => (
        <div key={item.dataKey} style={styles.row}>
          <div style={{ ...styles.indicator, background: item.color }} />
          <span style={styles.name}>{item.name}</span>
          <span style={styles.value}>{formatter(item.value)}</span>
        </div>
      ))}
      {showTotal && sorted.length > 1 && (
        <div style={{ ...styles.row, ...styles.separator }}>
          <span style={styles.name}>{t("total")}</span>
          <span style={styles.value}>{formatter(total)}</span>
        </div>
      )}
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeTooltipProps = (formatter: (v: number) => string, showTotal = false) => ({
  content: (props: any) => (
    <BeszelTooltipContent
      active={props.active}
      label={props.label != null ? String(props.label) : undefined}
      payload={props.payload}
      formatter={formatter}
      showTotal={showTotal}
    />
  ),
  wrapperStyle: { pointerEvents: "none" as const },
  isAnimationActive: false,
});
