"use client";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import classes from "./workbench.module.css";

/** Feature-local separator: resizing changes a CSS variable, never the widget document. */
export function WorkbenchResizeHandle({
  name,
  variable,
  direction,
  initial,
  minimum,
  maximum,
  reverse = false,
}: {
  name: string;
  variable: string;
  direction: "horizontal" | "vertical";
  initial: number;
  minimum: number;
  maximum: number;
  reverse?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const drag = useRef<{ coordinate: number; size: number } | null>(null);
  const apply = (element: HTMLElement, size: number) => {
    const next = Math.min(maximum, Math.max(minimum, Math.round(size)));
    element.closest<HTMLElement>("[data-widget-workbench]")?.style.setProperty(variable, `${next}px`);
    setValue(next);
  };
  const coordinate = (event: PointerEvent) => (direction === "horizontal" ? event.clientX : event.clientY);
  return (
    <div
      className={classes.resizeHandle}
      data-direction={direction}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Adjustable window splitters require a focusable separator role.
      role="separator"
      tabIndex={0}
      aria-label={name}
      aria-orientation={direction === "horizontal" ? "vertical" : "horizontal"}
      aria-valuenow={value}
      aria-valuemin={minimum}
      aria-valuemax={maximum}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { coordinate: coordinate(event), size: value };
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        let delta = coordinate(event) - drag.current.coordinate;
        if (reverse) delta *= -1;
        apply(event.currentTarget, drag.current.size + delta);
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let delta = 20;
        if (["ArrowLeft", "ArrowUp"].includes(event.key)) delta *= -1;
        if (reverse) delta *= -1;
        let next = value + delta;
        if (event.key === "Home") next = minimum;
        if (event.key === "End") next = maximum;
        apply(event.currentTarget, next);
      }}
    />
  );
}
