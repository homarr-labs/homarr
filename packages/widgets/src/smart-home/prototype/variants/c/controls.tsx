"use client";

import { Loader, Slider, Switch } from "@mantine/core";
import { getClimateTemperatureMode } from "@homarr/integrations/types";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconHome2,
  IconMinus,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlayerStop,
  IconPlus,
  IconX,
} from "@tabler/icons-react";

import { formatNumber, getStateColor, isUnavailable } from "../../semantics";
import type { HaAction, HaEntity } from "../../types";
import { needsCode, useEntityDetailOpener } from "../e/details";
import classes from "./styles.module.css";
import { capitalize } from "./meta";
import type { Level } from "./layout";
import type { EntityRun } from "./use-run";
import { useActionsLocked, useDraft } from "./use-run";

interface ControlProps {
  entity: HaEntity;
  run: EntityRun;
  level: Level;
}

interface SliderProps {
  label: string;
  value: number;
  width?: number | string;
  color: string;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

export function InlineSlider({
  label,
  value,
  width = 96,
  color,
  onCommit,
  min = 0,
  max = 100,
  unit = "%",
}: SliderProps) {
  const draft = useDraft(value);
  const locked = useActionsLocked();
  return (
    <Slider
      thumbLabel={label}
      thumbValueText={(current) => `${current}${unit}`}
      data-gesture="true"
      disabled={locked}
      className={classes.slider}
      style={{ width, flex: typeof width === "string" ? "1 1 auto" : "none" }}
      vars={() => ({ root: { "--slider-size": "4px", "--slider-thumb-size": "14px", "--slider-radius": "999px" } })}
      styles={{ trackContainer: { height: "100%" }, thumb: { borderWidth: 3 } }}
      color={color}
      min={min}
      max={max}
      label={null}
      value={draft.value}
      onChange={draft.drag}
      onChangeEnd={(next) => {
        draft.settle(next);
        onCommit(next);
      }}
    />
  );
}

interface SegmentOption {
  value: string;
  label: string;
  hint?: string | null;
  disabled?: boolean;
}

export const getCodeControlProps = (
  entity: HaEntity,
  action: HaAction,
  canOpenDetails: boolean,
): Pick<SegmentOption, "hint" | "disabled"> => {
  if (!needsCode(entity, action)) return {};
  if (canOpenDetails) return { hint: "Enter code in details" };
  return { hint: "Code required · use Home Assistant", disabled: true };
};

interface SegmentedProps {
  label: string;
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  color: string;
  fill?: boolean;
}

export function Segmented({ label, options, value, onChange, color, fill = false }: SegmentedProps) {
  const locked = useActionsLocked();
  return (
    <div
      role="group"
      aria-label={label}
      className={classes.segmented}
      data-fill={fill || undefined}
      style={
        {
          "--seg": `var(--mantine-color-${color}-filled)`,
          "--seg-text": ["orange", "yellow", "green", "cyan"].includes(color) ? "#000" : "light-dark(#000, #fff)",
        } as React.CSSProperties
      }
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          aria-label={[option.label, option.hint].filter(Boolean).join(": ")}
          title={option.hint ?? undefined}
          disabled={locked || option.disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface StepperProps {
  entity: HaEntity;
  run: EntityRun;
  large?: boolean;
}

export function Stepper({ entity, run, large = false }: StepperProps) {
  const mode = getClimateTemperatureMode(entity);
  const attributes = entity.attributes;
  if (
    mode === "range" &&
    attributes.targetTemperatureLow !== undefined &&
    attributes.targetTemperatureHigh !== undefined
  ) {
    return (
      <div className={classes.cluster}>
        <TemperatureStepper
          entity={entity}
          run={run}
          large={large}
          target={attributes.targetTemperatureLow}
          bound="low"
        />
        <TemperatureStepper
          entity={entity}
          run={run}
          large={large}
          target={attributes.targetTemperatureHigh}
          bound="high"
        />
      </div>
    );
  }
  if (mode === "single" && attributes.targetTemperature !== undefined) {
    return <TemperatureStepper entity={entity} run={run} large={large} target={attributes.targetTemperature} />;
  }
  return <span className={classes.pill}>No adjustable target</span>;
}

function TemperatureStepper({
  entity,
  run,
  large,
  target,
  bound,
}: StepperProps & { target: number; bound?: "low" | "high" }) {
  const attributes = entity.attributes;
  const step = attributes.temperatureStep ?? 0.5;
  let min = attributes.minTemperature ?? target;
  let max = attributes.maxTemperature ?? target;
  if (bound === "low") max = Math.min(max, attributes.targetTemperatureHigh ?? target);
  if (bound === "high") min = Math.max(min, attributes.targetTemperatureLow ?? target);
  const draft = useDraft(target);
  const disabled = run.locked || run.pending;
  let label = "Target temperature";
  if (bound === "low") label = "Minimum target temperature";
  if (bound === "high") label = "Maximum target temperature";

  const change = (delta: number) => {
    if (disabled) return;
    const next = Math.min(max, Math.max(min, Math.round((draft.value + delta) / step) * step));
    if (next === draft.value) return;
    draft.settle(next);
    if (bound === "low" && attributes.targetTemperatureHigh !== undefined) {
      run.request({ type: "setTemperatureRange", low: next, high: attributes.targetTemperatureHigh });
    } else if (bound === "high" && attributes.targetTemperatureLow !== undefined) {
      run.request({ type: "setTemperatureRange", low: attributes.targetTemperatureLow, high: next });
    } else {
      run.request({ type: "setTemperature", value: next });
    }
  };

  return (
    <div className={classes.stepper} data-large={large || undefined}>
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        onClick={() => change(-step)}
        disabled={disabled || draft.value <= min}
      >
        <IconMinus size={13} stroke={2.4} />
      </button>
      <output aria-label={label}>
        {bound === "low" && "Low "}
        {bound === "high" && "High "}
        {formatNumber(draft.value)}°
      </output>
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        onClick={() => change(step)}
        disabled={disabled || draft.value >= max}
      >
        <IconPlus size={13} stroke={2.4} />
      </button>
    </div>
  );
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  strong?: boolean;
}

export function IconButton({ label, onClick, children, disabled, strong }: IconButtonProps) {
  const locked = useActionsLocked();
  return (
    <button
      type="button"
      className={classes.iconButton}
      data-strong={strong || undefined}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled || locked}
    >
      {children}
    </button>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  run: EntityRun;
  icon?: React.ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
  allowWhilePending?: boolean;
  hint?: string | null;
}

export function ActionButton({
  label,
  onClick,
  run,
  icon,
  tone = "default",
  disabled,
  allowWhilePending = false,
  hint,
}: ActionButtonProps) {
  let content = icon;
  if (run.pending) content = <Loader color="currentColor" vars={() => ({ root: { "--loader-size": "12px" } })} />;
  if (run.flash && !run.pending) content = <IconCheck size={13} stroke={2.6} />;
  return (
    <button
      type="button"
      className={classes.actionButton}
      data-tone={tone}
      data-done={(run.flash && !run.pending) || undefined}
      onClick={onClick}
      disabled={disabled || (run.pending && !allowWhilePending) || run.locked}
      aria-label={[label, hint].filter(Boolean).join(": ")}
      title={hint ?? undefined}
    >
      {content}
      <span>{run.flash && !run.pending ? "Done" : label}</span>
    </button>
  );
}

const confirmLabels: Partial<Record<HaAction["type"], string>> = {
  unlock: "Unlock",
  alarmDisarm: "Disarm",
  open: "Open",
  close: "Close",
  toggle: "Confirm",
  setPosition: "Confirm",
};

export function ConfirmInline({ run, level }: { run: EntityRun; level: Level }) {
  const label = run.confirm ? (confirmLabels[run.confirm.type] ?? "Confirm") : "Confirm";
  return (
    <div className={classes.confirm} role="alertdialog" aria-label={`${label}?`}>
      {level > 0 && <span>{label}?</span>}
      <button type="button" data-yes onClick={run.accept} disabled={run.locked} aria-label={`Confirm ${label}`}>
        <IconCheck size={13} stroke={2.6} />
        {level === 0 && <span>Yes</span>}
      </button>
      <button type="button" onClick={run.cancel} aria-label="Cancel">
        <IconX size={13} stroke={2.4} />
      </button>
    </div>
  );
}

const alarmOptions: SegmentOption[] = [
  { value: "disarmed", label: "Off" },
  { value: "armed_home", label: "Home" },
  { value: "armed_away", label: "Away" },
  { value: "armed_night", label: "Night" },
];

export const alarmActionFor = (value: string): HaAction => {
  if (value === "armed_home") return { type: "alarmArm", mode: "home" };
  if (value === "armed_away") return { type: "alarmArm", mode: "away" };
  if (value === "armed_night") return { type: "alarmArm", mode: "night" };
  return { type: "alarmDisarm" };
};

export function AlarmControl({ entity, run, level, fill }: ControlProps & { fill?: boolean }) {
  const color = getStateColor(entity);
  const openDetails = useEntityDetailOpener(entity.id);
  const options = alarmOptions.map((option) => ({
    ...option,
    ...getCodeControlProps(entity, alarmActionFor(option.value), openDetails !== null),
  }));
  const hint = options.find((option) => option.hint)?.hint;
  if (level === 0 && !fill) {
    return (
      <select
        className={classes.select}
        aria-label={["Alarm mode", hint].filter(Boolean).join(": ")}
        title={hint ?? undefined}
        value={entity.state}
        disabled={run.locked}
        onChange={(event) => run.request(alarmActionFor(event.target.value))}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Segmented
      label="Alarm mode"
      options={options}
      value={entity.state}
      onChange={(value) => run.request(alarmActionFor(value))}
      color={color === "gray" ? "gray" : color}
      fill={fill}
    />
  );
}

export function SelectControl({ entity, run }: Pick<ControlProps, "entity" | "run">) {
  return (
    <select
      className={classes.select}
      aria-label={entity.name}
      value={entity.state}
      disabled={run.locked}
      onChange={(event) => run.request({ type: "selectOption", value: event.target.value })}
    >
      {(entity.attributes.options ?? []).map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function HvacModes({ entity, run, fill }: Pick<ControlProps, "entity" | "run"> & { fill?: boolean }) {
  const modes = entity.attributes.hvacModes ?? [];
  if (modes.length === 0) return null;
  return (
    <Segmented
      label="HVAC mode"
      options={modes.map((mode) => ({ value: mode, label: capitalize(mode === "heat_cool" ? "Auto" : mode) }))}
      value={entity.state}
      onChange={(value) => run.request({ type: "setHvacMode", value })}
      color={getStateColor(entity) === "gray" ? "blue" : getStateColor(entity)}
      fill={fill}
    />
  );
}

export function EntityToggle({ entity, run }: Pick<ControlProps, "entity" | "run">) {
  const color = getStateColor(entity);
  const checked =
    entity.state === "on" || entity.state === "open" || (entity.domain === "climate" && entity.state !== "off");
  return (
    <Switch
      size="sm"
      color={color === "gray" ? "gray" : color}
      aria-label={`Toggle ${entity.name}`}
      checked={checked}
      disabled={run.locked}
      onChange={() => run.request({ type: "toggle" })}
      vars={() => ({
        root: {
          "--switch-width": "40px",
          "--switch-height": "22px",
          "--switch-thumb-size": "16px",
          "--switch-radius": "999px",
          "--switch-label-font-size": "6px",
          "--switch-track-label-padding": "3px",
        },
      })}
      styles={{
        root: { width: "44px", flex: "0 0 44px" },
        body: { width: "100%", height: "100%", position: "relative", alignItems: "center", justifyContent: "center" },
      }}
      classNames={{ root: classes.switchRoot, track: classes.switchTrack }}
    />
  );
}

export function MediaTransport({ entity, run, level }: ControlProps) {
  const playing = entity.state === "playing";
  return (
    <div className={classes.cluster}>
      {level > 0 && (
        <IconButton label="Previous" disabled={run.pending} onClick={() => run.request({ type: "mediaPrevious" })}>
          <IconPlayerSkipBack size={14} />
        </IconButton>
      )}
      <IconButton
        label={playing ? "Pause" : "Play"}
        strong
        disabled={run.pending}
        onClick={() => run.request({ type: "mediaPlayPause" })}
      >
        {playing ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
      </IconButton>
      {level > 0 && (
        <IconButton label="Next" disabled={run.pending} onClick={() => run.request({ type: "mediaNext" })}>
          <IconPlayerSkipForward size={14} />
        </IconButton>
      )}
    </div>
  );
}

export function CoverButtons({ entity, run, full }: Pick<ControlProps, "entity" | "run"> & { full?: boolean }) {
  const closed = entity.state === "closed";
  if (!full) {
    return (
      <IconButton
        label={closed ? "Open" : "Close"}
        onClick={() => run.request(closed ? { type: "open" } : { type: "close" })}
      >
        {closed ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
      </IconButton>
    );
  }
  return (
    <div className={classes.cluster}>
      <IconButton label="Open" onClick={() => run.request({ type: "open" })}>
        <IconChevronUp size={15} />
      </IconButton>
      <IconButton label="Stop" onClick={() => run.request({ type: "stop" })}>
        <IconPlayerStop size={13} />
      </IconButton>
      <IconButton label="Close" onClick={() => run.request({ type: "close" })}>
        <IconChevronDown size={15} />
      </IconButton>
    </div>
  );
}

export function UnavailablePill() {
  return <span className={classes.pill}>Unavailable</span>;
}

export function HomeGlyph() {
  return <IconHome2 size={14} />;
}

export const isInert = (entity: HaEntity) => isUnavailable(entity);
