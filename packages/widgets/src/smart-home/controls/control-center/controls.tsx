"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";

import { getHistorySegments, getHistoryValues } from "./history";
import { clamp, useDeviceControlDisabled, useHold } from "./hooks";
import classes from "./styles.module.css";

interface PillSliderProps {
  value: number;
  min?: number;
  max?: number;
  label: string;
  axis: "vertical" | "horizontal";
  onCommit: (value: number) => void;
  onTap?: () => void;
  onPreview?: (value: number | null) => void;
  valueText?: (value: number) => string;
  pending?: boolean;
  disabled?: boolean;
  track?: number;
  className?: string;
  children?: (shown: number) => ReactNode;
  renderFooter?: (shown: number) => ReactNode;
}

const splitClips = (axis: "vertical" | "horizontal", shown: number) => {
  if (axis === "vertical") {
    return { bare: `inset(0 0 ${shown}% 0)`, covered: `inset(${100 - shown}% 0 0 0)` };
  }
  return { bare: `inset(0 0 0 ${shown}%)`, covered: `inset(0 ${100 - shown}% 0 0)` };
};

const sliderKeySteps: Record<string, number> = {
  ArrowUp: 5,
  ArrowRight: 5,
  ArrowDown: -5,
  ArrowLeft: -5,
  PageUp: 20,
  PageDown: -20,
};

export function PillSlider({
  value,
  min = 0,
  max = 100,
  label,
  axis,
  onCommit,
  onTap,
  onPreview,
  valueText,
  pending,
  disabled: disabledProp,
  track,
  className,
  children,
  renderFooter,
}: PillSliderProps) {
  const disabled = useDeviceControlDisabled(disabledProp || min >= max);
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const previewRef = useRef(onPreview);
  const [local, setLocal] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const shown = clamp(disabled ? value : (local ?? value), min, max);
  const fraction = min < max ? ((shown - min) / (max - min)) * 100 : 0;

  useEffect(() => {
    if (!disabled) return;
    gesture.current = null;
    setDragging(false);
    setLocal(null);
  }, [disabled]);

  useEffect(() => {
    previewRef.current = onPreview;
  });

  useEffect(() => {
    if (!pending && !gesture.current) setLocal(null);
  }, [pending, value, min, max]);

  useEffect(() => {
    previewRef.current?.(local);
  }, [local]);

  const read = (event: PointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return shown;
    const position =
      axis === "vertical" ? 1 - (event.clientY - rect.top) / rect.height : (event.clientX - rect.left) / rect.width;
    return clamp(Math.round(min + position * (max - min)), min, max);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { x: event.clientX, y: event.clientY, moved: false };
  };

  const release = () => {
    gesture.current = null;
    setDragging(false);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || disabled) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5) return;
    current.moved = true;
    setDragging(true);
    setLocal(read(event));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!current || disabled) return;
    if (current.moved) {
      const next = read(event);
      setLocal(next);
      onCommit(next);
      return;
    }
    if (onTap) {
      onTap();
      return;
    }
    const next = read(event);
    setLocal(next);
    onCommit(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = sliderKeySteps[event.key];
    let edge: number | undefined;
    if (event.key === "Home") edge = min;
    if (event.key === "End") edge = max;
    if (step !== undefined || edge !== undefined) {
      event.preventDefault();
      const next = edge ?? clamp(shown + (step ?? 0), min, max);
      if (next === shown) return;
      setLocal(next);
      onCommit(next);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && onTap) {
      event.preventDefault();
      onTap();
    }
  };

  const fillStyle = axis === "vertical" ? { height: `${fraction}%` } : { width: `${fraction}%` };

  const clips = splitClips(axis, fraction);
  const trackStyle = track === undefined ? undefined : ({ "--track-size": `${track}px` } as CSSProperties);

  return (
    <div
      ref={ref}
      className={`${classes.pill} ${className ?? ""}`}
      style={trackStyle}
      data-axis={axis}
      data-thin={track !== undefined}
      data-footer={renderFooter !== undefined}
      data-dragging={dragging}
      data-pending={pending ?? false}
      data-disabled={disabled ?? false}
      data-high={fraction >= 50}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={shown}
      aria-valuetext={valueText?.(shown)}
      aria-disabled={disabled}
      aria-busy={pending}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        release();
        setLocal(null);
      }}
      onLostPointerCapture={() => {
        if (gesture.current) setLocal(null);
        release();
      }}
      onKeyDown={onKeyDown}
    >
      <div ref={trackRef} className={classes.pillTrack}>
        <div className={classes.pillFill} style={fillStyle} />
        {children ? (
          <>
            <div className={classes.pillContent} style={{ clipPath: clips.bare }}>
              {children(shown)}
            </div>
            <div className={classes.pillContent} data-covered style={{ clipPath: clips.covered }} aria-hidden>
              {children(shown)}
            </div>
          </>
        ) : null}
      </div>
      {renderFooter ? <div className={classes.pillFooter}>{renderFooter(shown)}</div> : null}
    </div>
  );
}

const formatDialValue = (value: number) => String(Math.round(value * 10) / 10);

const START = 135;
const SWEEP = 270;
const polar = (angle: number) => ({
  x: 50 + 40 * Math.cos((angle * Math.PI) / 180),
  y: 50 + 40 * Math.sin((angle * Math.PI) / 180),
});

interface DialRange {
  low: number;
  high: number;
}

type DialHandle = "value" | "low" | "high";

interface DialGesture {
  handle: DialHandle;
  coincident: number | null;
}

interface DialProps {
  value: number | null;
  range?: DialRange | null;
  emptyText?: string;
  min: number;
  max: number;
  step: number;
  current?: number;
  size: number;
  label: string;
  pending?: boolean;
  muted?: boolean;
  disabled?: boolean;
  unit?: string;
  onCommit: (value: number) => void;
  onRangeCommit?: (low: number, high: number) => void;
  children?: (value: number | null, range: DialRange | null) => ReactNode;
}

export function Dial({
  value,
  range,
  emptyText,
  min,
  max,
  step,
  current,
  size,
  label,
  pending,
  muted,
  disabled: disabledProp,
  unit = "°",
  onCommit,
  onRangeCommit,
  children,
}: DialProps) {
  const disabled = useDeviceControlDisabled(disabledProp);
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DialGesture | null>(null);
  const [local, setLocal] = useState<number | null>(null);
  const [localRange, setLocalRange] = useState<DialRange | null>(null);
  const [dragging, setDragging] = useState(false);
  const shown = disabled ? value : (local ?? value);
  const shownRange = (disabled ? range : (localRange ?? range)) ?? null;

  useEffect(() => {
    if (!disabled) return;
    dragRef.current = null;
    setDragging(false);
    setLocal(null);
    setLocalRange(null);
  }, [disabled]);

  useEffect(() => {
    if (pending || dragRef.current) return;
    setLocal(null);
    setLocalRange(null);
  }, [pending, value, range?.low, range?.high]);

  const interactive = !disabled && min < max && (shown !== null || Boolean(shownRange && onRangeCommit));
  const snap = (raw: number) => {
    const bounded = clamp(Math.round(raw * 100) / 100, min, max);
    if (bounded === min || bounded === max) return bounded;
    return clamp(Math.round((min + Math.round((bounded - min) / step) * step) * 100) / 100, min, max);
  };
  const fractionOf = (input: number) => {
    if (max <= min) return 0;
    return clamp((input - min) / (max - min), 0, 1);
  };

  const read = (event: PointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return shown ?? min;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
    let relative = (((degrees - START) % 360) + 360) % 360;
    if (relative > SWEEP) relative = relative - SWEEP < (360 - SWEEP) / 2 ? SWEEP : 0;
    return snap(min + (relative / SWEEP) * (max - min));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !interactive) return;
    const next = read(event);
    let handle: DialHandle = "value";
    if (shownRange) {
      event.preventDefault();
      handle = Math.abs(next - shownRange.low) <= Math.abs(next - shownRange.high) ? "low" : "high";
      event.currentTarget.querySelector<HTMLElement>(`[data-dial-handle="${handle}"]`)?.focus({ preventScroll: true });
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const gesture = {
      handle,
      coincident: shownRange && shownRange.low === shownRange.high ? shownRange.low : null,
    };
    dragRef.current = gesture;
    setDragging(true);
    preview(resolveHandle(gesture, next), next);
  };

  const resolveHandle = (gesture: DialGesture, next: number) => {
    if (gesture.coincident !== null && next !== gesture.coincident) {
      gesture.handle = next < gesture.coincident ? "low" : "high";
      gesture.coincident = null;
      ref.current?.querySelector<HTMLElement>(`[data-dial-handle="${gesture.handle}"]`)?.focus({ preventScroll: true });
    }
    return gesture.handle;
  };

  const rangeAt = (handle: DialHandle, next: number): DialRange | null => {
    if (!shownRange) return null;
    if (handle === "low") return { low: Math.min(next, shownRange.high), high: shownRange.high };
    return { low: shownRange.low, high: Math.max(next, shownRange.low) };
  };

  const preview = (handle: DialHandle, next: number) => {
    if (handle === "value") setLocal(next);
    else setLocalRange(rangeAt(handle, next));
  };

  const commit = (handle: DialHandle, next: number) => {
    preview(handle, next);
    if (handle === "value") {
      if (next !== value) onCommit(next);
      return;
    }
    const updated = rangeAt(handle, next);
    if (updated && (updated.low !== range?.low || updated.high !== range?.high))
      onRangeCommit?.(updated.low, updated.high);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !dragRef.current) return;
    const next = read(event);
    preview(resolveHandle(dragRef.current, next), next);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = dragRef.current;
    if (!gesture) return;
    dragRef.current = null;
    setDragging(false);
    if (!interactive) return;
    const next = read(event);
    commit(resolveHandle(gesture, next), next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, handle: DialHandle) => {
    const selected = handle === "value" ? shown : shownRange?.[handle];
    if (!interactive || selected === null || selected === undefined) return;
    const up = event.key === "ArrowUp" || event.key === "ArrowRight";
    const down = event.key === "ArrowDown" || event.key === "ArrowLeft";
    const edges: Record<string, number> = { Home: min, End: max };
    const edge = edges[event.key];
    if (!up && !down && edge === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const next = edge ?? snap(selected + (up ? step : -step));
    if (next !== selected) commit(handle, next);
  };

  const marker = current === undefined ? null : polar(START + SWEEP * fractionOf(current));
  const band = shownRange ? { from: fractionOf(shownRange.low), to: fractionOf(shownRange.high) } : null;
  const face = (
    <>
      <svg viewBox="0 0 100 100" className={classes.dialSvg} aria-hidden>
        <path d="M 21.72 78.28 A 40 40 0 1 1 78.28 78.28" className={classes.dialTrack} pathLength={100} />
        {shown === null ? null : (
          <path
            d="M 21.72 78.28 A 40 40 0 1 1 78.28 78.28"
            className={classes.dialValue}
            pathLength={100}
            strokeDasharray={`${fractionOf(shown) * 100} 200`}
          />
        )}
        {band ? (
          <path
            d="M 21.72 78.28 A 40 40 0 1 1 78.28 78.28"
            className={classes.dialValue}
            pathLength={100}
            strokeDasharray={`${(band.to - band.from) * 100} 200`}
            strokeDashoffset={-band.from * 100}
          />
        ) : null}
        {marker ? <circle cx={marker.x} cy={marker.y} r={2.2} className={classes.dialMarker} /> : null}
        {muted || shown === null ? null : <DialThumb fraction={fractionOf(shown)} radius={5.5} />}
        {muted || !band ? null : (
          <>
            <DialThumb fraction={band.from} radius={3.6} />
            <DialThumb fraction={band.to} radius={3.6} />
          </>
        )}
      </svg>
      <div className={classes.dialCenter}>{children?.(shown, shownRange)}</div>
    </>
  );

  if (shown === null && !shownRange) {
    return (
      <div
        className={classes.dial}
        style={{ width: size, height: size }}
        data-muted={muted ?? false}
        data-pending={pending ?? false}
        data-disabled
        role="img"
        aria-label={`${label}: ${emptyText ?? "no single target"}`}
        aria-busy={pending}
      >
        {face}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={classes.dial}
      style={{ width: size, height: size }}
      data-dragging={dragging}
      data-muted={muted ?? false}
      data-pending={pending ?? false}
      data-disabled={!interactive}
      data-range={Boolean(shownRange)}
      data-gesture
      role="group"
      aria-label={label}
      aria-disabled={!interactive}
      aria-busy={pending}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null;
        setDragging(false);
        setLocal(null);
        setLocalRange(null);
      }}
      onLostPointerCapture={() => {
        if (dragRef.current) {
          setLocal(null);
          setLocalRange(null);
        }
        dragRef.current = null;
        setDragging(false);
      }}
    >
      {face}
      {shown !== null && (
        <span
          className={classes.dialSingleHandle}
          role="slider"
          tabIndex={interactive ? 0 : -1}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={shown}
          aria-valuetext={`${formatDialValue(shown)}${unit}`}
          aria-disabled={!interactive}
          onKeyDown={(event) => onKeyDown(event, "value")}
        />
      )}
      {shownRange &&
        (["low", "high"] as const).map((handle) => {
          const point = polar(START + SWEEP * fractionOf(shownRange[handle]));
          let minimum = min;
          let maximum = max;
          let description = "minimum";
          if (handle === "low") maximum = shownRange.high;
          else {
            minimum = shownRange.low;
            description = "maximum";
          }
          return (
            <span
              key={handle}
              className={classes.dialRangeHandle}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              data-dial-handle={handle}
              role="slider"
              tabIndex={interactive ? 0 : -1}
              aria-label={`${label} ${description}`}
              aria-valuemin={minimum}
              aria-valuemax={maximum}
              aria-valuenow={shownRange[handle]}
              aria-valuetext={`${formatDialValue(shownRange[handle])}${unit}`}
              aria-disabled={!interactive}
              onKeyDown={(event) => onKeyDown(event, handle)}
            />
          );
        })}
    </div>
  );
}

function DialThumb({ fraction, radius }: { fraction: number; radius: number }) {
  const point = polar(START + SWEEP * fraction);
  return <circle cx={point.x} cy={point.y} r={radius} className={classes.dialThumb} />;
}

interface RoundButtonProps {
  label: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  active?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export function RoundButton({ label, size = "md", active, pending, disabled, onClick, children }: RoundButtonProps) {
  const controlDisabled = useDeviceControlDisabled(disabled);
  return (
    <UnstyledButton
      type="button"
      className={classes.round}
      data-size={size}
      data-active={active ?? false}
      data-pending={pending ?? false}
      aria-label={label}
      aria-pressed={active}
      aria-busy={pending}
      disabled={controlDisabled}
      onClick={onClick}
    >
      {children}
    </UnstyledButton>
  );
}

interface HoldButtonProps {
  label: string;
  hold: boolean;
  size: number;
  active?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  children: ReactNode;
}

export function HoldButton({ label, hold, size, active, pending, disabled, onConfirm, children }: HoldButtonProps) {
  const controlDisabled = useDeviceControlDisabled(disabled);
  const { holding, bind, onHoldEnd } = useHold(onConfirm, hold, controlDisabled);
  return (
    <UnstyledButton
      type="button"
      className={classes.hold}
      style={{ width: size, height: size }}
      data-active={active ?? false}
      data-holding={holding}
      data-pending={pending ?? false}
      data-gesture={hold}
      aria-label={label}
      aria-busy={pending}
      disabled={controlDisabled}
      {...bind}
    >
      <svg viewBox="0 0 100 100" className={classes.holdRing} aria-hidden>
        <circle cx="50" cy="50" r="47" className={classes.holdRingTrack} />
        <circle
          cx="50"
          cy="50"
          r="47"
          pathLength={100}
          className={classes.holdRingFill}
          data-holding={holding}
          onAnimationEnd={onHoldEnd}
        />
      </svg>
      {children}
    </UnstyledButton>
  );
}

interface KeyButtonProps {
  label: string;
  hold: boolean;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onConfirm: () => void;
  children: ReactNode;
}

export function KeyButton({ label, hold, active, disabled, compact, onConfirm, children }: KeyButtonProps) {
  const controlDisabled = useDeviceControlDisabled(disabled);
  const { holding, bind, onHoldEnd } = useHold(onConfirm, hold, controlDisabled);
  return (
    <UnstyledButton
      type="button"
      className={classes.key}
      data-active={active ?? false}
      data-compact={compact ?? false}
      data-gesture={hold}
      aria-label={label}
      aria-pressed={active}
      disabled={controlDisabled}
      {...bind}
    >
      {holding ? <span className={classes.keyHold} onAnimationEnd={onHoldEnd} /> : null}
      {children}
    </UnstyledButton>
  );
}

interface SparklineProps {
  values: (number | null)[];
  color: string;
}

export function Sparkline({ values, color }: SparklineProps) {
  const id = useId().replace(/:/g, "");
  const numeric = getHistoryValues(values);
  if (numeric.length === 0) return null;
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = max - min || 1;
  const segments = getHistorySegments(values).map((segment) =>
    segment.map(({ value, index }) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 36 - ((value - min) / range) * 30;
      return { x: x.toFixed(2), y: y.toFixed(2) };
    }),
  );
  const line = segments.map((points) => `M${points.map(({ x, y }) => `${x},${y}`).join(" L")}`).join(" ");
  const area = segments
    .map(
      (points) => `M${points.map(({ x, y }) => `${x},${y}`).join(" L")} L${points.at(-1)?.x},40 L${points[0]?.x},40 Z`,
    )
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={classes.spark} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.4" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
