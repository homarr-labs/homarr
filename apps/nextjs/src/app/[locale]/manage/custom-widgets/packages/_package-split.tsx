"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A focusable window splitter is an interactive separator, not a thematic break. */

import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "@homarr/translation/client";

import classes from "./_package-workspace.module.css";

const defaultWidth = 60;
const clampWidth = (value: number, maximum = 75) => Math.min(maximum, Math.max(30, value));

/** The split is an editor preference; it never changes the widget's authored dimensions. */
export function PackageSplit({
  userId,
  pane,
  preview,
  children,
}: PropsWithChildren<{ userId: string; pane: string; preview: ReactNode }>) {
  const t = useI18n("customWidget.package");
  const [width, setWidth] = useState(defaultWidth);
  const [availableWidth, setAvailableWidth] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const key = `homarr:widget-workspace:split:${userId}`;
  const latest = useRef(width);
  let maximum = 75;
  if (availableWidth >= 650) maximum = Math.min(75, ((availableWidth - 338) / availableWidth) * 100);
  const visibleWidth = clampWidth(width, maximum);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry?.contentRect.width ?? 0));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved && Number.isFinite(Number(saved))) {
        const next = clampWidth(Number(saved));
        latest.current = next;
        setWidth(next);
      }
    } catch {
      // Browser storage is optional for editor preferences.
    }
  }, [key]);
  const remember = (value: number) => {
    const next = clampWidth(value, maximum);
    latest.current = next;
    setWidth(next);
    try {
      localStorage.setItem(key, String(next));
    } catch {
      // Resizing remains available when browser storage is disabled.
    }
  };
  return (
    <div
      ref={container}
      className={classes.workspace}
      data-pane={pane}
      style={{ "--widget-editor-width": `${visibleWidth}%` } as CSSProperties}
    >
      {children}
      <div
        className={classes.divider}
        role="separator"
        tabIndex={0}
        aria-label={t("resizeEditor")}
        title={t("resizeEditorHint")}
        aria-orientation="vertical"
        aria-valuemin={30}
        aria-valuemax={Math.round(maximum)}
        aria-valuenow={Math.round(visibleWidth)}
        onDoubleClick={() => remember(defaultWidth)}
        onKeyDown={(event) => {
          let next = visibleWidth;
          if (event.key === "ArrowLeft") next -= 5;
          else if (event.key === "ArrowRight") next += 5;
          else if (event.key === "Home") next = 30;
          else if (event.key === "End") next = maximum;
          else return;
          event.preventDefault();
          remember(next);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const bounds = container.current?.getBoundingClientRect();
          if (!bounds?.width) return;
          latest.current = clampWidth(((event.clientX - bounds.left) / bounds.width) * 100, maximum);
          setWidth(latest.current);
        }}
        onPointerUp={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          remember(latest.current);
        }}
      />
      {preview}
    </div>
  );
}
