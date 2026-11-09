"use client";

import { useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Box, Modal } from "@mantine/core";
import {
  IconAirConditioning,
  IconAlertTriangle,
  IconArrowBackUp,
  IconBattery1,
  IconBuildingEstate,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCloud,
  IconCloudFog,
  IconCloudRain,
  IconCloudSnow,
  IconCloudStorm,
  IconDroplet,
  IconFlame,
  IconHome,
  IconLock,
  IconLockOpen,
  IconLockPassword,
  IconMinus,
  IconMoon,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlayerStop,
  IconPlus,
  IconPower,
  IconRefresh,
  IconShieldCheck,
  IconShieldOff,
  IconSnowflake,
  IconSun,
  IconVolume,
  IconVolumeOff,
  IconWind,
} from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { getClimateTemperatureMode, getLightCapabilities } from "@homarr/integrations/types";

import {
  formatEntityState,
  formatNumber,
  formatRelativeTime,
  getForecastMessage,
  getPrimaryAction,
  requiresConfirmation,
} from "../semantics";
import { useSmartHomeEntity, useSmartHomeInteractionBlock } from "../store";
import type { HaAction, HaDomain, HaEntity } from "../types";
import { Dial, HoldButton, KeyButton, PillSlider, RoundButton, Sparkline } from "./controls";
import {
  entityNeedsCode,
  gateNotice,
  getClimateReadout,
  getTargetRange,
  isGateBlocked,
  runCodeGate,
} from "./capabilities";
import type { CodeGate } from "./capabilities";
import { CodePrompt } from "./code-prompt";
import { LightColorPresets } from "./color-controls";
import { DetailMeta, DetailPanel } from "./detail-panel";
import { DetailTrigger } from "./detail-trigger";
import { getHistoryValues } from "./history";
import {
  clamp,
  DetailContext,
  DetailProvider,
  getTier,
  Measured,
  TileEntityContext,
  useCodeGate,
  useDeviceControlDisabled,
  useRunner,
} from "./hooks";
import classes from "./styles.module.css";
import { Head, Tile, useEntityTheme } from "./theme";
import type { EntityTheme } from "./theme";

export interface ControlProps {
  entity: HaEntity;
  width: number;
  height: number;
}

const conditionIcons: Record<string, TablerIcon> = {
  sunny: IconSun,
  "clear-night": IconMoon,
  partlycloudy: IconCloud,
  cloudy: IconCloud,
  rainy: IconCloudRain,
  pouring: IconCloudRain,
  snowy: IconCloudSnow,
  fog: IconCloudFog,
  lightning: IconCloudStorm,
  windy: IconWind,
};

const hvacIcons: Record<string, TablerIcon> = {
  off: IconPower,
  heat: IconFlame,
  cool: IconSnowflake,
  auto: IconRefresh,
  heat_cool: IconSun,
  dry: IconDroplet,
  fan_only: IconWind,
};

const formatClock = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${rest}`;
  return `${minutes}:${rest}`;
};

interface SliderSpec {
  value: number | null;
  min?: number;
  max?: number;
  tapToToggle?: boolean;
  caption: string;
  zeroLabel: string;
  toAction: (value: number) => HaAction;
  tapAction: HaAction | null;
}

interface SliderControlProps extends ControlProps {
  spec: SliderSpec;
  theme: EntityTheme;
  extras?: (sideWidth: number, bodyHeight: number) => ReactNode;
}

const TILE_PADDING = 12;
const PILL_GAP = 14;
const HIT = 44;
const SLIDER_TRACK = 36;
const VOLUME_TRACK = 30;
const ROUND_SM = 40;
const BUTTON_GAP = 8;
const HEAD_HEIGHT = 48;
const WIDE_SLIDER_MIN_HEIGHT = TILE_PADDING * 2 + HEAD_HEIGHT + BUTTON_GAP + HIT;
const CLIMATE_FULL_MIN_HEIGHT = 168;
const CLIMATE_MODES_MIN_HEIGHT = 216;
const WIDE_STEPPER_MIN_HEIGHT = 128;
const WIDE_KEYPAD_MIN_HEIGHT = 112;
const WIDE_CHIPS_MIN_HEIGHT = 108;
const ROOMY_FULL_HEIGHT = 190;

const rowWidth = (count: number, size: number, gap: number) => count * size + Math.max(0, count - 1) * gap;

const sideWidthOf = (width: number) => {
  const inner = width - TILE_PADDING * 2;
  return inner - clamp(inner * 0.4, 64, 112) - PILL_GAP;
};

function SliderControl({ entity, width, height, spec, theme, extras }: SliderControlProps) {
  const { run, pending } = useRunner(entity);
  const [preview, setPreview] = useState<number | null>(null);
  const tier = getTier(width, height);
  const Icon = theme.Icon;
  const min = spec.min ?? 0;
  const max = spec.max ?? 100;
  const text = (shown: number) => {
    if (spec.value === null) return "—";
    if (shown === 0) return spec.zeroLabel;
    return `${shown}%`;
  };
  const tapAction = spec.tapAction;
  const tap = tapAction ? () => void run(tapAction) : undefined;
  const commit = (value: number) => void run(spec.toAction(value));
  const shownValue = preview ?? spec.value ?? min;
  const valueText = text(shownValue);
  const slider = {
    value: spec.value ?? min,
    min,
    max,
    label: `${entity.name} ${spec.caption.toLowerCase()}`,
    valueText: text,
    pending,
    disabled: theme.unavailable || spec.value === null || min >= max,
    onCommit: commit,
  };
  const toggle = (size: "sm" | "md") => (
    <RoundButton
      size={size}
      label={`Toggle ${entity.name}`}
      active={theme.active}
      pending={pending}
      onClick={tap}
      disabled={theme.unavailable || !tap}
    >
      <Icon size={18} stroke={1.8} />
    </RoundButton>
  );

  if (tier === "mini") {
    return (
      <Tile theme={theme} bare>
        <PillSlider
          {...slider}
          axis="vertical"
          onTap={spec.tapToToggle === false ? undefined : tap}
          className={classes.fillSlider}
          renderFooter={(shown) => (
            <span className={classes.miniText}>
              <span className={classes.name} title={entity.name}>
                {entity.name}
              </span>
              <span className={classes.state}>{text(shown)}</span>
            </span>
          )}
        >
          {() => (
            <div className={classes.miniOverlay}>
              <span className={classes.miniIcon} data-pending={pending}>
                <Icon size={18} stroke={1.8} />
              </span>
            </div>
          )}
        </PillSlider>
      </Tile>
    );
  }

  if (tier === "wide" && height < WIDE_SLIDER_MIN_HEIGHT) {
    return (
      <Tile theme={theme} className={classes.rowTile}>
        <Head name={entity.name} state={text(spec.value ?? min)} leading={toggle("md")} />
        <span
          className={classes.levelLine}
          style={{ width: `${spec.value === null || min >= max ? 0 : ((spec.value - min) / (max - min)) * 100}%` }}
          aria-hidden
        />
      </Tile>
    );
  }

  if (tier === "wide") {
    return (
      <Tile theme={theme}>
        <Head name={entity.name} state={text(shownValue)} leading={toggle("sm")} />
        <div className={classes.hSlider}>
          <PillSlider {...slider} axis="horizontal" track={SLIDER_TRACK} onPreview={setPreview} />
        </div>
      </Tile>
    );
  }

  return (
    <Tile theme={theme}>
      <Head
        name={entity.name}
        state={formatEntityState(entity)}
        trailing={
          <RoundButton
            size="sm"
            label={`Toggle ${entity.name}`}
            active={theme.active}
            pending={pending}
            onClick={tap}
            disabled={theme.unavailable || !tap}
          >
            <IconPower size={17} stroke={2} />
          </RoundButton>
        }
      />
      <div className={classes.fullBody}>
        <div className={classes.bigPill}>
          <PillSlider {...slider} axis="vertical" onPreview={setPreview}>
            {() => (
              <div className={classes.bigPillIcon}>
                <Icon size={26} stroke={1.6} />
              </div>
            )}
          </PillSlider>
        </div>
        <div className={classes.side}>
          <div className={classes.bigValue} style={{ fontSize: `clamp(16px, ${132 / valueText.length}cqi, 34px)` }}>
            {valueText}
          </div>
          <div className={classes.caption}>{spec.caption}</div>
          {extras?.(sideWidthOf(width), height - TILE_PADDING * 2 - HEAD_HEIGHT - 10)}
        </div>
      </div>
    </Tile>
  );
}

function LightControl(props: ControlProps) {
  const { entity } = props;
  const theme = useEntityTheme(entity);
  const attributes = entity.attributes;
  const on = entity.state === "on";
  const spec: SliderSpec = {
    value: on ? (attributes.brightness ?? 100) : 0,
    caption: "Brightness",
    zeroLabel: "Off",
    toAction: (value) => ({ type: "setBrightness", value }),
    tapAction: { type: "toggle" },
  };
  const extras = (sideWidth: number, bodyHeight: number) => {
    if (bodyHeight < 100 || sideWidth < 120) return null;
    return <LightColorPresets entity={entity} compact />;
  };
  return <SliderControl {...props} theme={theme} spec={spec} extras={extras} />;
}

function FanControl(props: ControlProps) {
  const { entity } = props;
  const theme = useEntityTheme(entity);
  const spec: SliderSpec = {
    value: entity.state === "on" ? (entity.attributes.percentage ?? 0) : 0,
    caption: "Speed",
    zeroLabel: "Off",
    toAction: (value) => ({ type: "setFanPercentage", value }),
    tapAction: { type: "toggle" },
  };
  return <SliderControl {...props} theme={theme} spec={spec} />;
}

function HumidifierControl(props: ControlProps) {
  const { entity } = props;
  const theme = useEntityTheme(entity);
  const min = entity.attributes.minHumidity ?? 0;
  const max = entity.attributes.maxHumidity ?? 100;
  const target = entity.attributes.targetHumidity;
  let targetValue: number | null = null;
  if (target !== undefined && target >= min && target <= max) targetValue = target;
  const spec: SliderSpec = {
    value: targetValue,
    min,
    max,
    tapToToggle: false,
    caption: "Target humidity",
    zeroLabel: "0%",
    toAction: (value) => ({ type: "setHumidity", value }),
    tapAction: { type: "toggle" },
  };
  return <SliderControl {...props} theme={theme} spec={spec} />;
}

interface HoldControlProps extends ControlProps {
  action: HaAction;
  actionLabel: string;
  icon: TablerIcon;
  hint: string;
}

const withCodeNotice = (state: string, coded: boolean) => [state, coded && "code required"].filter(Boolean).join(" · ");

const holdHint = (gate: CodeGate, hold: boolean, hint: string, actionLabel: string) => {
  const verb = actionLabel.toLowerCase();
  const notice = gateNotice(gate, verb);
  if (notice) return notice;
  if (hold) return hint;
  return `Tap to ${verb}`;
};

const holdLabel = (gate: CodeGate, hold: boolean, actionLabel: string, name: string) => {
  const notice = gateNotice(gate, actionLabel.toLowerCase());
  if (notice) return `${actionLabel} ${name}: ${notice}`;
  if (hold) return `Hold to ${actionLabel} ${name}`;
  return `${actionLabel} ${name}`;
};

function HoldControl({ entity, width, height, action, actionLabel, icon: Icon, hint }: HoldControlProps) {
  const theme = useEntityTheme(entity);
  const { run, pending, done } = useRunner(entity);
  const tier = getTier(width, height);
  const hold = requiresConfirmation(entity, action);
  const battery = entity.attributes.batteryLevel;
  const lowBattery = battery !== undefined && battery < 20;
  const gate = useCodeGate(entity)(action);
  const coded = gate.kind !== "run";
  const state = withCodeNotice(formatEntityState(entity), coded && gate.kind !== "awaitingCode");
  const hintText = holdHint(gate, hold, hint, actionLabel);
  const GlyphIcon = coded ? IconLockPassword : Icon;
  const button = (size: number) => (
    <HoldButton
      label={holdLabel(gate, hold, actionLabel, entity.name)}
      hold={hold && !coded}
      size={size}
      active={theme.active}
      pending={pending}
      disabled={theme.unavailable || isGateBlocked(gate)}
      onConfirm={() => runCodeGate(gate, run)}
    >
      {done ? <IconCheck size={22} stroke={2.4} /> : <GlyphIcon size={22} stroke={1.7} />}
    </HoldButton>
  );

  if (tier === "mini") {
    return (
      <Tile theme={theme} className={`${classes.center} ${height < 96 ? classes.shortHold : ""}`}>
        {button(HIT)}
        <span className={classes.name} title={entity.name}>
          {entity.name}
        </span>
        {height >= 120 ? <span className={classes.state}>{state}</span> : null}
      </Tile>
    );
  }

  if (tier === "wide") {
    return (
      <Tile theme={theme} className={classes.rowTile}>
        {button(HIT)}
        <div className={classes.headText}>
          <span className={classes.name} title={entity.name}>
            {entity.name}
          </span>
          <span className={classes.state}>{state}</span>
          {lowBattery ? <BatteryChip level={battery} /> : null}
        </div>
        {theme.unavailable || width < 280 ? null : <span className={classes.hint}>{hintText}</span>}
      </Tile>
    );
  }

  return (
    <Tile theme={theme}>
      <Head name={entity.name} state={state} trailing={lowBattery ? <BatteryChip level={battery} /> : null} />
      <div className={classes.holdStage}>{button(HIT)}</div>
      <div className={classes.hintCenter}>{theme.unavailable ? "Unavailable" : hintText}</div>
    </Tile>
  );
}

function BatteryChip({ level }: { level: number }) {
  return (
    <span className={classes.batteryChip}>
      <IconBattery1 size={13} stroke={2} />
      {level}%
    </span>
  );
}

function LockControl(props: ControlProps) {
  const locked = props.entity.state === "locked";
  return (
    <HoldControl
      {...props}
      action={locked ? { type: "unlock" } : { type: "lock" }}
      actionLabel={locked ? "Unlock" : "Lock"}
      icon={locked ? IconLock : IconLockOpen}
      hint={locked ? "Hold to unlock" : "Tap to lock"}
    />
  );
}

function CoverControl(props: ControlProps) {
  const { entity } = props;
  const { run } = useRunner(entity);
  const theme = useEntityTheme(entity);

  if (entity.deviceClass === "garage") {
    const closed = entity.state === "closed";
    return (
      <HoldControl
        {...props}
        action={closed ? { type: "open" } : { type: "close" }}
        actionLabel={closed ? "Open" : "Close"}
        icon={theme.Icon}
        hint={closed ? "Hold to open" : "Hold to close"}
      />
    );
  }

  const position = entity.attributes.position ?? (entity.state === "closed" ? 0 : 100);
  const spec: SliderSpec = {
    value: position,
    caption: "Position",
    zeroLabel: "Closed",
    toAction: (value) => ({ type: "setPosition", value }),
    tapAction: { type: "toggle" },
  };
  const extras = (sideWidth: number, bodyHeight: number) => {
    if (sideWidth < rowWidth(3, ROUND_SM, BUTTON_GAP) || bodyHeight < 110) return null;
    return (
      <div className={classes.coverButtons} role="group" aria-label={`${entity.name} position`}>
        <RoundButton
          size="sm"
          label={`Open ${entity.name}`}
          disabled={theme.unavailable}
          onClick={() => void run({ type: "open" })}
        >
          <IconChevronUp size={18} />
        </RoundButton>
        <RoundButton
          size="sm"
          label={`Stop ${entity.name}`}
          disabled={theme.unavailable}
          onClick={() => void run({ type: "stop" })}
        >
          <IconPlayerStop size={16} />
        </RoundButton>
        <RoundButton
          size="sm"
          label={`Close ${entity.name}`}
          disabled={theme.unavailable}
          onClick={() => void run({ type: "close" })}
        >
          <IconChevronDown size={18} />
        </RoundButton>
      </div>
    );
  };
  return <SliderControl {...props} theme={theme} spec={spec} extras={extras} />;
}

function ToggleControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const { run, pending, done } = useRunner(entity);
  const tier = getTier(width, height);
  const action = getPrimaryAction(entity);
  const Icon = theme.Icon;
  const state = formatEntityState(entity);
  const trigger = action ? () => void run(action) : undefined;
  const glyph = (size: number) => (done ? <IconCheck size={size} stroke={2.4} /> : <Icon size={size} stroke={1.7} />);

  if (tier === "mini") {
    return (
      <Tile
        theme={theme}
        onClick={trigger}
        label={`${entity.name}, ${state}`}
        className={`${classes.center} ${classes.compactToggle}`}
      >
        <span className={classes.bigRound} data-active={theme.active} data-pending={pending}>
          {glyph(20)}
        </span>
        <span className={classes.name} title={entity.name}>
          {entity.name}
        </span>
        {height >= 104 ? <span className={classes.state}>{state}</span> : null}
      </Tile>
    );
  }

  if (tier === "wide") {
    return (
      <Tile theme={theme} className={classes.rowTile}>
        <RoundButton
          size="md"
          label={`${entity.name}, ${state}`}
          active={theme.active}
          pending={pending}
          disabled={theme.unavailable || !action}
          onClick={trigger}
        >
          {glyph(22)}
        </RoundButton>
        <div className={classes.headText}>
          <span className={classes.name} title={entity.name}>
            {entity.name}
          </span>
          <span className={classes.state}>{state}</span>
        </div>
      </Tile>
    );
  }

  return (
    <Tile theme={theme} className={classes.toggleTile}>
      <RoundButton
        size="md"
        label={`${entity.name}, ${state}`}
        active={theme.active}
        pending={pending}
        disabled={theme.unavailable || !action}
        onClick={trigger}
      >
        {glyph(22)}
      </RoundButton>
      <Head name={entity.name} state={state} />
    </Tile>
  );
}

function LaunchControl({ entity, width, height }: ControlProps) {
  return <ToggleControl entity={entity} width={width} height={height} />;
}

function ClimateControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const { run, pending } = useRunner(entity);
  const tier = getTier(width, height);
  const attributes = entity.attributes;
  const temperatureMode = getClimateTemperatureMode(entity);
  const range = temperatureMode === "range" ? getTargetRange(attributes) : null;
  const target = temperatureMode === "single" ? attributes.targetTemperature : undefined;
  const min = attributes.minTemperature ?? range?.low ?? target ?? 7;
  const max = attributes.maxTemperature ?? range?.high ?? target ?? 35;
  const step = attributes.temperatureStep ?? 0.5;
  const off = entity.state === "off" || theme.unavailable;
  const fixed = theme.unavailable || pending || (target === undefined && !range) || min >= max;
  const readout = getClimateReadout(entity);
  const state = formatEntityState(entity);
  const modes = attributes.hvacModes ?? [];
  const set = (value: number) => void run({ type: "setTemperature", value });
  const bump = (direction: number) => {
    if (fixed || target === undefined) return;
    set(clamp(Math.round((target + direction * step) * 100) / 100, min, max));
  };
  const actionLabel = attributes.hvacAction ? attributes.hvacAction.replace(/^\w/, (c) => c.toUpperCase()) : "";
  const primary = getPrimaryAction(entity);
  const power = primary ? () => void run(primary) : undefined;
  const center = (size: number, shown: string) => (
    <>
      {size >= 104 ? <span className={classes.dialLabel}>{off ? "Off" : actionLabel}</span> : null}
      <span className={classes.dialTemp} style={{ fontSize: Math.max(13, size * Math.min(0.25, 1.15 / shown.length)) }}>
        {shown}
      </span>
      {size >= 104 && attributes.currentTemperature !== undefined ? (
        <span className={classes.dialLabel}>Now {formatNumber(attributes.currentTemperature)}°</span>
      ) : null}
    </>
  );

  const dial = (size: number) => (
    <Dial
      value={target ?? null}
      range={range}
      emptyText={range ? `range ${readout}` : "no adjustable target reported in this mode"}
      min={min}
      max={max}
      step={step}
      current={attributes.currentTemperature}
      size={size}
      label={`${entity.name} target temperature`}
      pending={pending}
      muted={off}
      disabled={fixed}
      onCommit={set}
      onRangeCommit={(low, high) => void run({ type: "setTemperatureRange", low, high })}
    >
      {(shown, shownRange) => {
        if (shownRange) return center(size, `${formatNumber(shownRange.low)}–${formatNumber(shownRange.high)}°`);
        if (shown !== null) return center(size, `${formatNumber(shown)}°`);
        return center(size, readout);
      }}
    </Dial>
  );

  if (tier === "mini") {
    return (
      <Tile theme={theme} className={classes.center}>
        {dial(clamp(Math.min(width - 20, height - 38), 44, 140))}
        <span className={classes.name} title={entity.name}>
          {entity.name}
        </span>
      </Tile>
    );
  }

  if (tier === "wide" || height < CLIMATE_FULL_MIN_HEIGHT) {
    return (
      <Tile theme={theme} className={classes.rowTile}>
        {dial(Math.min(height - TILE_PADDING * 2, 120))}
        <div className={classes.climateInfo}>
          <Head name={entity.name} state={state} />
          {!range && target !== undefined && height >= WIDE_STEPPER_MIN_HEIGHT ? (
            <div className={classes.stepper}>
              <RoundButton size="sm" label="Decrease temperature" disabled={fixed} onClick={() => bump(-1)}>
                <IconMinus size={16} />
              </RoundButton>
              <RoundButton size="sm" label="Increase temperature" disabled={fixed} onClick={() => bump(1)}>
                <IconPlus size={16} />
              </RoundButton>
            </div>
          ) : null}
        </div>
      </Tile>
    );
  }

  const showModes =
    modes.length > 1 &&
    height >= CLIMATE_MODES_MIN_HEIGHT &&
    width - TILE_PADDING * 2 >= rowWidth(modes.length, ROUND_SM, BUTTON_GAP);
  const chipsHeight = showModes ? ROUND_SM + BUTTON_GAP : 0;
  const available = height - TILE_PADDING * 2 - HEAD_HEIGHT - chipsHeight - BUTTON_GAP - 2;
  const flank = target !== undefined && width >= 184;
  const size = Math.max(40, Math.min(available, width - TILE_PADDING * 2 - 2 - Number(flank) * 80, 250));

  return (
    <Tile theme={theme}>
      <Head
        name={entity.name}
        state={state}
        trailing={
          <RoundButton
            size="sm"
            label={`Toggle ${entity.name}`}
            active={!off}
            pending={pending}
            onClick={power}
            disabled={theme.unavailable || !primary || pending}
          >
            <IconPower size={17} stroke={2} />
          </RoundButton>
        }
      />
      <div className={classes.dialStage}>
        {flank ? (
          <RoundButton size="xs" label="Decrease temperature" disabled={fixed} onClick={() => bump(-1)}>
            <IconMinus size={16} />
          </RoundButton>
        ) : null}
        {dial(size)}
        {flank ? (
          <RoundButton size="xs" label="Increase temperature" disabled={fixed} onClick={() => bump(1)}>
            <IconPlus size={16} />
          </RoundButton>
        ) : null}
      </div>
      {showModes ? (
        <div className={classes.modeRow} role="group" aria-label={`${entity.name} HVAC mode`}>
          {modes.map((mode) => {
            const ModeIcon = hvacIcons[mode] ?? IconAirConditioning;
            return (
              <RoundButton
                key={mode}
                size="sm"
                label={`${mode.replace("_", " ")} mode`}
                active={entity.state === mode}
                disabled={theme.unavailable || pending}
                onClick={() => void run({ type: "setHvacMode", value: mode })}
              >
                <ModeIcon size={17} stroke={1.9} />
              </RoundButton>
            );
          })}
        </div>
      ) : null}
    </Tile>
  );
}

function MediaControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const { run, pending } = useRunner(entity);
  const tier = getTier(width, height);
  const attributes = entity.attributes;
  const playing = entity.state === "playing";
  const idle = !(playing || entity.state === "paused");
  const volume = Math.round((attributes.volume ?? 0) * 100);
  const duration = attributes.mediaDuration ?? 0;
  const position = attributes.mediaPosition ?? 0;
  const progress = duration > 0 ? clamp((position / duration) * 100, 0, 100) : 0;
  const title = idle ? entity.name : (attributes.mediaTitle ?? entity.name);
  const subtitle = idle ? formatEntityState(entity) : (attributes.mediaArtist ?? attributes.mediaSource ?? "");
  const Icon = theme.Icon;
  const toggle = () => void run({ type: "mediaPlayPause" });
  const playGlyph = playing ? (
    <IconPlayerPause size={26} fill="currentColor" />
  ) : (
    <IconPlayerPlay size={26} fill="currentColor" />
  );

  const art = (size: number) => (
    <div className={classes.art} style={{ width: size, height: size }} data-playing={playing}>
      {attributes.artworkUrl ? (
        <img src={attributes.artworkUrl} alt="" className={classes.artImage} draggable={false} />
      ) : (
        <Icon size={size * 0.45} stroke={1.5} />
      )}
    </div>
  );

  const background = (
    <>
      {attributes.artworkUrl ? (
        <img src={attributes.artworkUrl} alt="" className={classes.mediaBg} draggable={false} data-idle={idle} />
      ) : null}
      <div className={classes.mediaShade} />
    </>
  );

  if (tier === "mini") {
    return (
      <Tile theme={theme} media className={classes.mediaTile}>
        {background}
        <div className={classes.mediaMini}>
          <RoundButton
            size="lg"
            label={playing ? `Pause ${entity.name}` : `Play ${entity.name}`}
            pending={pending}
            disabled={theme.unavailable}
            onClick={toggle}
          >
            {playGlyph}
          </RoundButton>
          <span className={classes.name} title={title} data-entity-name={title === entity.name}>
            {title}
          </span>
        </div>
      </Tile>
    );
  }

  if (tier === "wide") {
    return (
      <Tile theme={theme} media className={classes.mediaTile}>
        {background}
        <div className={classes.mediaRow}>
          {width >= 260 ? art(Math.min(height - 24, 56)) : null}
          <div className={classes.headText}>
            <span className={classes.name} title={title} data-entity-name={title === entity.name}>
              {title}
            </span>
            <span className={classes.state}>{subtitle}</span>
          </div>
          <div className={classes.transport}>
            {width >= 360 ? (
              <RoundButton
                size="sm"
                label={`Previous track on ${entity.name}`}
                disabled={theme.unavailable}
                onClick={() => void run({ type: "mediaPrevious" })}
              >
                <IconPlayerSkipBack size={17} fill="currentColor" />
              </RoundButton>
            ) : null}
            <RoundButton
              size="lg"
              label={playing ? `Pause ${entity.name}` : `Play ${entity.name}`}
              pending={pending}
              disabled={theme.unavailable}
              onClick={toggle}
            >
              {playGlyph}
            </RoundButton>
            {width >= 360 ? (
              <RoundButton
                size="sm"
                label={`Next track on ${entity.name}`}
                disabled={theme.unavailable}
                onClick={() => void run({ type: "mediaNext" })}
              >
                <IconPlayerSkipForward size={17} fill="currentColor" />
              </RoundButton>
            ) : null}
          </div>
        </div>
      </Tile>
    );
  }

  const hero = height >= 320;
  const showProgress = height >= 205 && duration > 0 && !idle;
  const showVolume = height >= 228;
  const roomyTransport = height >= (showVolume ? 248 : 180);
  const artSize = hero ? Math.min(width - 48, 130) : 58;

  return (
    <Tile theme={theme} media className={classes.mediaTile}>
      {background}
      <div className={classes.mediaFull} data-hero={hero}>
        <div className={classes.mediaTop} data-hero={hero}>
          {art(artSize)}
          <div className={classes.headText}>
            <span className={classes.name} title={title} data-entity-name={title === entity.name}>
              {title}
            </span>
            <span className={classes.state}>{subtitle}</span>
          </div>
        </div>
        {showProgress ? (
          <div className={classes.progress}>
            <div className={classes.progressBar}>
              <div className={classes.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <div className={classes.progressTimes}>
              <span>{formatClock(position)}</span>
              <span>{formatClock(duration)}</span>
            </div>
          </div>
        ) : null}
        <div className={classes.transportBig}>
          <RoundButton
            size={roomyTransport ? "md" : "sm"}
            label={`Previous track on ${entity.name}`}
            disabled={theme.unavailable}
            onClick={() => void run({ type: "mediaPrevious" })}
          >
            <IconPlayerSkipBack size={20} fill="currentColor" />
          </RoundButton>
          <RoundButton
            size={roomyTransport ? "xl" : "lg"}
            label={playing ? `Pause ${entity.name}` : `Play ${entity.name}`}
            pending={pending}
            disabled={theme.unavailable}
            onClick={toggle}
          >
            {playGlyph}
          </RoundButton>
          <RoundButton
            size={roomyTransport ? "md" : "sm"}
            label={`Next track on ${entity.name}`}
            disabled={theme.unavailable}
            onClick={() => void run({ type: "mediaNext" })}
          >
            <IconPlayerSkipForward size={20} fill="currentColor" />
          </RoundButton>
        </div>
        {showVolume ? (
          <div className={classes.volume}>
            {volume === 0 ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
            <div className={classes.volumeSlider}>
              <PillSlider
                axis="horizontal"
                value={volume}
                label={`${entity.name} volume`}
                valueText={(value) => `${value}%`}
                pending={pending}
                disabled={theme.unavailable}
                track={VOLUME_TRACK}
                onCommit={(value) => void run({ type: "setVolume", value: value / 100 })}
              />
            </div>
            <span className={classes.volumeValue}>{volume}%</span>
          </div>
        ) : null}
      </div>
    </Tile>
  );
}

function CameraControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const image = entity.attributes.snapshotUrl ?? entity.attributes.pictureUrl;
  const live = entity.state === "recording" || entity.state === "streaming";
  const Icon = theme.Icon;
  const tier = getTier(width, height);

  return (
    <Tile theme={theme} bare className={classes.cameraTile}>
      {image ? (
        <img src={image} alt={`${entity.name} snapshot`} className={classes.cameraImage} draggable={false} />
      ) : (
        <div className={classes.cameraEmpty}>
          <Icon size={32} stroke={1.4} />
        </div>
      )}
      <div className={classes.cameraShade} />
      <span className={classes.liveBadge} data-live={live}>
        <span className={classes.liveDot} />
        {live ? "LIVE" : "IDLE"}
      </span>
      <div className={classes.cameraFoot}>
        <span className={classes.name} title={entity.name}>
          {entity.name}
        </span>
        {tier === "mini" ? null : (
          <span className={classes.state}>Updated {formatRelativeTime(entity.lastChanged)}</span>
        )}
      </div>
    </Tile>
  );
}

const alarmModes: { mode: "home" | "away" | "night"; label: string; icon: TablerIcon }[] = [
  { mode: "home", label: "Home", icon: IconHome },
  { mode: "away", label: "Away", icon: IconBuildingEstate },
  { mode: "night", label: "Night", icon: IconMoon },
];

function AlarmControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const { run, pending } = useRunner(entity);
  const gateFor = useCodeGate(entity);
  const tier = getTier(width, height);
  const disarmed = entity.state === "disarmed";
  const triggered = entity.state === "triggered";
  const Icon = triggered ? IconAlertTriangle : theme.Icon;
  const coded = entityNeedsCode(entity);
  const state = withCodeNotice(formatEntityState(entity), coded);
  const disarm = { type: "alarmDisarm" } as const;
  const guarded = requiresConfirmation(entity, disarm);
  const disarmGate = gateFor(disarm);
  const disarmLabel = holdLabel(disarmGate, guarded, "Disarm", entity.name);

  const keys = (compact: boolean) => (
    <div className={classes.keypad} data-compact={compact} role="group" aria-label="Alarm mode">
      {alarmModes.map(({ mode, label, icon: ModeIcon }) => {
        const gate = gateFor({ type: "alarmArm", mode });
        return (
          <KeyButton
            key={mode}
            label={holdLabel(gate, false, `Arm ${label}`, entity.name)}
            hold={false}
            compact={compact}
            active={entity.state === `armed_${mode}`}
            disabled={theme.unavailable || isGateBlocked(gate)}
            onConfirm={() => runCodeGate(gate, run)}
          >
            <ModeIcon size={compact ? 20 : 22} stroke={1.8} />
            {compact ? null : <span>{label}</span>}
          </KeyButton>
        );
      })}
      <KeyButton
        label={disarmLabel}
        hold={guarded && disarmGate.kind === "run"}
        compact={compact}
        active={disarmed}
        disabled={theme.unavailable || disarmed || isGateBlocked(disarmGate)}
        onConfirm={() => runCodeGate(disarmGate, run)}
      >
        <IconShieldOff size={compact ? 20 : 22} stroke={1.8} />
        {compact ? null : <span>{guarded ? "Hold" : "Disarm"}</span>}
      </KeyButton>
    </div>
  );

  if (tier === "mini") {
    return (
      <Tile theme={{ ...theme, tinted: !disarmed }} className={classes.center}>
        <span className={classes.bigRound} data-active={!disarmed} data-pending={pending}>
          <Icon size={24} stroke={1.7} />
        </span>
        <span className={classes.name} title={entity.name}>
          {entity.name}
        </span>
        <span className={classes.state}>{state}</span>
      </Tile>
    );
  }

  if (tier === "wide") {
    return (
      <Tile theme={{ ...theme, tinted: !disarmed }}>
        <Head
          name={entity.name}
          state={state}
          leading={
            <span className={classes.miniIconStatic} data-active={!disarmed} data-pending={pending}>
              <Icon size={18} stroke={1.8} />
            </span>
          }
        />
        {height >= WIDE_KEYPAD_MIN_HEIGHT ? <div className={classes.keyStage}>{keys(true)}</div> : null}
      </Tile>
    );
  }

  return (
    <Tile theme={{ ...theme, tinted: !disarmed }}>
      <Head
        name={entity.name}
        state={state}
        leading={
          <span className={classes.miniIconStatic} data-active={!disarmed} data-pending={pending}>
            <Icon size={18} stroke={1.8} />
          </span>
        }
      />
      <div className={classes.keyStage}>{keys(false)}</div>
    </Tile>
  );
}

function SensorControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const tier = getTier(width, height);
  const Icon = theme.Icon;
  const value = formatEntityState(entity);
  const history = entity.history;
  const numericHistory = getHistoryValues(history ?? []);
  const range =
    numericHistory.length > 0 ? { min: Math.min(...numericHistory), max: Math.max(...numericHistory) } : null;
  const numeric = Number(entity.state);
  const unit = entity.unit && entity.unit !== "%" ? ` ${entity.unit}` : (entity.unit ?? "");
  const display = Number.isNaN(numeric) ? value : formatNumber(numeric);
  const suffix = Number.isNaN(numeric) ? "" : unit;

  return (
    <Tile theme={theme} bare className={classes.sensorTile}>
      {history ? <Sparkline values={history} color={theme.accent} /> : null}
      <div className={classes.sensorBody} data-tier={tier}>
        <Head
          name={entity.name}
          state={tier === "mini" ? "" : `Changed ${formatRelativeTime(entity.lastChanged)}`}
          leading={
            <span className={classes.miniIconStatic} data-active>
              <Icon size={tier === "mini" ? 14 : 18} stroke={1.8} />
            </span>
          }
        />
        <div className={classes.sensorValue} data-tier={tier}>
          <span className={classes.sensorNumber}>{display}</span>
          <span className={classes.sensorUnit}>{suffix}</span>
        </div>
        {tier === "full" && range && height >= 190 ? (
          <div className={classes.range}>
            <span>Low {formatNumber(range.min)}</span>
            <span>High {formatNumber(range.max)}</span>
          </div>
        ) : null}
      </div>
    </Tile>
  );
}

function WeatherControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const tier = getTier(width, height);
  const attributes = entity.attributes;
  const Icon = theme.Icon;
  const forecast = attributes.forecast ?? [];
  const temperature = `${formatNumber(attributes.currentTemperature)}°`;
  const condition = formatEntityState(entity).split("· ")[1] ?? entity.state;
  const forecastMessage = getForecastMessage(entity);

  const days = (count: number) =>
    forecast.slice(0, count).map((day) => {
      const DayIcon = day.condition ? conditionIcons[day.condition] : undefined;
      return (
        <div key={day.time ?? day.day} className={classes.day}>
          <span className={classes.dayName}>{day.day}</span>
          {DayIcon ? <DayIcon size={20} stroke={1.6} aria-label={day.condition ?? undefined} /> : <span>—</span>}
          <span className={classes.dayTemp}>{formatNumber(day.high, 0)}°</span>
          <span className={classes.dayLow}>{formatNumber(day.low, 0)}°</span>
        </div>
      );
    });

  if (tier === "mini") {
    return (
      <Tile theme={theme} className={classes.center}>
        <Icon size={34} stroke={1.5} className={classes.weatherIcon} />
        <span className={classes.weatherTemp}>{temperature}</span>
        <span className={classes.state}>{condition}</span>
      </Tile>
    );
  }

  if (tier === "wide") {
    const count = clamp(Math.floor((width - 190) / 52), 0, 5);
    return (
      <Tile theme={theme} className={classes.rowTile}>
        <Icon size={46} stroke={1.3} className={classes.weatherIcon} />
        <div className={classes.headText}>
          <span className={classes.weatherTemp}>{temperature}</span>
          <span className={classes.state}>{condition}</span>
        </div>
        {count > 0 ? (
          <div className={classes.forecast}>
            {forecastMessage && <output className={classes.state}>{forecastMessage}</output>}
            {days(count)}
          </div>
        ) : null}
      </Tile>
    );
  }

  const count = clamp(Math.floor((width - 24) / 52), 2, 5);
  return (
    <Tile theme={theme}>
      <Head
        name={entity.name}
        state={`Humidity ${formatNumber(attributes.humidity)}% · Wind ${formatNumber(attributes.windSpeed)} ${attributes.windSpeedUnit ?? ""}`}
      />
      <div className={classes.weatherHero}>
        <Icon size={clamp(height * 0.22, 40, 72)} stroke={1.3} className={classes.weatherIcon} />
        <div className={classes.headText}>
          <span className={classes.weatherTempBig}>{temperature}</span>
          <span className={classes.state}>{condition}</span>
        </div>
      </div>
      {height >= 190 ? (
        <div className={classes.forecast}>
          {forecastMessage && <output className={classes.state}>{forecastMessage}</output>}
          {days(count)}
        </div>
      ) : null}
    </Tile>
  );
}

function VacuumControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const { run, pending, done } = useRunner(entity);
  const tier = getTier(width, height);
  const Icon = theme.Icon;
  const cleaning = entity.state === "cleaning";
  const state = formatEntityState(entity);
  const battery = entity.attributes.batteryLevel;
  const primary = getPrimaryAction(entity);
  const start = () => void run({ type: "vacuumStart" });
  const dock = () => void run({ type: "vacuumReturn" });
  const glyph = done ? <IconCheck size={22} stroke={2.4} /> : <Icon size={24} stroke={1.6} />;

  if (tier === "mini") {
    return (
      <Tile
        theme={theme}
        onClick={primary ? () => void run(primary) : undefined}
        label={`${entity.name}, ${state}`}
        className={classes.center}
      >
        <span className={classes.bigRound} data-active={theme.active} data-pending={pending}>
          {glyph}
        </span>
        <span className={classes.name} title={entity.name}>
          {entity.name}
        </span>
        <span className={classes.state}>{state}</span>
      </Tile>
    );
  }

  const roomy = tier === "full" && height >= ROOMY_FULL_HEIGHT;
  const buttons = (
    <div className={classes.vacuumButtons}>
      <RoundButton
        size={roomy ? "lg" : "md"}
        label="Start cleaning"
        active={cleaning}
        pending={pending}
        disabled={theme.unavailable}
        onClick={start}
      >
        <IconPlayerPlay size={20} fill="currentColor" />
      </RoundButton>
      <RoundButton size={roomy ? "lg" : "md"} label="Return to dock" disabled={theme.unavailable} onClick={dock}>
        <IconArrowBackUp size={20} />
      </RoundButton>
    </div>
  );

  if (tier === "wide") {
    return (
      <Tile theme={theme} className={classes.rowTile}>
        <span className={classes.bigRound} data-active={theme.active} data-pending={pending}>
          {glyph}
        </span>
        <div className={classes.headText}>
          <span className={classes.name} title={entity.name}>
            {entity.name}
          </span>
          <span className={classes.state}>{state}</span>
        </div>
        {buttons}
      </Tile>
    );
  }

  return (
    <Tile theme={theme}>
      <Head
        name={entity.name}
        state={state}
        trailing={
          battery === undefined ? null : (
            <span className={classes.batteryChip} data-low={battery < 20}>
              {battery}%
            </span>
          )
        }
      />
      <div className={classes.holdStage}>
        <span
          className={classes.bigRound}
          data-size={roomy ? "xl" : "md"}
          data-active={theme.active}
          data-pending={pending}
        >
          {glyph}
        </span>
      </div>
      {buttons}
    </Tile>
  );
}

function PersonControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const tier = getTier(width, height);
  const home = entity.state === "home";
  const state = formatEntityState(entity);
  const initial = entity.name.slice(0, 1).toUpperCase();
  const avatar = (size: number) => (
    <span className={classes.avatar} style={{ width: size, height: size, fontSize: size * 0.4 }} data-home={home}>
      {initial}
    </span>
  );

  if (tier === "mini") {
    return (
      <Tile theme={theme} className={classes.center}>
        {avatar(46)}
        <span className={classes.name} title={entity.name}>
          {entity.name}
        </span>
        <span className={classes.state}>{state}</span>
      </Tile>
    );
  }

  if (tier === "wide") {
    return (
      <Tile theme={theme} className={classes.rowTile}>
        {avatar(Math.min(64, height - 28))}
        <div className={classes.headText}>
          <span className={classes.name} title={entity.name}>
            {entity.name}
          </span>
          <span className={classes.state}>
            {state} · {formatRelativeTime(entity.lastChanged)}
          </span>
        </div>
      </Tile>
    );
  }

  return (
    <Tile theme={theme}>
      <Head name={entity.name} state={`Since ${formatRelativeTime(entity.lastChanged)}`} />
      <div className={classes.holdStage}>{avatar(clamp(Math.min(width, height) * 0.4, 56, 110))}</div>
      <div className={classes.hintCenter}>
        <span className={classes.statusPill} data-home={home}>
          <IconShieldCheck size={14} stroke={2} />
          {state}
        </span>
      </div>
    </Tile>
  );
}

function SelectControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const disabled = useDeviceControlDisabled(theme.unavailable);
  const { run, pending } = useRunner(entity);
  const tier = getTier(width, height);
  const options = entity.attributes.options ?? [];
  const Icon = theme.Icon;
  const next = options[(options.indexOf(entity.state) + 1) % Math.max(options.length, 1)];

  if (tier === "mini") {
    return (
      <Tile
        theme={theme}
        className={classes.center}
        label={`${entity.name}, ${entity.state}`}
        onClick={next ? () => void run({ type: "selectOption", value: next }) : undefined}
      >
        <span className={classes.bigRound} data-active data-pending={pending}>
          <Icon size={24} stroke={1.7} />
        </span>
        <span className={classes.name} title={entity.name}>
          {entity.name}
        </span>
        <span className={classes.state}>{entity.state}</span>
      </Tile>
    );
  }

  return (
    <Tile theme={theme}>
      <Head
        name={entity.name}
        state={entity.state}
        leading={
          <span className={classes.miniIconStatic} data-active data-pending={pending}>
            <Icon size={18} stroke={1.8} />
          </span>
        }
      />
      {tier === "full" || height >= WIDE_CHIPS_MIN_HEIGHT ? (
        <Box
          className={classes.chipsStage}
          data-tier={tier}
          role="group"
          tabIndex={0}
          aria-label={`${entity.name} options`}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={classes.chip}
              data-active={option === entity.state}
              aria-pressed={option === entity.state}
              disabled={disabled}
              onClick={() => void run({ type: "selectOption", value: option })}
            >
              {option}
            </button>
          ))}
        </Box>
      ) : null}
    </Tile>
  );
}

function InfoControl({ entity, width, height }: ControlProps) {
  const theme = useEntityTheme(entity);
  const disabled = useDeviceControlDisabled(theme.unavailable);
  const { run, pending } = useRunner(entity);
  const tier = getTier(width, height);
  const Icon = theme.Icon;
  const state = formatEntityState(entity);
  const alert = entity.domain === "update" && entity.state === "on";
  const install = alert ? () => void run({ type: "install" }) : undefined;

  if (tier === "mini") {
    return (
      <Tile theme={theme} className={classes.center}>
        <span className={classes.bigRound} data-active={theme.active} data-pending={pending}>
          <Icon size={24} stroke={1.7} />
        </span>
        <span className={classes.name} title={entity.name}>
          {entity.name}
        </span>
        <span className={classes.state}>{state}</span>
      </Tile>
    );
  }

  return (
    <Tile theme={theme} className={tier === "wide" ? classes.rowTile : undefined}>
      {tier === "wide" ? (
        <span className={classes.bigRound} data-active={theme.active} data-pending={pending}>
          <Icon size={24} stroke={1.7} />
        </span>
      ) : null}
      <Head name={entity.name} state={state} />
      {tier === "full" ? (
        <div className={classes.holdStage}>
          <span
            className={classes.bigRound}
            data-size={height >= ROOMY_FULL_HEIGHT ? "xl" : "md"}
            data-active={theme.active}
            data-pending={pending}
          >
            <Icon size={32} stroke={1.6} />
          </span>
        </div>
      ) : null}
      {install ? (
        <button
          type="button"
          className={classes.installButton}
          disabled={disabled}
          aria-label={`Install ${entity.name}`}
          aria-busy={pending}
          onClick={install}
        >
          Install
        </button>
      ) : (
        <div className={tier === "full" ? classes.hintCenter : undefined}>
          {tier === "full" ? `Changed ${formatRelativeTime(entity.lastChanged)}` : null}
        </div>
      )}
    </Tile>
  );
}

export interface EntityControlProps extends ControlProps {
  details?: boolean;
}

export function EntityControl({ entity, width, height, details = true }: EntityControlProps) {
  const detail = useContext(DetailContext);
  if (!details) {
    return (
      <DetailProvider value={null}>
        <TileEntityContext.Provider value={entity.id}>
          {renderControl({ entity, width, height })}
        </TileEntityContext.Provider>
      </DetailProvider>
    );
  }
  const control = (
    <DetailTrigger entityId={entity.id} name={entity.name}>
      <TileEntityContext.Provider value={entity.id}>
        {renderControl({ entity, width, height })}
      </TileEntityContext.Provider>
    </DetailTrigger>
  );
  if (detail !== undefined) return control;
  return <StandaloneDetail>{control}</StandaloneDetail>;
}

function StandaloneDetail({ children }: { children: ReactNode }) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const api = useMemo(() => ({ open: setDetailId }), []);
  return (
    <DetailProvider value={api}>
      {children}
      <EntityDetail entityId={detailId} onClose={() => setDetailId(null)} onOpen={setDetailId} />
    </DetailProvider>
  );
}

const detailHeights: Partial<Record<HaDomain, number>> = {
  alarm_control_panel: 220,
  camera: 260,
  climate: 280,
  light: 240,
  media_player: 280,
  sensor: 160,
  weather: 220,
};

export interface EntityDetailProps {
  entityId: string | null;
  onClose: () => void;
  onOpen?: (entityId: string) => void;
}

export function EntityDetail({ entityId, onClose, onOpen }: EntityDetailProps) {
  const t = useI18n();
  const [codeSession, setCodeSession] = useState(0);
  const [related, setRelated] = useState<{ from: string; id: string } | null>(null);
  const shownId = (entityId !== null && related?.from === entityId && related.id) || entityId;
  const entity = useSmartHomeEntity(shownId ?? "");
  const editing = useSmartHomeInteractionBlock() === "editing";
  const open =
    onOpen ??
    ((id: string) => {
      if (entityId !== null) setRelated({ from: entityId, id });
    });
  const close = () => {
    setCodeSession((session) => session + 1);
    setRelated(null);
    onClose();
  };

  return (
    <Modal
      opened={entity !== undefined && !editing}
      onClose={close}
      title={entity?.name}
      closeButtonProps={{ "aria-label": t("common.action.close"), size: 44 }}
      centered
      size="60rem"
      xOffset="max(12px, env(safe-area-inset-left), env(safe-area-inset-right))"
      yOffset="max(12px, env(safe-area-inset-top), env(safe-area-inset-bottom))"
      classNames={{ content: classes.detailModal, title: classes.detailModalTitle }}
    >
      {entity && !editing ? (
        <DetailProvider value={null}>
          <div className={classes.root} data-preset="detail">
            <DetailMeta entity={entity} />
            <div className={classes.detailLayout}>
              <div className={classes.detailControls}>
                <CodePrompt key={`${entity.id}:${codeSession}`} entity={entity}>
                  <div className={classes.detailStage} style={{ height: detailHeights[entity.domain] ?? 180 }}>
                    <Measured>
                      {(w, h) => <EntityControl entity={entity} width={w} height={h} details={false} />}
                    </Measured>
                  </div>
                </CodePrompt>
              </div>
              <div className={classes.detailInformation}>
                <DetailPanel entity={entity} onOpen={open} />
              </div>
            </div>
          </div>
        </DetailProvider>
      ) : null}
    </Modal>
  );
}

function renderControl(props: ControlProps) {
  const { entity } = props;
  switch (entity.domain) {
    case "light":
      return getLightCapabilities(entity.attributes).brightness ? (
        <LightControl {...props} />
      ) : (
        <ToggleControl {...props} />
      );
    case "fan":
      return <FanControl {...props} />;
    case "humidifier":
      return <HumidifierControl {...props} />;
    case "cover":
    case "valve":
      return entity.domain === "valve" ? <ToggleControl {...props} /> : <CoverControl {...props} />;
    case "lock":
      return <LockControl {...props} />;
    case "climate":
      return <ClimateControl {...props} />;
    case "media_player":
      return <MediaControl {...props} />;
    case "camera":
      return <CameraControl {...props} />;
    case "alarm_control_panel":
      return <AlarmControl {...props} />;
    case "sensor":
      return <SensorControl {...props} />;
    case "weather":
      return <WeatherControl {...props} />;
    case "vacuum":
      return <VacuumControl {...props} />;
    case "person":
      return <PersonControl {...props} />;
    case "input_select":
      return <SelectControl {...props} />;
    case "scene":
    case "script":
    case "button":
      return <LaunchControl {...props} />;
    case "switch":
    case "input_boolean":
    case "automation":
      return <ToggleControl {...props} />;
    case "binary_sensor":
    case "sun":
    case "update":
      return <InfoControl {...props} />;
  }
}
