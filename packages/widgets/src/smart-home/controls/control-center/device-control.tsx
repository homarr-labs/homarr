"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Menu } from "@mantine/core";
import {
  IconAlertTriangle,
  IconBattery1,
  IconCheck,
  IconChevronDown,
  IconMinus,
  IconPlayerPlay,
  IconPlus,
  IconPower,
  IconWifiOff,
} from "@tabler/icons-react";

import { getLightCapabilities, supportsSmartHomeAction } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import {
  getDeviceBattery,
  getDeviceEntityLabel,
  getKeyReading,
  getReadingControl,
  getReadingPriority,
  getReadingRank,
  hasLowBattery,
  isDeviceOffline,
} from "../device-groups";
import type { DevicePanelItem, ReadingControl } from "../device-groups";
import {
  formatEntityState,
  formatRelativeTime,
  getPrimaryAction,
  requiresConfirmation,
  stepNumber,
} from "../semantics";
import { isSensorLike } from "../technical/meta";
import { useSmartHomeEntityError } from "../store";
import type { HaAction, HaEntity } from "../types";
import { needsCode } from "./capabilities";
import { PillSlider, RoundButton } from "./controls";
import { EntityHistoryGraph } from "./history-graph";
import { getHistoryValues } from "./history";
import { DeviceDetail } from "./device-detail";
import { useDetailsEnabled, useDeviceControlDisabled, useEntityDetailOpener, useRunner } from "./hooks";
import classes from "./styles.module.css";
import { accentVars, useEntityTheme } from "./theme";

const BORDER = 1;
const DIVIDER = 1;
const CHIP_GAP = 6;
const CHIP_MARGIN = 8;
const LIST_PADDING = 8;

/**
 * Every device card has the same parts: a header, a slider row for slider devices, then the readings.
 * Compact keeps that structure and only tightens it; the CSS mirrors these sizes under `data-density`.
 */
interface DeviceDensity {
  header: number;
  sliderRow: number;
  sliderTrack: number;
  listRow: number;
  chipRow: number;
  button: "md" | "xs";
  icon: number;
}

export const densities: Record<"comfortable" | "compact", DeviceDensity> = {
  comfortable: { header: 64, sliderRow: 48, sliderTrack: 36, listRow: 34, chipRow: 28, button: "md", icon: 20 },
  compact: { header: 48, sliderRow: 32, sliderTrack: 24, listRow: 26, chipRow: 24, button: "xs", icon: 16 },
};
// The trend is a quiet band along the bottom, not a chart behind the text.
const GRAPH_MAX_HEIGHT = 56;
const MIN_LIST_WIDTH = 200;
// The vertical pill with the name and the big value beside it, as on a full slider tile.
const HERO_HEIGHT = 136;
const MIN_PARTIAL_LIST_ROWS = 3;

type ReadingsMode = "list" | "chips" | "none";

interface DeviceLayout {
  mode: ReadingsMode;
  primaryHeight: number;
  readingsHeight: number;
  lines: number;
}

const getDeviceLayout = (
  width: number,
  height: number,
  readings: number,
  primaryHeight: number,
  density: DeviceDensity = densities.comfortable,
): DeviceLayout => {
  const { listRow, chipRow } = density;
  const rows = Math.floor((height - primaryHeight - LIST_PADDING - DIVIDER) / listRow);
  if (width >= MIN_LIST_WIDTH && (rows >= readings || rows >= MIN_PARTIAL_LIST_ROWS)) {
    return { mode: "list", primaryHeight, readingsHeight: height - primaryHeight, lines: Math.min(readings, rows) };
  }
  const chipSpace = height - primaryHeight - CHIP_MARGIN;
  if (chipSpace < chipRow)
    return { mode: "none", primaryHeight: Math.min(primaryHeight, height), readingsHeight: 0, lines: 0 };
  const lines = Math.max(1, Math.floor((chipSpace + CHIP_GAP) / (chipRow + CHIP_GAP)));
  return { mode: "chips", primaryHeight, readingsHeight: lines * chipRow + (lines - 1) * CHIP_GAP, lines };
};

export interface SliderSpec {
  value: number;
  /** Fans with a few fixed speeds get one segment per speed instead of a free slider. */
  steps?: number;
  label: "brightness" | "speed" | "position";
  toAction: (value: number) => HaAction;
}

/** The one slider a device card offers for its main entity: brightness, fan speed or position. */
export const getSliderSpec = (entity: HaEntity): SliderSpec | null => {
  const { attributes } = entity;
  switch (entity.domain) {
    case "light":
      if (!getLightCapabilities(attributes).brightness) return null;
      return {
        value: entity.state === "on" ? (attributes.brightness ?? 100) : 0,
        label: "brightness",
        toAction: (value) => ({ type: "setBrightness", value }),
      };
    case "fan":
      if (!supportsSmartHomeAction(entity, { type: "setFanPercentage", value: 0 })) return null;
      return {
        value: entity.state === "on" ? (attributes.percentage ?? 0) : 0,
        steps: getFanSteps(attributes.percentageStep),
        label: "speed",
        toAction: (value) => ({ type: "setFanPercentage", value }),
      };
    case "cover":
      if (entity.deviceClass === "garage" || !supportsSmartHomeAction(entity, { type: "setPosition", value: 0 })) {
        return null;
      }
      return {
        value: attributes.position ?? 0,
        label: "position",
        toAction: (value) => ({ type: "setPosition", value }),
      };
    default:
      return null;
  }
};

const MAX_STEPS = 12;

const getFanSteps = (percentageStep: number | undefined) => {
  if (!percentageStep) return undefined;
  const steps = Math.round(100 / percentageStep);
  return steps >= 2 && steps <= MAX_STEPS ? steps : undefined;
};

interface StepSliderProps {
  steps: number;
  value: number;
  label: string;
  disabled: boolean;
  pending: boolean;
  onSelect: (percentage: number) => void;
  /** Adds an "off" segment before the speeds, for places without a separate power button. */
  onTurnOff?: () => void;
  /** Side by side (the default), or stacked with the lowest speed at the bottom, for a tall pill. */
  axis?: "horizontal" | "vertical";
}

/** One segment per fan speed; tapping a segment sets exactly that speed. */
export function StepSlider({
  steps,
  value,
  label,
  disabled,
  pending,
  onSelect,
  onTurnOff,
  axis = "horizontal",
}: StepSliderProps) {
  const t = useI18n("widget.smartHome-controls.device");
  const level = Math.round((value / 100) * steps);
  return (
    <div className={classes.deviceSteps} data-pending={pending} data-axis={axis}>
      {onTurnOff ? (
        <button
          type="button"
          aria-pressed={level === 0}
          aria-label={t("turnOff", { name: label })}
          className={`${classes.deviceStep} ${classes.deviceStepOff}`}
          data-off={level === 0}
          disabled={disabled || level === 0}
          onClick={onTurnOff}
        >
          <IconPower size="60%" stroke={2} aria-hidden />
        </button>
      ) : null}
      {Array.from({ length: steps }, (_, index) => index + 1).map((step) => (
        <button
          key={step}
          type="button"
          aria-pressed={step === level}
          aria-label={t("step", { name: label, level: step, steps })}
          className={classes.deviceStep}
          data-filled={step <= level}
          disabled={disabled}
          onClick={() => onSelect(Math.round((step / steps) * 100))}
        />
      ))}
    </div>
  );
}

function DeviceStatus({ device }: { device: DevicePanelItem }) {
  const t = useI18n("widget.smartHome-controls.device");
  const offline = isDeviceOffline(device);
  const battery = getDeviceBattery(device);
  const lowBattery = hasLowBattery(device);
  if (!offline && !lowBattery) return null;
  return (
    <div className={classes.deviceStatus}>
      {offline && (
        <span
          className={classes.deviceStatusIcon}
          title={t("offline", { time: formatRelativeTime(device.primary.lastChanged) })}
        >
          <IconWifiOff size={16} stroke={2} aria-hidden />
        </span>
      )}
      {lowBattery && (
        <span
          className={classes.deviceStatusIcon}
          title={battery === null ? t("batteryWarning") : t("batteryLow", { level: Math.round(battery) })}
        >
          <IconBattery1 size={16} stroke={2} aria-hidden />
        </span>
      )}
    </div>
  );
}

/** A one-tap action that is safe to run straight from the header. */
export const getHeaderAction = (entity: HaEntity) => {
  const action = getPrimaryAction(entity);
  if (!action || needsCode(entity, action) || requiresConfirmation(entity, action)) return null;
  return action;
};

export type SliderStyle = "pill" | "bar";

interface DeviceHeaderProps {
  device: DevicePanelItem;
  slider: SliderSpec | null;
  sliderStyle: SliderStyle;
  density: DeviceDensity;
  onOpen: (() => void) | null;
  /** Without its own padding, for use inside another card such as a custom layout card. */
  bare?: boolean;
  /** Another icon than the entity's own, drawn at the given size. */
  renderIcon?: (size: number) => ReactNode;
  /** Only the state below the button, no name (the name still labels the controls). */
  hideName?: boolean;
}

/** The same header on every device card: action button, device name, which part it controls and its state. */
export function DeviceHeader({
  device,
  slider,
  sliderStyle,
  density,
  onOpen: open,
  bare,
  renderIcon,
  hideName,
}: DeviceHeaderProps) {
  const t = useI18n("widget.smartHome-controls.device");
  const { primary } = device;
  const theme = useEntityTheme(primary);
  const { run, pending } = useRunner(primary);
  const [preview, setPreview] = useState<number | null>(null);
  const disabled = useDeviceControlDisabled(theme.unavailable || primary.readOnly === true);
  const action = getHeaderAction(primary);
  const Icon = theme.Icon;
  const icon = (size: number, stroke: number) => renderIcon?.(size) ?? <Icon size={size} stroke={stroke} />;
  const offline = isDeviceOffline(device);
  const keyReading = device.showKeyValue && !offline ? getKeyReading(device) : null;
  const state = offline ? t("offline", { time: formatRelativeTime(primary.lastChanged) }) : formatEntityState(primary);
  const subtitle = [primary.device?.entityName, state, keyReading && formatEntityState(keyReading)]
    .filter(Boolean)
    .join(" · ");
  const text = (
    <>
      {hideName ? null : (
        <span className={classes.name} title={device.name}>
          {device.name}
        </span>
      )}
      <span className={classes.state}>{subtitle}</span>
    </>
  );

  const nameBlock = open ? (
    <button
      type="button"
      className={`${classes.headText} ${classes.headButton}`}
      aria-haspopup="dialog"
      aria-label={t("showDetails", { name: device.name, state: subtitle })}
      onClick={open}
    >
      {text}
    </button>
  ) : (
    <div className={classes.headText}>{text}</div>
  );

  if (slider && !slider.steps && sliderStyle === "pill") {
    return (
      <div className={classes.deviceHero} data-bare={bare}>
        <div className={classes.bigPill}>
          <PillSlider
            axis="vertical"
            value={slider.value}
            label={`${device.name} ${t(`slider.${slider.label}`)}`}
            valueText={(value) => `${value}%`}
            pending={pending}
            disabled={disabled}
            onTap={action ? () => void run(action) : undefined}
            onPreview={setPreview}
            onCommit={(value) => void run(slider.toAction(value))}
          >
            {() => <div className={classes.bigPillIcon}>{icon(26, 1.6)}</div>}
          </PillSlider>
        </div>
        <div className={classes.deviceHeroSide}>
          <div className={classes.head}>
            {nameBlock}
            <DeviceStatus device={device} />
            {action && (
              <RoundButton
                size="sm"
                label={t("toggle", { name: device.name })}
                active={theme.active}
                pending={pending}
                disabled={disabled}
                onClick={() => void run(action)}
              >
                <IconPower size={17} stroke={2} />
              </RoundButton>
            )}
          </div>
          <div className={classes.deviceHeroValue}>
            <div className={classes.bigValue}>{`${preview ?? slider.value}%`}</div>
            <div className={classes.caption}>{t(`slider.${slider.label}`)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.deviceHeader} data-bare={bare}>
      <div className={classes.head}>
        <RoundButton
          size={density.button}
          label={action ? t("toggle", { name: device.name }) : device.name}
          active={theme.active}
          pending={pending}
          disabled={disabled || !action}
          onClick={action ? () => void run(action) : undefined}
        >
          {icon(density.icon, 1.8)}
        </RoundButton>
        {nameBlock}
        <DeviceStatus device={device} />
      </div>
      {slider?.steps && (
        <div className={classes.deviceSlider}>
          <StepSlider
            steps={slider.steps}
            value={slider.value}
            label={`${device.name} ${t(`slider.${slider.label}`)}`}
            disabled={disabled}
            pending={pending}
            onSelect={(value) => void run(slider.toAction(value))}
          />
        </div>
      )}
      {slider && !slider.steps && sliderStyle === "bar" && (
        <div className={classes.deviceSlider}>
          <PillSlider
            axis="horizontal"
            track={density.sliderTrack}
            value={slider.value}
            label={`${device.name} ${t(`slider.${slider.label}`)}`}
            valueText={(value) => `${value}%`}
            pending={pending}
            disabled={disabled}
            onCommit={(value) => void run(slider.toAction(value))}
          />
        </div>
      )}
    </div>
  );
}

function OptionMenu({ entity, disabled, children }: { entity: HaEntity; disabled: boolean; children: ReactNode }) {
  const { run } = useRunner(entity);
  return (
    <Menu position="bottom-end" withinPortal shadow="md" disabled={disabled}>
      <Menu.Target>{children}</Menu.Target>
      <Menu.Dropdown>
        {(entity.attributes.options ?? []).map((option) => (
          <Menu.Item
            key={option}
            fw={option === entity.state ? 700 : undefined}
            onClick={() => void run({ type: "selectOption", value: option })}
          >
            {option}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

function ReadingAction({ entity, control, label }: { entity: HaEntity; control: ReadingControl; label: string }) {
  const t = useI18n("widget.smartHome-controls.device");
  const theme = useEntityTheme(entity);
  const { run, pending, done } = useRunner(entity);
  const error = useSmartHomeEntityError(entity.id);
  const disabled = useDeviceControlDisabled(theme.unavailable || entity.readOnly === true);

  if (control.kind === "toggle") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={theme.active}
        aria-label={label}
        className={classes.deviceSwitch}
        data-on={theme.active}
        data-pending={pending}
        disabled={disabled}
        onClick={() => void run(control.action)}
      >
        <span className={classes.deviceSwitchKnob} />
      </button>
    );
  }
  if (control.kind === "trigger") {
    return (
      <button
        type="button"
        aria-label={t("run", { name: label })}
        className={classes.deviceRunButton}
        data-pending={pending}
        data-done={done}
        data-failed={error?.kind === "failed"}
        title={error?.kind === "failed" ? error.message : undefined}
        disabled={disabled}
        onClick={() => void run(control.action)}
      >
        {/* A run has no lasting state, so the button itself says it worked (or did not). */}
        {done ? (
          <IconCheck size={14} stroke={2.4} />
        ) : error?.kind === "failed" ? (
          <IconAlertTriangle size={14} stroke={2} />
        ) : (
          <IconPlayerPlay size={14} stroke={2} />
        )}
      </button>
    );
  }
  if (control.kind === "number") {
    const lower = stepNumber(entity, -1);
    const higher = stepNumber(entity, 1);
    return (
      <div className={classes.deviceNumber}>
        <button
          type="button"
          className={classes.deviceRunButton}
          aria-label={t("decrease", { name: label })}
          data-pending={pending}
          disabled={disabled || lower === null}
          onClick={() => lower !== null && void run({ type: "setValue", value: lower })}
        >
          <IconMinus size={14} stroke={2} />
        </button>
        <span className={classes.deviceReadingValue}>{formatEntityState(entity)}</span>
        <button
          type="button"
          className={classes.deviceRunButton}
          aria-label={t("increase", { name: label })}
          data-pending={pending}
          disabled={disabled || higher === null}
          onClick={() => higher !== null && void run({ type: "setValue", value: higher })}
        >
          <IconPlus size={14} stroke={2} />
        </button>
      </div>
    );
  }
  return (
    <OptionMenu entity={entity} disabled={disabled}>
      <button
        type="button"
        className={classes.deviceSelect}
        aria-label={`${label}: ${entity.state}`}
        disabled={disabled}
      >
        <span className={classes.deviceReadingValue}>{entity.state}</span>
        <IconChevronDown size={14} stroke={2} aria-hidden />
      </button>
    </OptionMenu>
  );
}

interface ReadingRowProps {
  entity: HaEntity;
  label?: string;
  /** Another icon than the entity's own. */
  icon?: ReactNode;
  /** Only the icon and the value; the name still labels the row. */
  hideLabel?: boolean;
}

export function ReadingRow({ entity, label: labelOverride, icon, hideLabel }: ReadingRowProps) {
  const t = useI18n("widget.smartHome-controls.device");
  const theme = useEntityTheme(entity);
  const open = useEntityDetailOpener(entity.id);
  const label = labelOverride ?? getDeviceEntityLabel(entity);
  const state = formatEntityState(entity);
  const control = getReadingControl(entity);
  const Icon = theme.Icon;
  const highlighted = theme.active && (entity.domain === "binary_sensor" || !isSensorLike(entity));
  const text = (
    <>
      {icon ?? <Icon size={15} stroke={1.8} className={classes.deviceReadingIcon} aria-hidden />}
      {/* Kept when hidden, so the value stays on the right. */}
      <span className={classes.deviceReadingName}>{hideLabel ? null : label}</span>
      {control ? null : <span className={classes.deviceReadingValue}>{state}</span>}
    </>
  );

  return (
    <div
      className={classes.deviceRow}
      style={accentVars(theme.accent, theme.onAccent)}
      title={`${label}: ${state}`}
      data-active={highlighted}
      data-unavailable={theme.unavailable}
    >
      {open ? (
        <button
          type="button"
          className={classes.deviceRowMain}
          aria-haspopup="dialog"
          aria-label={t("showDetails", { name: label, state })}
          onClick={open}
        >
          {text}
        </button>
      ) : (
        <div className={classes.deviceRowMain}>{text}</div>
      )}
      {control ? <ReadingAction entity={entity} control={control} label={label} /> : null}
    </div>
  );
}

function ChipFace({ entity, control, label }: { entity: HaEntity; control: ReadingControl | null; label?: string }) {
  const theme = useEntityTheme(entity);
  const Icon = control?.kind === "trigger" ? IconPlayerPlay : theme.Icon;
  const text = label ?? (control?.kind === "toggle" ? getDeviceEntityLabel(entity) : formatEntityState(entity));
  return (
    <>
      <Icon size={14} stroke={1.8} className={classes.deviceReadingIcon} aria-hidden />
      <span className={classes.deviceReadingValue}>{text}</span>
    </>
  );
}

export function ReadingChip({ entity, label: labelOverride }: { entity: HaEntity; label?: string }) {
  const t = useI18n("widget.smartHome-controls.device");
  const theme = useEntityTheme(entity);
  const open = useEntityDetailOpener(entity.id);
  const { run, pending } = useRunner(entity);
  const disabled = useDeviceControlDisabled(theme.unavailable || entity.readOnly === true);
  const label = labelOverride ?? getDeviceEntityLabel(entity);
  const state = formatEntityState(entity);
  const control = getReadingControl(entity);
  const highlighted = theme.active && (entity.domain === "binary_sensor" || !isSensorLike(entity));
  const common = {
    className: classes.deviceChip,
    style: accentVars(theme.accent, theme.onAccent),
    title: `${label}: ${state}`,
    "data-active": highlighted,
    "data-pending": pending,
    "data-unavailable": theme.unavailable,
  };
  const content = <ChipFace entity={entity} control={control} label={labelOverride} />;

  if (control?.kind === "select") {
    return (
      <OptionMenu entity={entity} disabled={disabled}>
        <button type="button" {...common} aria-label={`${label}: ${state}`} disabled={disabled}>
          {content}
        </button>
      </OptionMenu>
    );
  }
  if (control && control.kind !== "number" && !disabled) {
    const action = control.action;
    return (
      <button
        type="button"
        {...common}
        aria-pressed={control.kind === "toggle" ? theme.active : undefined}
        aria-label={control.kind === "toggle" ? label : t("run", { name: label })}
        onClick={() => void run(action)}
      >
        {content}
      </button>
    );
  }
  if (!open) return <div {...common}>{content}</div>;
  return (
    <button
      type="button"
      {...common}
      aria-haspopup="dialog"
      aria-label={t("showDetails", { name: label, state })}
      onClick={open}
    >
      {content}
    </button>
  );
}

interface ChipMetrics {
  available: number;
  widths: number[];
  more: number;
}

const sameMetrics = (left: ChipMetrics | null, right: ChipMetrics) =>
  left !== null &&
  left.available === right.available &&
  left.more === right.more &&
  left.widths.length === right.widths.length &&
  left.widths.every((width, index) => width === right.widths[index]);

const lineWidth = (widths: number[]) =>
  widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * CHIP_GAP;

interface PackedItem {
  entity: HaEntity;
  index: number;
  width: number;
}

/**
 * Fills the lines in rank order, letting a smaller chip use the gap a wider one left behind.
 * When anything is left out, one line keeps room for the "+N" chip.
 */
type ReadingRank = (entity: HaEntity) => number;

const packChips = (readings: readonly HaEntity[], metrics: ChipMetrics, lineCount: number, rank: ReadingRank) => {
  const order = readings
    .map((entity, index): PackedItem => ({ entity, index, width: metrics.widths[index] ?? 0 }))
    .toSorted((left, right) => rank(left.entity) - rank(right.entity));
  const lines = Array.from({ length: lineCount }, (): PackedItem[] => []);
  const fits = (line: PackedItem[], width: number) =>
    lineWidth([...line.map((item) => item.width), width]) <= metrics.available;

  for (const item of order) lines.find((line) => fits(line, item.width))?.push(item);

  let hidden = readings.length - lines.reduce((sum, line) => sum + line.length, 0);
  let moreLine = -1;
  if (hidden > 0) {
    // "+N" closes the chips: after the last used line, or on the next empty one.
    const lastUsed = Math.max(
      0,
      lines.findLastIndex((line) => line.length > 0),
    );
    moreLine = lastUsed;
    if (!fits(lines[lastUsed] ?? [], metrics.more)) {
      if (lastUsed + 1 < lines.length) moreLine = lastUsed + 1;
      else {
        const last = lines[lastUsed] ?? [];
        // Drop the lowest-ranked chip of the line until the "+N" chip fits.
        while (last.length > 0 && !fits(last, metrics.more)) {
          last.pop();
          hidden++;
        }
      }
    }
  }
  return {
    // Within a line the chips keep the device's order so they do not shuffle when a value changes.
    lines: lines.map((line) => line.toSorted((left, right) => left.index - right.index).map((item) => item.entity)),
    hidden,
    moreLine,
  };
};

function MoreChip({ count, onOpen: open }: { count: number; onOpen: (() => void) | null }) {
  const t = useI18n("widget.smartHome-controls.device");
  const label = t("more", { count });
  if (!open) return <div className={classes.deviceChip}>+{count}</div>;
  return (
    <button
      type="button"
      className={classes.deviceChip}
      aria-haspopup="dialog"
      aria-label={t("moreDetails", { count })}
      title={label}
      onClick={open}
    >
      +{count}
    </button>
  );
}

/** Changes whenever a web font finishes loading, so text measured with a fallback font is measured again. */
const useFontsVersion = () => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    const bump = () => setVersion((current) => current + 1);
    void document.fonts.ready.then(bump);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
  return version;
};

interface ReadingChipsProps {
  readings: readonly HaEntity[];
  rank: ReadingRank;
  lineCount: number;
  width: number;
  height: number;
  onOpenDevice: (() => void) | null;
}

function ReadingChips({ readings, rank, lineCount, width, height, onOpenDevice }: ReadingChipsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<ChipMetrics | null>(null);
  const fontsVersion = useFontsVersion();

  // Chip widths follow live values and the card width; unchanged results do not re-render.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;
    const chips = [...measure.children].map((chip) => Math.ceil(chip.getBoundingClientRect().width));
    const next = {
      available: Math.floor(container.getBoundingClientRect().width),
      widths: chips.slice(0, -1),
      more: chips.at(-1) ?? 0,
    };
    setMetrics((current) => (sameMetrics(current, next) ? current : next));
  }, [readings, width, fontsVersion]);

  const packed = metrics ? packChips(readings, metrics, lineCount, rank) : null;

  return (
    <div ref={containerRef} className={classes.deviceChips} style={{ height }}>
      <div ref={measureRef} className={classes.deviceChipMeasure} aria-hidden>
        {readings.map((entity) => (
          <span key={entity.id} className={classes.deviceChip}>
            <ChipFace entity={entity} control={getReadingControl(entity)} />
          </span>
        ))}
        <span className={classes.deviceChip}>+{readings.length}</span>
      </div>
      {packed?.lines.map((line, index) => (
        <div key={index} className={classes.deviceChipLine}>
          {line.map((entity) => (
            <ReadingChip key={entity.id} entity={entity} />
          ))}
          {packed.moreLine === index && <MoreChip count={packed.hidden} onOpen={onOpenDevice} />}
        </div>
      ))}
    </div>
  );
}

/** Keeps the highest-ranked readings, shown in the device's own order. */
const pickReadings = (readings: readonly HaEntity[], count: number, rank: ReadingRank) => {
  const kept = new Set(readings.toSorted((left, right) => rank(left) - rank(right)).slice(0, count));
  return readings.filter((reading) => kept.has(reading));
};

interface ReadingListProps {
  readings: readonly HaEntity[];
  rank: ReadingRank;
  rows: number;
  height: number;
  onOpenDevice: (() => void) | null;
}

function ReadingList({ readings, rank, rows, height, onOpenDevice: open }: ReadingListProps) {
  const t = useI18n("widget.smartHome-controls.device");
  const overflowing = readings.length > rows;
  const shown = overflowing ? pickReadings(readings, rows - 1, rank) : readings;
  const hidden = readings.length - shown.length;
  const more = t("more", { count: hidden });

  return (
    <div className={classes.deviceList} style={{ height }}>
      {shown.map((reading) => (
        <ReadingRow key={reading.id} entity={reading} />
      ))}
      {overflowing && (
        <div className={classes.deviceRow}>
          {open ? (
            <button
              type="button"
              className={`${classes.deviceRowMain} ${classes.deviceMoreRow}`}
              aria-haspopup="dialog"
              aria-label={t("moreDetails", { count: hidden })}
              onClick={open}
            >
              +{more}
            </button>
          ) : (
            <div className={`${classes.deviceRowMain} ${classes.deviceMoreRow}`}>+{more}</div>
          )}
        </div>
      )}
    </div>
  );
}

interface DeviceControlProps {
  device: DevicePanelItem;
  width: number;
  height: number;
  /** Same card, tighter spacing: smaller header, slider, rows and chips. */
  compact?: boolean;
}

/** One card per device: the main entity's control with the device's other entities as readings underneath. */
const DIAGNOSTIC_PRIORITY = 7;

const hasTrend = (history: HaEntity["history"]) => {
  const values = getHistoryValues(history ?? []);
  return values.length > 1 && Math.max(...values) > Math.min(...values);
};

/** The highest-ranked measurement whose last 24 hours actually moved; diagnostics never get the graph. */
const pickGraphReading = (readings: readonly HaEntity[], rank: ReadingRank) =>
  readings
    .filter(
      (reading) =>
        reading.domain === "sensor" && getReadingPriority(reading) < DIAGNOSTIC_PRIORITY && hasTrend(reading.history),
    )
    .toSorted((left, right) => rank(left) - rank(right))
    .at(0) ?? null;

function ReadingsGraph({ entity, height }: { entity: HaEntity; height: number }) {
  const theme = useEntityTheme(entity);
  return (
    <div className={classes.deviceGraph} style={{ height }} aria-hidden>
      {/* A faint backdrop behind the card's controls: its details have the graph to scrub. */}
      <EntityHistoryGraph entity={entity} color={theme.accent} scrub={false} />
    </div>
  );
}

export function DeviceControl({ device, width, height, compact = false }: DeviceControlProps) {
  const theme = useEntityTheme(device.primary);
  const error = useSmartHomeEntityError(device.primary.id);
  const rank = useCallback((entity: HaEntity) => getReadingRank(device, entity), [device]);
  const graphReading = useMemo(
    () => (device.showGraph ? pickGraphReading(device.readings, rank) : null),
    [device.showGraph, device.readings, rank],
  );
  const density = compact ? densities.compact : densities.comfortable;
  const slider = getSliderSpec(device.primary);
  const innerWidth = width - BORDER * 2;
  const innerHeight = height - BORDER * 2;
  // The big pill with its value is the nicer slider; it only gives way when the readings would not fit.
  const readingsFloor =
    Math.min(device.readings.length, MIN_PARTIAL_LIST_ROWS) * density.listRow +
    (device.readings.length > 0 ? LIST_PADDING + DIVIDER : 0);
  const sliderStyle: SliderStyle =
    !compact && !slider?.steps && innerWidth >= MIN_LIST_WIDTH && innerHeight - HERO_HEIGHT >= readingsFloor
      ? "pill"
      : "bar";
  const headerHeight =
    slider && sliderStyle === "pill" ? HERO_HEIGHT : density.header + (slider ? density.sliderRow : 0);
  const detailsEnabled = useDetailsEnabled();
  const [detailOpen, setDetailOpen] = useState(false);
  const openDevice = detailsEnabled ? () => setDetailOpen(true) : null;
  const { mode, primaryHeight, readingsHeight, lines } = getDeviceLayout(
    innerWidth,
    innerHeight,
    device.readings.length,
    headerHeight,
    density,
  );

  return (
    <div
      className={classes.device}
      style={accentVars(theme.accent, theme.onAccent)}
      data-density={compact ? "compact" : undefined}
      title={error?.message}
      data-error={error?.kind}
      data-active={theme.tinted}
      data-unavailable={theme.unavailable}
    >
      <div className={classes.devicePrimary} style={{ height: primaryHeight }}>
        <DeviceHeader
          device={device}
          slider={primaryHeight >= headerHeight ? slider : null}
          sliderStyle={sliderStyle}
          density={density}
          onOpen={openDevice}
        />
      </div>
      {graphReading && mode !== "none" && (
        <ReadingsGraph
          entity={graphReading}
          height={Math.min(GRAPH_MAX_HEIGHT, mode === "chips" ? readingsHeight + CHIP_MARGIN : readingsHeight)}
        />
      )}
      {mode === "list" && (
        <ReadingList
          readings={device.readings}
          rank={rank}
          rows={lines}
          height={readingsHeight}
          onOpenDevice={openDevice}
        />
      )}
      {mode === "chips" && (
        <ReadingChips
          readings={device.readings}
          rank={rank}
          lineCount={lines}
          width={innerWidth}
          height={readingsHeight}
          onOpenDevice={openDevice}
        />
      )}
      <DeviceDetail device={device} opened={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  );
}
