import {
  IconActivity,
  IconAdjustmentsHorizontal,
  IconAirConditioning,
  IconAlarmSmoke,
  IconArrowUpCircle,
  IconAutomation,
  IconBattery1,
  IconBattery3,
  IconBatteryCharging,
  IconBed,
  IconBolt,
  IconBriefcase,
  IconBulb,
  IconBulbOff,
  IconCarGarage,
  IconClick,
  IconCloud,
  IconCloudFog,
  IconCloudRain,
  IconCloudSnow,
  IconCloudStorm,
  IconCoffee,
  IconDeviceCctv,
  IconDeviceDesktop,
  IconDeviceSpeaker,
  IconDeviceTv,
  IconDoor,
  IconDroplet,
  IconFlame,
  IconCircleDot,
  IconClock,
  IconGauge,
  IconHome,
  IconHourglass,
  IconLamp,
  IconLeaf,
  IconLock,
  IconLockOpen,
  IconMoon,
  IconMovie,
  IconPlug,
  IconPropeller,
  IconRipple,
  IconRobot,
  IconRouter,
  IconRun,
  IconShieldCheck,
  IconShieldLock,
  IconSnowflake,
  IconSofa,
  IconSolarPanel,
  IconSparkles,
  IconSun,
  IconSunrise,
  IconTemperature,
  IconToolsKitchen2,
  IconToggleLeft,
  IconTrees,
  IconUser,
  IconWand,
  IconWashMachine,
  IconWind,
  IconWindow,
} from "@tabler/icons-react";

import type { TablerIcon } from "@homarr/ui";
import { getClimateTemperatureMode, supportsSmartHomeAction } from "@homarr/integrations/types";

import type { HaAction, HaArea, HaEntity } from "./types";

const customIcons: Record<string, TablerIcon> = {
  "mdi:led-strip-variant": IconBulb,
  "mdi:led-strip": IconBulb,
  "mdi:coffee-maker": IconCoffee,
  "mdi:lamp": IconLamp,
  "mdi:monitor-multiple": IconDeviceDesktop,
  "mdi:ev-station": IconPlug,
  "mdi:dishwasher": IconRipple,
  "mdi:washing-machine": IconWashMachine,
  "mdi:movie-open": IconMovie,
  "mdi:sofa": IconSofa,
  "mdi:weather-sunset-up": IconSunrise,
  "mdi:weather-night": IconMoon,
  "mdi:exit-run": IconRun,
  "mdi:account-group": IconUser,
  "mdi:home-switch": IconHome,
};

const sensorIcons: Record<string, TablerIcon> = {
  temperature: IconTemperature,
  humidity: IconDroplet,
  power: IconBolt,
  energy: IconBolt,
  carbon_dioxide: IconLeaf,
  battery: IconBattery3,
  duration: IconHourglass,
  timestamp: IconClock,
};

const binarySensorIcons: Record<string, TablerIcon> = {
  door: IconDoor,
  window: IconWindow,
  motion: IconRun,
  moisture: IconDroplet,
  smoke: IconAlarmSmoke,
};

const weatherIcons: Record<string, TablerIcon> = {
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

export const areaIcons: Record<string, TablerIcon> = {
  living_room: IconSofa,
  kitchen: IconToolsKitchen2,
  bedroom: IconBed,
  office: IconBriefcase,
  garage: IconCarGarage,
  outside: IconTrees,
};

export const getEntityIcon = (entity: HaEntity): TablerIcon => {
  const custom = entity.icon ? customIcons[entity.icon] : undefined;
  if (custom) return custom;
  switch (entity.domain) {
    case "light":
      return entity.state === "on" ? IconBulb : IconBulbOff;
    case "switch":
    case "input_boolean":
      return IconToggleLeft;
    case "fan":
      return IconPropeller;
    case "cover":
      return entity.deviceClass === "garage" ? IconCarGarage : IconWindow;
    case "climate":
      if (entity.state === "cool") return IconSnowflake;
      if (entity.state === "heat") return IconFlame;
      return IconAirConditioning;
    case "media_player":
      return entity.deviceClass === "tv" ? IconDeviceTv : IconDeviceSpeaker;
    case "lock":
      return entity.state === "locked" ? IconLock : IconLockOpen;
    case "sensor":
      if (entity.deviceClass === "battery") {
        const level = Number(entity.state);
        if (level < 30) return IconBattery1;
        return entity.id.includes("ev") ? IconBatteryCharging : IconBattery3;
      }
      if (entity.id.includes("solar")) return IconSolarPanel;
      return sensorIcons[entity.deviceClass ?? ""] ?? IconGauge;
    case "binary_sensor":
      return binarySensorIcons[entity.deviceClass ?? ""] ?? IconActivity;
    case "person":
      return IconUser;
    case "camera":
      return IconDeviceCctv;
    case "scene":
      return IconSparkles;
    case "script":
      return IconWand;
    case "automation":
      return IconAutomation;
    case "button":
      return entity.deviceClass === "restart" ? IconRouter : IconClick;
    case "alarm_control_panel":
      return entity.state === "disarmed" ? IconShieldLock : IconShieldCheck;
    case "vacuum":
      return IconRobot;
    case "valve":
      return IconDroplet;
    case "humidifier":
      return IconDroplet;
    case "weather":
      return weatherIcons[entity.state] ?? IconCloud;
    case "sun":
      return entity.state === "above_horizon" ? IconSun : IconMoon;
    case "update":
      return IconArrowUpCircle;
    case "input_select":
      return IconHome;
    case "number":
      return IconAdjustmentsHorizontal;
    // Catalog entities can come from domains this widget does not know yet.
    default:
      return IconCircleDot;
  }
};

/** The icon of an entity known only from the catalog, before its state is loaded. */
export const getCatalogEntityIcon = (entity: Pick<HaEntity, "id" | "icon" | "deviceClass"> & { domain: string }) =>
  getEntityIcon({
    ...entity,
    domain: entity.domain as HaEntity["domain"],
    name: "",
    areaId: null,
    state: "",
    unit: null,
    lastChanged: 0,
    attributes: {},
    history: null,
  });

// Home Assistant buttons and scenes report when they were last used; one never used is "unknown", yet usable.
const lastUsedDomains = new Set<string>(["button", "scene"]);

export const isUnavailable = (entity: HaEntity) =>
  entity.state === "unavailable" ||
  (entity.state === "unknown" && !entity.attributes.coverPositionUnknown && !lastUsedDomains.has(entity.domain));

export const isEntityActive = (entity: HaEntity): boolean => {
  if (isUnavailable(entity)) return false;
  switch (entity.domain) {
    case "cover":
      if (entity.attributes.coverPositionUnknown) return entity.state === "opening" || entity.state === "closing";
      return entity.state !== "closed";
    case "valve":
      return entity.state !== "closed";
    case "lock":
      return entity.state !== "locked";
    case "person":
      return entity.state === "home";
    case "media_player":
      return entity.state === "playing";
    case "alarm_control_panel":
      return entity.state !== "disarmed";
    case "vacuum":
      return entity.state === "cleaning" || entity.state === "returning";
    case "climate":
      return entity.state !== "off";
    case "camera":
      return entity.state === "recording" || entity.state === "streaming";
    case "sensor":
    case "weather":
    case "scene":
    case "button":
    case "input_select":
      return true;
    case "sun":
      return entity.state === "above_horizon";
    default:
      return entity.state === "on";
  }
};

const climateColors: Record<string, string> = {
  heat: "orange",
  cool: "blue",
  auto: "green",
  heat_cool: "yellow",
  dry: "orange",
  fan_only: "cyan",
};

export const getStateColor = (entity: HaEntity): string => {
  if (isUnavailable(entity)) return "gray";
  const active = isEntityActive(entity);
  switch (entity.domain) {
    case "light":
    case "switch":
    case "input_boolean":
    case "automation":
    case "script":
      return active ? "yellow" : "gray";
    case "climate":
      return climateColors[entity.state] ?? "gray";
    case "cover":
      return active ? "violet" : "gray";
    case "fan":
      return active ? "cyan" : "gray";
    case "lock":
      return entity.state === "locked" ? "green" : "red";
    case "person":
      return active ? "green" : "blue";
    case "media_player":
      return active ? "grape" : "gray";
    case "alarm_control_panel":
      if (entity.state === "triggered") return "red";
      return entity.state === "disarmed" ? "gray" : "green";
    case "binary_sensor":
      if (["moisture", "smoke", "problem", "safety"].includes(entity.deviceClass ?? "")) {
        return active ? "red" : "green";
      }
      return active ? "orange" : "gray";
    case "vacuum":
      return active ? "teal" : "gray";
    case "humidifier":
    case "valve":
      return active ? "blue" : "gray";
    case "update":
      return active ? "orange" : "gray";
    case "camera":
      return active ? "red" : "gray";
    case "sun":
      return active ? "yellow" : "indigo";
    case "weather":
      return "blue";
    case "sensor":
      if (entity.deviceClass === "battery") {
        const level = Number(entity.state);
        if (level >= 70) return "green";
        return level >= 30 ? "orange" : "red";
      }
      return "blue";
    default:
      return "blue";
  }
};

const stateLabels: Record<string, string> = {
  on: "On",
  off: "Off",
  open: "Open",
  closed: "Closed",
  opening: "Opening",
  closing: "Closing",
  locked: "Locked",
  unlocked: "Unlocked",
  playing: "Playing",
  paused: "Paused",
  idle: "Idle",
  standby: "Standby",
  home: "Home",
  not_home: "Away",
  heat: "Heat",
  cool: "Cool",
  auto: "Auto",
  heat_cool: "Heat/cool",
  dry: "Dry",
  fan_only: "Fan",
  armed_home: "Armed home",
  armed_away: "Armed away",
  armed_night: "Armed night",
  disarmed: "Disarmed",
  triggered: "Triggered",
  cleaning: "Cleaning",
  docked: "Docked",
  returning: "Returning",
  recording: "Recording",
  streaming: "Streaming",
  above_horizon: "Above horizon",
  below_horizon: "Below horizon",
  unavailable: "Unavailable",
  unknown: "Unknown",
  partlycloudy: "Partly cloudy",
  cloudy: "Cloudy",
  sunny: "Sunny",
  rainy: "Rainy",
};

const binaryLabels: Record<string, [string, string]> = {
  door: ["Open", "Closed"],
  window: ["Open", "Closed"],
  motion: ["Detected", "Clear"],
  moisture: ["Wet", "Dry"],
  smoke: ["Smoke", "Clear"],
};

export const formatNumber = (value: number | null | undefined, maximumFractionDigits = 1) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
};

export const getForecastMessage = (entity: HaEntity) => {
  switch (entity.attributes.forecastStatus) {
    case "loading":
      return "Loading forecast…";
    case "error":
      return "Forecast unavailable";
    case "unsupported":
      return "Forecast not supported";
    default:
      if (!entity.attributes.forecast?.length) return "No forecast data reported";
      return null;
  }
};

export const formatRelativeTime = (timestamp: number) => {
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(seconds, "second");
};

// Home Assistant reports durations in any of these units, and shows them as hours and minutes.
const durationUnitSeconds: Record<string, number> = { d: 86_400, h: 3_600, min: 60, s: 1, ms: 0.001 };

const formatUnit = (value: number, unit: "day" | "hour" | "minute" | "second") =>
  new Intl.NumberFormat(undefined, { style: "unit", unit, unitDisplay: "short" }).format(value);

/** A duration as its two largest parts, e.g. "2 hr 5 min" for a print that has 125 minutes left; null for other units. */
export const formatDuration = (value: number, unit: string | null) => {
  const scale = durationUnitSeconds[unit ?? ""];
  if (scale === undefined || !Number.isFinite(value) || value < 0) return null;
  const seconds = Math.round(value * scale);
  if (seconds < 60) return formatUnit(seconds, "second");
  const totalMinutes = Math.round(seconds / 60);
  const parts = [
    [Math.floor(totalMinutes / 1_440), "day"],
    [Math.floor((totalMinutes % 1_440) / 60), "hour"],
    [totalMinutes % 60, "minute"],
  ] as const;
  const first = parts.findIndex(([amount]) => amount > 0);
  return parts
    .slice(first, first + 2)
    .filter(([amount]) => amount > 0)
    .map(([amount, part]) => formatUnit(amount, part))
    .join(" ");
};

/** A point in time as a clock time today, or with its date otherwise, e.g. when a print will be done. */
export const formatTimestamp = (state: string) => {
  const time = Date.parse(state);
  if (Number.isNaN(time)) return null;
  const date = new Date(time);
  const today = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(
    undefined,
    today
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  ).format(date);
};

const KEY_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

/**
 * How an option or an enum state reads: the name the server gives it, a known label, or the key made readable
 * ("auto_bed_leveling" becomes "Auto bed leveling"). Free text such as "Eco mode" stays as it is.
 */
export const formatOption = (entity: Pick<HaEntity, "attributes">, option: string) => {
  const named = entity.attributes.optionLabels?.[option] ?? stateLabels[option];
  if (named) return named;
  if (!KEY_PATTERN.test(option)) return option;
  const words = option.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const formatEntityState = (entity: HaEntity): string => {
  if (isUnavailable(entity)) return stateLabels[entity.state] ?? entity.state;
  const attributes = entity.attributes;
  switch (entity.domain) {
    case "number":
    case "sensor": {
      if (attributes.stateLabel) return attributes.stateLabel;
      if (entity.deviceClass === "timestamp") return formatTimestamp(entity.state) ?? entity.state;
      if (entity.deviceClass === "enum" || attributes.optionLabels?.[entity.state]) {
        return formatOption(entity, entity.state);
      }
      const value = Number(entity.state);
      if (Number.isNaN(value)) return entity.state;
      if (entity.deviceClass === "duration") {
        const duration = formatDuration(value, entity.unit);
        if (duration) return duration;
      }
      // A number entity shows as many digits as its step has (0.01 shows two), and as its range starts at (from 0.25 in
      // steps of 1 shows 0.25, 1.25), so every step is visible.
      const digits =
        entity.domain === "number" && attributes.step
          ? Math.max(1, decimalsOf(attributes.step), decimalsOf(attributes.min ?? 0))
          : 1;
      return `${formatNumber(value, digits)}${entity.unit === "%" ? "" : " "}${entity.unit ?? ""}`.trim();
    }
    case "binary_sensor": {
      const labels = binaryLabels[entity.deviceClass ?? ""];
      if (!labels) return stateLabels[entity.state] ?? entity.state;
      return entity.state === "on" ? labels[0] : labels[1];
    }
    case "light":
      if (entity.state === "on" && attributes.brightness !== undefined) return `${attributes.brightness}%`;
      return stateLabels[entity.state] ?? entity.state;
    case "cover":
      if (entity.state === "open" && attributes.position !== undefined && attributes.position < 100) {
        return `Open · ${attributes.position}%`;
      }
      return stateLabels[entity.state] ?? entity.state;
    case "fan":
      if (entity.state === "on" && attributes.percentage !== undefined) return `${attributes.percentage}%`;
      return stateLabels[entity.state] ?? entity.state;
    case "climate": {
      const action = attributes.hvacAction;
      if (entity.state === "off") return "Off";
      const mode = getClimateTemperatureMode(entity);
      let target = "";
      if (mode === "single" && attributes.targetTemperature !== undefined)
        target = ` · ${formatNumber(attributes.targetTemperature)}°`;
      if (
        mode === "range" &&
        attributes.targetTemperatureLow !== undefined &&
        attributes.targetTemperatureHigh !== undefined
      ) {
        target = ` · ${formatNumber(attributes.targetTemperatureLow)}–${formatNumber(attributes.targetTemperatureHigh)}°`;
      }
      const label = action === "heating" ? "Heating" : action === "cooling" ? "Cooling" : stateLabels[entity.state];
      return `${label ?? entity.state}${target}`;
    }
    case "media_player":
      if (entity.state === "playing" || entity.state === "paused")
        return attributes.mediaTitle ?? stateLabels[entity.state] ?? "";
      return stateLabels[entity.state] ?? entity.state;
    case "person":
      return entity.state === "home" ? "Home" : (attributes.zone ?? "Away");
    case "scene":
    case "button":
      if (entity.state === "unknown") return "Never used";
      return `Last ${formatRelativeTime(entity.lastChanged)}`;
    case "script":
    case "automation":
      if (entity.domain === "automation" && entity.state === "off") return "Disabled";
      return attributes.lastTriggered ? `Ran ${formatRelativeTime(attributes.lastTriggered)}` : "Never ran";
    case "weather":
      return `${formatNumber(attributes.currentTemperature)}° · ${stateLabels[entity.state] ?? entity.state}`;
    case "update":
      return entity.state === "on" ? `${attributes.latestVersion} available` : "Up to date";
    case "vacuum":
      return attributes.status ?? stateLabels[entity.state] ?? entity.state;
    case "humidifier":
      return entity.state === "on" ? `Target ${formatNumber(attributes.targetHumidity)}%` : "Off";
    case "input_select":
      return formatOption(entity, entity.state);
    default:
      return stateLabels[entity.state] ?? entity.state;
  }
};

/** Digits after the point, also for numbers JavaScript writes with an exponent (1e-7 has seven). */
const decimalsOf = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  const [mantissa = "", exponent = "0"] = String(value).toLowerCase().split("e");
  return Math.max(0, (mantissa.split(".")[1] ?? "").length - Number(exponent));
};

/** The next value one step up or down, or null when the entity is at its limit or has no number to step from. */
export const stepNumber = (entity: HaEntity, direction: 1 | -1): number | null => {
  const current = Number(entity.state);
  if (isUnavailable(entity) || entity.state === "" || Number.isNaN(current)) return null;
  const { min, max, step = 1 } = entity.attributes;
  // Rounded to the finer of the value's and the step's digits: 0.5 + 1 stays 1.5.
  const next = Number((current + direction * step).toFixed(Math.max(decimalsOf(step), decimalsOf(current))));
  if (min !== undefined && next < min) return null;
  if (max !== undefined && next > max) return null;
  return next;
};

export const getPrimaryAction = (entity: HaEntity): HaAction | null => {
  if (isUnavailable(entity)) return null;
  switch (entity.domain) {
    case "light":
    case "switch":
    case "fan":
    case "input_boolean":
    case "humidifier":
    case "automation":
    case "valve":
      return { type: "toggle" };
    case "cover": {
      if (entity.attributes.coverPositionUnknown) return null;
      if (["opening", "closing"].includes(entity.state) && supportsSmartHomeAction(entity, { type: "stop" }))
        return { type: "stop" };
      let action: HaAction = { type: "close" };
      if (entity.state === "closed" || entity.state === "closing") action = { type: "open" };
      if (supportsSmartHomeAction(entity, action)) return action;
      return null;
    }
    case "climate": {
      const modes = entity.attributes.hvacModes ?? [];
      if (entity.state === "off" && modes.some((mode) => mode !== "off")) return { type: "toggle" };
      if (entity.state !== "off" && modes.includes("off")) return { type: "toggle" };
      return null;
    }
    case "lock":
      return entity.state === "locked" ? { type: "unlock" } : { type: "lock" };
    case "media_player":
      if (supportsSmartHomeAction(entity, { type: "mediaPlayPause" })) return { type: "mediaPlayPause" };
      return null;
    case "scene":
    case "script":
    case "button":
      return { type: "trigger" };
    case "vacuum":
      return entity.state === "cleaning" ? { type: "vacuumReturn" } : { type: "vacuumStart" };
    default:
      return null;
  }
};

export const requiresConfirmation = (entity: HaEntity, action: HaAction) =>
  (entity.domain === "lock" && action.type === "unlock") ||
  (entity.domain === "alarm_control_panel" && action.type === "alarmDisarm") ||
  (entity.domain === "cover" && entity.deviceClass === "garage");

const registeredAreas = new Map<string, HaArea>();

export const registerAreas = (areas: readonly HaArea[]) => {
  areas.forEach((area) => registeredAreas.set(area.id, area));
};

export const getArea = (areaId: string | null): HaArea | undefined => {
  if (areaId === null) return undefined;
  return registeredAreas.get(areaId);
};
