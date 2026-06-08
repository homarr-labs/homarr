"use client";

import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

const styles: Record<string, CSSProperties> = {
  wrapper: {
    background: "var(--mantine-color-dark-7)",
    border: "1px solid var(--mantine-color-dark-4)",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    lineHeight: 1.5,
    pointerEvents: "none",
    maxHeight: 320,
    overflowY: "auto",
    overflowX: "hidden",
  },
  header: { marginBottom: 4, fontWeight: 500, color: "var(--mantine-color-gray-2)" },
  row: { display: "flex", alignItems: "center", gap: 6, padding: "1px 0" },
  indicator: { width: 3, height: 14, borderRadius: 1, flexShrink: 0 },
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
}

interface PortalTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  formatter: (value: number) => string;
  showTotal?: boolean;
}

const PortalTooltipContent = ({ active, label, payload, formatter, showTotal }: PortalTooltipProps) => {
  const mouseRef = useRef({ x: 0, y: 0 });
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const rafRef = useRef(0);

  const handleMouse = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setMouse(mouseRef.current);
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

  const sorted = [...(payload ?? [])]
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!sorted.length) return null;

  const total = sorted.reduce((sum, p) => sum + p.value, 0);

  const portalStyle: CSSProperties = {
    position: "fixed",
    left: mouse.x + 14,
    top: mouse.y,
    transform: "translateY(-50%)",
    zIndex: 10000,
    pointerEvents: "none",
  };

  return createPortal(
    <div style={portalStyle}>
      <div style={styles.wrapper}>
        <div style={styles.header}>{label}</div>
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
