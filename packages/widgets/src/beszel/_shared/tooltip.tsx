"use client";

import type { TooltipContentProps } from "recharts";

import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { formatLocalizedDate } from "../../common/locale";
import classes from "./chart.module.css";

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
  payload?: TooltipContentProps<number, string>["payload"];
  formatter: (value: number) => string;
  showTotal?: boolean;
}

const BeszelTooltipContent = ({ active, label, payload, formatter, showTotal }: BeszelTooltipProps) => {
  const locale = useCurrentIntlLocale();
  const t = useI18n("common");
  if (!active || !payload?.length) return null;

  const deduped = new Map<string, TooltipPayloadItem>();
  for (const item of payload) {
    if (typeof item.value !== "number" || !Number.isFinite(item.value) || typeof item.dataKey !== "string") continue;
    if (!deduped.has(item.dataKey)) {
      deduped.set(item.dataKey, {
        name: String(item.name ?? item.dataKey),
        value: item.value,
        color: item.color ?? "currentColor",
        dataKey: item.dataKey,
        payload: item.payload,
      });
    }
  }
  const sorted = [...deduped.values()].toSorted((a, b) => b.value - a.value);
  if (!sorted.length) return null;

  const rawTime = sorted[0]?.payload?.rawTime;
  let tooltipLabel = label;
  if (typeof rawTime === "string") {
    tooltipLabel = formatLocalizedDate(rawTime, locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const total = sorted.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={classes.tooltip}>
      <div className={classes.tooltipHeader}>{tooltipLabel}</div>
      <div className={classes.tooltipRows}>
        {sorted.map((item) => (
          <div key={item.dataKey} className={classes.tooltipRow}>
            <div className={classes.tooltipIndicator} style={{ background: item.color }} />
            <span className={classes.tooltipName}>{item.name}</span>
            <span className={classes.tooltipValue}>{formatter(item.value)}</span>
          </div>
        ))}
        {showTotal && (
          <div className={classes.tooltipTotal}>
            <span className={classes.tooltipName}>{t("total")}</span>
            <span className={classes.tooltipValue}>{formatter(total)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const makeTooltipProps = (formatter: (value: number) => string, showTotal = false) => ({
  content: (props: TooltipContentProps<number, string>) => (
    <BeszelTooltipContent
      active={props.active}
      label={props.label?.toString()}
      payload={props.payload}
      formatter={formatter}
      showTotal={showTotal}
    />
  ),
  cursor: { stroke: "var(--beszel-chart-border)", strokeWidth: 1, strokeDasharray: "0" },
  wrapperStyle: { pointerEvents: "none" as const, zIndex: 3 },
  isAnimationActive: false,
});
