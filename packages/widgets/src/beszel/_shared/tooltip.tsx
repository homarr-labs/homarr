"use client";

import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat);

const styles: Record<string, CSSProperties> = {
  wrapper: {
    background: "var(--mantine-color-dark-7)",
    border: "1px solid var(--mantine-color-dark-4)",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
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

interface PortalTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  formatter: (value: number) => string;
  showTotal?: boolean;
}

const MARGIN = 14;

const PortalTooltipContent = ({ active, label, payload, formatter, showTotal }: PortalTooltipProps) => {
  const mouseRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouse = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = tooltipRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      if (!el) {
        setPos({ x: mx + MARGIN, y: my });
        return;
      }

      const { width, height } = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let x = mx + MARGIN;
      let y = my - height / 2;

      if (x + width > vw - MARGIN) x = mx - width - MARGIN;
      if (y < MARGIN) y = MARGIN;
      if (y + height > vh - MARGIN) y = vh - MARGIN - height;

      setPos({ x, y });
    });
  }, []);

  const isActive = active && (payload?.length ?? 0) > 0;

  useEffect(() => {
    if (!isActive) return;
    document.addEventListener("mousemove", handleMouse);
    return () => {
      document.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, handleMouse]);

  if (!isActive) return null;

  const deduped = new Map<string, TooltipPayloadItem>();
  for (const item of (payload ?? []).filter((entry) => entry.value > 0)) {
    if (!deduped.has(item.dataKey)) deduped.set(item.dataKey, item);
  }
  const sorted = [...deduped.values()].toSorted((a, b) => b.value - a.value);

  if (!sorted.length) return null;

  const rawTime = sorted[0]?.payload?.rawTime as string | undefined;
  const tooltipLabel = rawTime ? dayjs(rawTime).format("MMM D, LT") : label;
  const total = sorted.reduce((sum, p) => sum + p.value, 0);

  const portalStyle: CSSProperties = {
    position: "fixed",
    left: pos.x,
    top: pos.y,
    zIndex: 10000,
    pointerEvents: "none",
  };

  return createPortal(
    <div ref={tooltipRef} style={portalStyle}>
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
            <span style={styles.name}>Total</span>
            <span style={styles.value}>{formatter(total)}</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeTooltipProps = (formatter: (v: number) => string, showTotal = false) => ({
  content: (props: any) => (
    <PortalTooltipContent
      active={props.active}
      label={props.label != null ? String(props.label) : undefined}
      payload={props.payload}
      formatter={formatter}
      showTotal={showTotal}
    />
  ),
  wrapperStyle: { visibility: "hidden" as const, position: "absolute" as const, width: 0, height: 0 },
  isAnimationActive: false,
});
